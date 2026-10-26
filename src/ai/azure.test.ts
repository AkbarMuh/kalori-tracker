import { afterEach, describe, expect, it, vi } from 'vitest';
import { estimateWithAzure } from './azure';
import type { AzureConfig } from './config';
import { AiCancelled, AiError } from './estimate';

const cfg: AzureConfig = {
  endpoint: 'https://res.cognitiveservices.azure.com',
  deployment: 'gpt-4.1-nano',
  apiVersion: '2024-12-01-preview',
  key: 'secret',
};
const input = { imageBase64: 'AAAA', mealHint: 'Makan siang' };
const estimate = { items: [{ name: 'Nasi goreng', calories: 650, meal: 'siang' }], note: 'Porsi warung.' };

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
const completion = (content: unknown, finish_reason = 'stop', refusal: string | null = null) =>
  json(200, { choices: [{ finish_reason, message: { content: JSON.stringify(content), refusal } }] });

function mockFetch(...responses: Response[]) {
  const fn = vi.fn(async () => responses.shift()!);
  vi.stubGlobal('fetch', fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe('estimateWithAzure', () => {
  it('sends the photo with a strict JSON schema and parses the answer', async () => {
    const fetchMock = mockFetch(completion(estimate));
    expect(await estimateWithAzure(cfg, input)).toEqual(estimate);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(
      'https://res.cognitiveservices.azure.com/openai/deployments/gpt-4.1-nano/chat/completions?api-version=2024-12-01-preview',
    );
    expect((init.headers as Record<string, string>)['api-key']).toBe('secret');
    const body = JSON.parse(String(init.body));
    expect(body.response_format.type).toBe('json_schema');
    expect(body.response_format.json_schema.strict).toBe(true);
    expect(body.messages[1].content[0].image_url.url).toBe('data:image/jpeg;base64,AAAA');
  });

  it('falls back to JSON mode when the deployment rejects json_schema', async () => {
    const fetchMock = mockFetch(
      json(400, { error: { code: 'BadRequest', message: "Invalid parameter: 'response_format' of type 'json_schema' is not supported" } }),
      completion(estimate),
    );
    expect(await estimateWithAzure(cfg, input)).toEqual(estimate);
    const retry = JSON.parse(String((fetchMock.mock.calls[1] as unknown as [string, RequestInit])[1].body));
    expect(retry.response_format).toEqual({ type: 'json_object' });
  });

  it.each([
    [json(401, { error: { message: 'Access denied' } }), 'Key Azure tidak valid'],
    [json(404, { error: { code: 'DeploymentNotFound' } }), 'Deployment Azure tidak ditemukan'],
    [json(429, {}), 'Kuota Azure'],
    [json(400, { error: { code: 'content_filter', message: 'filtered' } }), 'filter konten'],
    [completion(estimate, 'content_filter'), 'filter konten'],
    [completion(estimate, 'length'), 'terpotong'],
    [completion(estimate, 'stop', 'no'), 'ditolak'],
    [completion({ items: 'nope' }), 'tidak sesuai format'],
  ])('turns failures into readable errors (%#)', async (response, message) => {
    mockFetch(response);
    const err = await estimateWithAzure(cfg, input).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AiError);
    expect((err as Error).message).toContain(message);
  });

  it('reports network failures and cancellation distinctly', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))));
    await expect(estimateWithAzure(cfg, input)).rejects.toThrow('Tidak bisa terhubung ke Azure');

    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new DOMException('aborted', 'AbortError'))));
    await expect(estimateWithAzure(cfg, input)).rejects.toBeInstanceOf(AiCancelled);
  });
});
