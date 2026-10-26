export const MASCOT_NAME = 'Salju';

export type Mood = 'sleepy' | 'hungry' | 'happy' | 'proud' | 'stuffed';

/** Within ±5% of the target counts as "on target". */
const ON_TARGET = 0.05;

export function moodFor(total: number, target: number): Mood {
  if (total <= 0) return 'sleepy';
  if (target <= 0) return 'happy';
  const p = total / target;
  if (p < 0.6) return 'hungry';
  if (p < 1 - ON_TARGET) return 'happy';
  if (p <= 1 + ON_TARGET) return 'proud';
  return 'stuffed';
}

const fmt = (n: number) => Math.abs(Math.round(n)).toLocaleString('id-ID');

export function mascotMessage(mood: Mood, total: number, target: number): string {
  const remaining = target - total;
  switch (mood) {
    case 'sleepy':
      return `Belum ada makanan tercatat. ${MASCOT_NAME} ngantuk… zzz`;
    case 'hungry':
      return `${MASCOT_NAME} masih lapar! Sisa ${fmt(remaining)} kkal lagi.`;
    case 'happy':
      return target > 0
        ? `Mantap! ${MASCOT_NAME} senang, tinggal ${fmt(remaining)} kkal.`
        : `${MASCOT_NAME} senang kamu mencatat makanan!`;
    case 'proud':
      return `Pas target! ${MASCOT_NAME} bangga sama kamu 🎉`;
    case 'stuffed':
      return `Aduh, ${MASCOT_NAME} kekenyangan… lebih ${fmt(remaining)} kkal.`;
  }
}
