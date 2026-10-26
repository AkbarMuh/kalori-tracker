import { MEAL_TYPES } from '../db/schema';
import { azureChatUrl, type AzureConfig } from './config';
import { AiCancelled, AiError, EstimateSchema, SYSTEM_PROMPT, userPrompt, type Estimate, type EstimateInput } from './estimate';

/** Same shape as EstimateSchema, written out for OpenAI strict structured outputs. */
const ESTIMATE_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['items', 'note'],
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'calories', 'meal'],
        properties: {
          name: { type: 'string', description: 'Nama makanan dalam Bahasa Indonesia, termasuk perkiraan porsi' },
          calories: { type: 'integer', description: 'Perkiraan kalori (kkal) untuk porsi tersebut' },
          meal: { type: 'string', enum: [...MEAL_TYPES], description: 'Tebakan waktu makan' },
        },
      },
    },
    note: { type: 'string', description: 'Asumsi singkat tentang porsi atau ketidakpastian, maksimal satu kalimat' },
  },
} as const;

const STRICT_FORMAT = {
  type: 'json_schema',
  json_schema: { name: 'food_estimate', strict: true, schema: ESTIMATE_JSON_SCHEMA },
} as const;

/** For deployments without structured-output support: plain JSON mode, shape described in the prompt. */
const JSON_MODE_HINT = `\nBalas hanya dengan JSON: {"items":[{"name":string,"calories":integer,"meal":"sarapan"|"siang"|"malam"|"camilan"}],"note":string}`;

interface AzureErrorBody {
  error?: { code?: string; message?: string; innererror?: { code?: string } };
}

interface ChatCompletion {
  choices?: { finish_reason?: string; message?: { content?: string | null; refusal?: string | null } }[];
}

function messages(input: EstimateInput, jsonMode: boolean) {
  const content: unknown[] = [];
  if (input.imageBase64) {
    content.push({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${input.imageBase64}`, detail: 'auto' } });
  }
  content.push({ type: 'text', text: userPrompt(input) });
  return [
    { role: 'system', content: SYSTEM_PROMPT + (jsonMode ? JSON_MODE_HINT : '') },
    { role: 'user', content },
  ];
}

async function errorFor(res: Response): Promise<AiError> {
  let body: AzureErrorBody = {};
  try {
    body = (await res.json()) as AzureErrorBody;
  } catch {
    // not JSON
  }
  const code = body.error?.code ?? body.error?.innererror?.code;
  const detail = body.error?.message ?? res.statusText;
  if (res.status === 401) return new AiError('Key Azure tidak valid.');
  if (res.status === 403) return new AiError('Key Azure tidak punya akses ke resource ini (atau resource dibatasi jaringan).');
  if (res.status === 404) return new AiError('Deployment Azure tidak ditemukan. Cek endpoint dan nama deployment.');
  if (res.status === 429) return new AiError('Kuota Azure sedang penuh, coba lagi sebentar.');
  if (code === 'content_filter' || body.error?.innererror?.code === 'ResponsibleAIPolicyViolation') {
    return new AiError('Ditolak filter konten Azure. Coba foto lain.');
  }
  return new AiError(`Error dari Azure (${res.status}): ${detail}`);
}

async function post(cfg: AzureConfig, body: unknown, signal?: AbortSignal): Promise<Response> {
  try {
    return await fetch(azureChatUrl(cfg), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': cfg.key },
      body: JSON.stringify(body),
      signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw new AiCancelled();
    throw new AiError('Tidak bisa terhubung ke Azure. Cek koneksi internet.');
  }
}

export async function estimateWithAzure(cfg: AzureConfig, input: EstimateInput, signal?: AbortSignal): Promise<Estimate> {
  const request = (jsonMode: boolean) => ({
    messages: messages(input, jsonMode),
    response_format: jsonMode ? { type: 'json_object' } : STRICT_FORMAT,
    max_completion_tokens: 4000,
  });

  let res = await post(cfg, request(false), signal);
  if (res.status === 400) {
    const err = await errorFor(res.clone());
    // Older models / API versions reject json_schema; retry once in plain JSON mode.
    if (/response_format|json_schema/i.test(err.message)) res = await post(cfg, request(true), signal);
  }
  if (!res.ok) throw await errorFor(res);

  const data = (await res.json()) as ChatCompletion;
  const choice = data.choices?.[0];
  if (!choice?.message) throw new AiError('Jawaban kosong dari Azure, coba lagi.');
  if (choice.finish_reason === 'content_filter') throw new AiError('Ditolak filter konten Azure. Coba foto lain.');
  if (choice.message.refusal) throw new AiError('Permintaan ditolak oleh model.');
  if (choice.finish_reason === 'length') throw new AiError('Jawaban model terpotong, coba lagi.');

  let json: unknown;
  try {
    json = JSON.parse(choice.message.content ?? '');
  } catch {
    throw new AiError('Jawaban model tidak bisa dibaca, coba lagi.');
  }
  const parsed = EstimateSchema.safeParse(json);
  if (!parsed.success) throw new AiError('Jawaban model tidak sesuai format, coba lagi.');
  return parsed.data;
}
