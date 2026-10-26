import { describe, expect, it } from 'vitest';
import { parseBackup } from './backup';

describe('parseBackup', () => {
  it('accepts a valid file', () => {
    const data = parseBackup(
      JSON.stringify({
        version: 1,
        settings: { id: 'main', dailyTarget: 1800, updatedAt: 't' },
        entries: [],
        favorites: [{ id: 'f', name: 'Teh manis', calories: 90, updatedAt: 't' }],
      }),
    );
    expect(data.favorites[0]!.name).toBe('Teh manis');
  });

  it('rejects non-JSON', () => {
    expect(() => parseBackup('not json')).toThrow('bukan JSON');
  });

  it('rejects the wrong shape with a readable message', () => {
    expect(() => parseBackup(JSON.stringify({ version: 1, entries: 'x' }))).toThrow('Format backup tidak dikenali');
  });
});
