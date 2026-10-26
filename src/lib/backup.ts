import { DataFileSchema, type DataFile } from '../db/schema';
import { serializeData } from '../sync/merge';

export function backupFileName(today: string): string {
  return `kalori-backup-${today}.json`;
}

export function toBackupBlob(data: DataFile): Blob {
  return new Blob([serializeData(data)], { type: 'application/json' });
}

/** Parses and validates a backup file's text. Throws a readable error on bad input. */
export function parseBackup(text: string): DataFile {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error('File bukan JSON yang valid.');
  }
  const parsed = DataFileSchema.safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new Error(`Format backup tidak dikenali${issue ? ` (${issue.path.join('.')}: ${issue.message})` : ''}.`);
  }
  return parsed.data;
}
