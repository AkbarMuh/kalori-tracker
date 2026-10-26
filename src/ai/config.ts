export type AiProvider = 'azure' | 'anthropic';

export interface AzureConfig {
  /** Resource endpoint, e.g. https://name.cognitiveservices.azure.com (no trailing slash). */
  endpoint: string;
  deployment: string;
  apiVersion: string;
  key: string;
}

export interface AiConfig {
  provider: AiProvider;
  azure?: AzureConfig;
  anthropicKey?: string;
}

/** Supports image input and json_schema structured outputs on Azure OpenAI. */
export const DEFAULT_AZURE_API_VERSION = '2024-12-01-preview';

const STORAGE_KEY = 'kalori.ai';
const LEGACY_ANTHROPIC_KEY = 'kalori.anthropicKey';

export function isAiReady(cfg: AiConfig | null | undefined): cfg is AiConfig {
  if (!cfg) return false;
  if (cfg.provider === 'anthropic') return !!cfg.anthropicKey;
  const a = cfg.azure;
  return !!(a && a.endpoint && a.deployment && a.apiVersion && a.key);
}

export function loadAiConfig(): AiConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AiConfig;
    const legacy = localStorage.getItem(LEGACY_ANTHROPIC_KEY);
    return legacy ? { provider: 'anthropic', anthropicKey: legacy } : null;
  } catch {
    return null;
  }
}

export function saveAiConfig(cfg: AiConfig | null) {
  try {
    if (cfg) localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    else localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_ANTHROPIC_KEY);
  } catch {
    // storage unavailable
  }
}

/**
 * Reads what the Azure portal shows as "Target URI" (or just the resource endpoint) into
 * endpoint / deployment / API version. Returns null when it isn't an https URL.
 *
 *   https://res.cognitiveservices.azure.com/openai/deployments/dep/chat/completions?api-version=2024-12-01-preview
 */
export function parseAzureTarget(input: string): Partial<AzureConfig> | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;
  const out: Partial<AzureConfig> = { endpoint: url.origin };
  const m = url.pathname.match(/\/openai\/deployments\/([^/]+)/);
  if (m) out.deployment = decodeURIComponent(m[1]!);
  const version = url.searchParams.get('api-version');
  if (version) out.apiVersion = version;
  return out;
}

export function azureChatUrl(a: Pick<AzureConfig, 'endpoint' | 'deployment' | 'apiVersion'>): string {
  const endpoint = a.endpoint.replace(/\/+$/, '');
  return `${endpoint}/openai/deployments/${encodeURIComponent(a.deployment)}/chat/completions?api-version=${encodeURIComponent(a.apiVersion)}`;
}

// --- one-tap setup link for another device (config travels in the URL fragment, never to a server) ---

const HASH_PREFIX = '#ai=';

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(b64: string): string {
  const bin = atob(b64.replace(/-/g, '+').replace(/_/g, '/'));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export function setupLink(cfg: AiConfig, appUrl: string): string {
  return `${appUrl.split('#')[0]}${HASH_PREFIX}${toBase64Url(JSON.stringify(cfg))}`;
}

/** The config carried by a setup link's fragment, or null if the hash isn't a (valid) setup link. */
export function readSetupHash(hash: string): AiConfig | null {
  if (!hash.startsWith(HASH_PREFIX)) return null;
  try {
    const cfg = JSON.parse(fromBase64Url(hash.slice(HASH_PREFIX.length))) as AiConfig;
    return isAiReady(cfg) ? cfg : null;
  } catch {
    return null;
  }
}
