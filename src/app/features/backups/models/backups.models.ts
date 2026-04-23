export type BackupType = 'completo' | 'inserts';

export interface DatabaseBackupResult {
  tipo: BackupType | string;
  fileName: string;
  absolutePath: string;
  sizeBytes: number;
  message: string;
}
