import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import type { BetaContentBlockParam } from '@anthropic-ai/sdk/resources/beta/messages/messages';
import { AiCancelled, AiError, EstimateSchema, SYSTEM_PROMPT, userPrompt, type Estimate, type EstimateInput } from './estimate';

export const CLAUDE_MODEL = 'claude-opus-5-5';

export async function estimateWithClaude(apiKey: string, input: EstimateInput, signal?: AbortSignal): Promise<Estimate> {
  // The key belongs to the user and lives only on their device; there is no backend to hide it behind.
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  const content: BetaContentBlockParam[] = [];
  if (input.imageBase64) {
    content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: input.imageBase64 } });
  }
  content.push({ type: 'text', text: userPrompt(input) });

  let response;
  try {
    response = await client.beta.messages.parse(
      {
        model: CLAUDE_MODEL,
        max_tokens: 16000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'medium', format: betaZodOutputFormat(EstimateSchema) },
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content }],
      },
      { signal },
    );
  } catch (e) {
    if (e instanceof Anthropic.APIUserAbortError) throw new AiCancelled();
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
