import { DataFileSchema, type DataFile } from '../db/schema';
import { serializeData } from './merge';

export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  path: string;
  branch?: string;
}

export class GitHubError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** 409/422 on PUT means the file changed since we read its sha. */
export const isConflict = (e: unknown) => e instanceof GitHubError && (e.status === 409 || e.status === 422);

const API = 'https://api.github.com';

function headers(cfg: GitHubConfig, accept = 'application/vnd.github+json'): HeadersInit {
  return {
    Accept: accept,
    Authorization: `Bearer ${cfg.token}`,
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

function contentsUrl(cfg: GitHubConfig, withRef: boolean): string {
  const path = cfg.path.split('/').map(encodeURIComponent).join('/');
  const url = `${API}/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/contents/${path}`;
  return withRef && cfg.branch ? `${url}?ref=${encodeURIComponent(cfg.branch)}` : url;
}

async function fail(res: Response): Promise<never> {
  let detail = '';
  try {
    detail = ((await res.json()) as { message?: string }).message ?? '';
  } catch {
    // body was not JSON
  }
  const hint =
    res.status === 401 ? 'Token tidak valid atau kedaluwarsa.' :
    res.status === 403 ? 'Token tidak punya izin ke repo ini (atau kena rate limit).' :
    res.status === 404 ? 'Repo tidak ditemukan atau token tidak punya akses.' : '';
  throw new GitHubError(`GitHub ${res.status}: ${hint || detail || res.statusText}`, res.status);
}

function decodeBase64Utf8(b64: string): string {
  const bin = atob(b64.replace(/\n/g, ''));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function encodeBase64Utf8(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

export interface RemoteFile {
  data: DataFile;
  sha: string;
}

/** Reads data.json; returns null when it does not exist yet. */
export async function readRemote(cfg: GitHubConfig): Promise<RemoteFile | null> {
  const res = await fetch(contentsUrl(cfg, true), { headers: headers(cfg), cache: 'no-store' });
  if (res.status === 404) {
    // Distinguish "file missing" from "repo missing / no access".
    const repoRes = await fetch(`${API}/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}`, {
      headers: headers(cfg),
      cache: 'no-store',
    });
    if (!repoRes.ok) return fail(repoRes);
    return null;
  }
  if (!res.ok) return fail(res);

  const meta = (await res.json()) as { sha: string; content?: string; encoding?: string };
  let text: string;
  if (meta.encoding === 'base64' && meta.content) {
    text = decodeBase64Utf8(meta.content);
  } else {
    // Files over 1 MB come back without inline content; fetch the raw body instead.
    const raw = await fetch(contentsUrl(cfg, true), {
      headers: headers(cfg, 'application/vnd.github.raw+json'),
      cache: 'no-store',
    });
    if (!raw.ok) return fail(raw);
    text = await raw.text();
  }

  const parsed = DataFileSchema.safeParse(JSON.parse(text));
  if (!parsed.success) {
    throw new Error(`Format ${cfg.path} di repo tidak dikenali: ${parsed.error.issues[0]?.message ?? ''}`);
  }
  return { data: parsed.data, sha: meta.sha };
}

/** Creates or updates data.json. `sha` must be the current blob sha when updating. */
export async function writeRemote(cfg: GitHubConfig, data: DataFile, sha: string | null): Promise<string> {
  const res = await fetch(contentsUrl(cfg, false), {
    method: 'PUT',
    headers: { ...headers(cfg), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `sync: ${new Date().toISOString()}`,
      content: encodeBase64Utf8(serializeData(data)),
      ...(sha ? { sha } : {}),
      ...(cfg.branch ? { branch: cfg.branch } : {}),
    }),
  });
  if (!res.ok) return fail(res);
  const body = (await res.json()) as { content: { sha: string } };
  return body.content.sha;
}
