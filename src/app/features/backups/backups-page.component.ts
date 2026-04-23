import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';

import { resolveApiError } from '../../core/services';
import { DatabaseBackupResult, BackupType } from './models';
import { BackupsService } from './services';

interface BackupActionCard {
  type: BackupType;
  kicker: string;
  title: string;
  description: string;
  buttonLabel: string;
  tone: 'primary' | 'secondary';
  badges: string[];
}

interface BackupHistoryItem extends DatabaseBackupResult {
  createdAt: string;
  title: string;
  summary: string;
  sizeLabel: string;
}

@Component({
  selector: 'app-backups-page',
  imports: [CommonModule],
  templateUrl: './backups-page.component.html',
  styleUrl: './backups-page.component.css',
})
export class BackupsPageComponent {
  private readonly backupsService = inject(BackupsService);
  private readonly destroyRef = inject(DestroyRef);
  private successMessageTimeoutId: number | null = null;

  readonly storagePath = 'C:\\copia';
  readonly scheduleLabel = 'Automático cada trimestre';
  readonly actionCards: BackupActionCard[] = [
    {
      type: 'completo',
      kicker: 'Recuperación total',
      title: 'Backup completo',
      description:
        'Genera estructura, tablas, vistas, triggers e inserts para una restauración amplia del sistema.',
      buttonLabel: 'Generar backup completo',
      tone: 'primary',
      badges: ['Estructura', 'Datos', 'Vistas', 'Triggers'],
    },
    {
      type: 'inserts',
      kicker: 'Carga rápida',
      title: 'Backup solo de inserts',
      description:
        'Guarda únicamente los datos actuales para recargar tablas existentes sin tocar la estructura.',
      buttonLabel: 'Generar backup de inserts',
      tone: 'secondary',
      badges: ['Datos', 'Reejecutable', 'Sin DDL'],
    },
  ];

  readonly busyType = signal<BackupType | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly history = signal<BackupHistoryItem[]>([]);

  readonly generatedCount = computed(() => this.history().length);
  readonly latestBackup = computed(() => this.history()[0] ?? null);
  readonly latestBackupLabel = computed(() => this.latestBackup()?.title ?? 'Sin copias manuales');
  readonly latestBackupCreatedAt = computed(
    () => this.latestBackup()?.createdAt ?? 'Todavia no hay ejecuciones manuales.',
  );
  readonly latestBackupPath = computed(() => this.latestBackup()?.absolutePath ?? this.storagePath);

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.clearSuccessMessageTimeout();
    });
  }

  generateBackup(type: BackupType): void {
    if (this.busyType()) {
      return;
    }

    this.busyType.set(type);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const request =
      type === 'completo'
        ? this.backupsService.createFullBackup()
        : this.backupsService.createInsertsBackup();

    request.subscribe({
      next: (result) => {
        const entry = this.toHistoryItem(result);
        this.history.update((items) => [entry, ...items]);
        this.successMessage.set(`${entry.title} guardado en ${entry.absolutePath}.`);
        this.scheduleSuccessMessageClear();
        this.busyType.set(null);
      },
      error: (error: unknown) => {
        this.errorMessage.set(resolveApiError(error));
        this.busyType.set(null);
      },
    });
  }

  isBusy(type: BackupType): boolean {
    return this.busyType() === type;
  }

  private toHistoryItem(result: DatabaseBackupResult): BackupHistoryItem {
    const backupType = this.normalizeType(result.tipo);

    return {
      ...result,
      tipo: backupType,
      createdAt: new Intl.DateTimeFormat('es-PE', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date()),
      title: backupType === 'completo' ? 'Backup completo' : 'Backup de inserts',
      summary:
        backupType === 'completo'
          ? 'Incluye estructura y datos listos para restauración.'
          : 'Incluye datos para recarga sobre una estructura ya existente.',
      sizeLabel: this.formatSize(result.sizeBytes),
    };
  }

  private normalizeType(value: string): BackupType {
    return value === 'inserts' ? 'inserts' : 'completo';
  }

  private formatSize(sizeBytes: number): string {
    if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
      return '0 B';
    }

    if (sizeBytes < 1024) {
      return `${sizeBytes} B`;
    }

    if (sizeBytes < 1024 * 1024) {
      return `${(sizeBytes / 1024).toFixed(1)} KB`;
    }

    return `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  private scheduleSuccessMessageClear(): void {
    this.clearSuccessMessageTimeout();
    this.successMessageTimeoutId = window.setTimeout(() => {
      this.successMessage.set(null);
      this.successMessageTimeoutId = null;
    }, 2000);
  }

  private clearSuccessMessageTimeout(): void {
    if (this.successMessageTimeoutId !== null) {
      window.clearTimeout(this.successMessageTimeoutId);
      this.successMessageTimeoutId = null;
    }
  }
}
