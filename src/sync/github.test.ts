import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DataFile } from '../db/schema';
import { GitHubError, isConflict, readRemote, writeRemote, type GitHubConfig } from './github';

const cfg: GitHubConfig = { token: 't', owner: 'me', repo: 'kalori-data', path: 'data.json' };

const data: DataFile = {
  version: 1,
  settings: { id: 'main', dailyTarget: 1800, updatedAt: 't' },
  entries: [
    {
      id: 'a',
      date: '2026-01-05',
      time: 't',
      meal: 'siang',
      name: 'Nasi uduk 🍚 & tempe',
      calories: 550,
      source: 'manual',
      createdAt: 't',
      updatedAt: 't',
    },
  ],
  favorites: [],
};

afterEach(() => vi.unstubAllGlobals());

/** A tiny in-memory stand-in for the GitHub Contents API. */
function fakeGitHub() {
  const store: { content: string | null; sha: number } = { content: null, sha: 0 };
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
    if (url.endsWith('/repos/me/kalori-data')) return json(200, {});
    if (init?.method === 'PUT') {
      const body = JSON.parse(String(init.body)) as { content: string; sha?: string };
      if (store.content !== null && body.sha !== String(store.sha)) return json(409, { message: 'sha mismatch' });
      store.content = body.content;
      store.sha++;
      return json(200, { content: { sha: String(store.sha) } });
    }
    if (store.content === null) return json(404, { message: 'Not Found' });
    return json(200, { sha: String(store.sha), encoding: 'base64', content: store.content });
  });
  vi.stubGlobal('fetch', fetchMock);
  return { store, fetchMock };
}

describe('github contents client', () => {
  it('returns null when the file does not exist yet', async () => {
    fakeGitHub();
    expect(await readRemote(cfg)).toBeNull();
  });

  it('round-trips UTF-8 content (emoji, symbols) through base64', async () => {
    fakeGitHub();
    const sha = await writeRemote(cfg, data, null);
    const remote = await readRemote(cfg);
    expect(remote?.sha).toBe(sha);
    expect(remote?.data).toEqual(data);
  });

  it('surfaces a stale sha as a conflict', async () => {
    fakeGitHub();
    await writeRemote(cfg, data, null);
    const err = await writeRemote(cfg, data, 'stale').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(GitHubError);
    expect(isConflict(err)).toBe(true);
  });

  it('sends the token as a bearer header', async () => {
    const { fetchMock } = fakeGitHub();
    await readRemote(cfg);
    const headers = fetchMock.mock.calls[0]![1]!.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer t');
  });

  it('explains a 401', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 401 })));
    await expect(readRemote(cfg)).rejects.toThrow('Token tidak valid');
  });
});
