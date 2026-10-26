import { describe, expect, it } from 'vitest';
import { normalizeEstimate } from './estimate';

describe('normalizeEstimate', () => {
  it('clamps calories and drops nameless items', () => {
    expect(
      normalizeEstimate({
        note: ' ok ',
        items: [
          { name: ' Nasi ', calories: 650.4, meal: 'siang' },
          { name: 'Kue raksasa', calories: 99999, meal: 'camilan' },
          { name: 'Air', calories: -5, meal: 'siang' },
          { name: '  ', calories: 100, meal: 'siang' },
        ],
      }),
    ).toEqual({
      note: 'ok',
      items: [
        { name: 'Nasi', calories: 650, meal: 'siang' },
        { name: 'Kue raksasa', calories: 20000, meal: 'camilan' },
        { name: 'Air', calories: 0, meal: 'siang' },
      ],
    });
  });
});
