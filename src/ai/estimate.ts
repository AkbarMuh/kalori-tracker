import { z } from 'zod';
import { MealTypeSchema } from '../db/schema';
import type { AiConfig } from './config';

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

export const SYSTEM_PROMPT = `Kamu membantu mencatat kalori untuk pengguna di Indonesia.
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

export function userPrompt(input: EstimateInput): string {
  return (
    (input.text?.trim() ? `Deskripsi: ${input.text.trim()}\n` : 'Perkirakan makanan di foto ini.\n') +
    `Waktu makan saat ini kemungkinan: ${input.mealHint}.`
  );
}

export class AiError extends Error {}

/** Thrown when the caller aborted the request (user tapped "Batal"). */
export class AiCancelled extends Error {}

/** Keeps model output inside what the app stores and syncs (whole kcal, 0–20000, non-empty names). */
export function normalizeEstimate(e: Estimate): Estimate {
  return {
    note: e.note.trim(),
    items: e.items
      .map((i) => ({ ...i, name: i.name.trim(), calories: Math.min(20000, Math.max(0, Math.round(i.calories))) }))
      .filter((i) => i.name.length > 0),
  };
}

/** Runs the estimate on whichever provider is configured. Providers are loaded lazily. */
export async function estimateFood(cfg: AiConfig, input: EstimateInput, signal?: AbortSignal): Promise<Estimate> {
  if (cfg.provider === 'azure') {
    const { estimateWithAzure } = await import('./azure');
    return normalizeEstimate(await estimateWithAzure(cfg.azure!, input, signal));
  }
  const { estimateWithClaude } = await import('./claude');
  return normalizeEstimate(await estimateWithClaude(cfg.anthropicKey!, input, signal));
}

export function providerLabel(cfg: AiConfig | null): string {
  if (!cfg) return 'belum diatur';
  return cfg.provider === 'azure' ? `Azure OpenAI · ${cfg.azure?.deployment ?? '?'}` : 'Claude (Anthropic)';
}

// --- photo helpers ---

/** Downscales an image so its longest side is at most `maxSide` px; returns a JPEG data URL. */
async function downscale(file: Blob, maxSide: number, quality: number): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d')!;
  // JPEG has no alpha: paint white first so transparent PNGs don't turn black.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', quality);
}

/** The photo as base64 JPEG (no data: prefix), sized for the model. */
export async function photoToBase64(file: Blob): Promise<string> {
  const dataUrl = await downscale(file, 1568, 0.85);
  return dataUrl.slice(dataUrl.indexOf(',') + 1);
}

/** A screen-sized preview data URL shown while the photo is analysed. */
export function photoPreview(file: Blob): Promise<string> {
  return downscale(file, 720, 0.8);
}

/** A small thumbnail data URL for the food list. */
export function photoThumbnail(file: Blob): Promise<string> {
  return downscale(file, 192, 0.8);
}
