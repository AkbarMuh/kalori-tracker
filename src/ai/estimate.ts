import type { BetaContentBlockParam } from '@anthropic-ai/sdk/resources/beta/messages/messages';
import { z } from 'zod';
import { MealTypeSchema } from '../db/schema';

const KEY_STORAGE = 'kalori.anthropicKey';
export const AI_MODEL = 'claude-opus-5-5';

export function loadApiKey(): string | null {
  try {
    return localStorage.getItem(KEY_STORAGE);
  } catch {
    return null;
  }
}

export function saveApiKey(key: string | null) {
  try {
    if (key) localStorage.setItem(KEY_STORAGE, key);
    else localStorage.removeItem(KEY_STORAGE);
  } catch {
    // storage unavailable
  }
}

export const EstimateSchema = z.object({
  items: z.array(
    z.object({
      name: z.string().describe('Nama makanan dalam Bahasa Indonesia, termasuk perkiraan porsi'),
      calories: z.number().int().describe('Perkiraan kalori (kkal) untuk porsi tersebut'),
      meal: MealTypeSchema.describe('Tebakan waktu makan'),
    }),
  ),
  note: z.string().describe('Asumsi singkat tentang porsi atau ketidakpastian, maksimal satu kalimat'),
});
export type Estimate = z.infer<typeof EstimateSchema>;

const SYSTEM = `Kamu membantu mencatat kalori untuk pengguna di Indonesia.
Dari foto atau deskripsi makanan, pecah menjadi item-item makanan dan perkirakan kalori tiap item.
Asumsikan ukuran porsi yang umum di Indonesia (warung, rumah, restoran lokal) kecuali ada petunjuk lain.
Jika foto tidak berisi makanan atau minuman, kembalikan items kosong dan jelaskan di note.
Gunakan Bahasa Indonesia untuk nama dan note.`;

export interface EstimateInput {
  text?: string;
  /** Base64 JPEG without the data: prefix. */
  imageBase64?: string;
  /** Meal suggested by the time of day, used as a hint. */
  mealHint: string;
}

export class AiError extends Error {}

export async function estimateFood(apiKey: string, input: EstimateInput): Promise<Estimate> {
  // Loaded lazily so the SDK stays out of the main bundle.
  const [{ default: Anthropic }, { betaZodOutputFormat }] = await Promise.all([
    import('@anthropic-ai/sdk'),
    import('@anthropic-ai/sdk/helpers/beta/zod'),
  ]);

  // The key belongs to the user and lives only on their device; there is no backend to hide it behind.
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  const content: BetaContentBlockParam[] = [];
  if (input.imageBase64) {
    content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: input.imageBase64 } });
  }
  content.push({
    type: 'text',
    text:
      (input.text?.trim() ? `Deskripsi: ${input.text.trim()}\n` : 'Perkirakan makanan di foto ini.\n') +
      `Waktu makan saat ini kemungkinan: ${input.mealHint}.`,
  });

  let response;
  try {
    response = await client.beta.messages.parse({
      model: AI_MODEL,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium', format: betaZodOutputFormat(EstimateSchema) },
      system: SYSTEM,
      messages: [{ role: 'user', content }],
    });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) throw new AiError('API key Anthropic tidak valid.');
    if (e instanceof Anthropic.RateLimitError) throw new AiError('Terlalu banyak permintaan, coba lagi sebentar.');
    if (e instanceof Anthropic.APIConnectionError) throw new AiError('Tidak bisa terhubung ke Anthropic. Cek koneksi internet.');
    if (e instanceof Anthropic.APIError) throw new AiError(`Error dari Anthropic (${e.status ?? '?'}): ${e.message}`);
    throw e;
  }

  if (response.stop_reason === 'refusal') throw new AiError('Permintaan ditolak oleh model.');
  if (response.stop_reason === 'max_tokens') throw new AiError('Jawaban model terpotong, coba lagi.');
  if (!response.parsed_output) throw new AiError('Jawaban model tidak bisa dibaca, coba lagi.');
  return response.parsed_output;
}

/** Downscales a photo to at most `maxSide` px and returns base64 JPEG (no data: prefix). */
export async function photoToBase64(file: File, maxSide = 1568): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
  return dataUrl.slice(dataUrl.indexOf(',') + 1);
}
