import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { BaseApiService } from '../../../core/services/http';
import { DatabaseBackupResult } from '../models';

@Injectable({
  providedIn: 'root',
})
export class BackupsService extends BaseApiService {
  createFullBackup(): Observable<DatabaseBackupResult> {
    return this.post<DatabaseBackupResult>('backups/completo', null);
  }

  createInsertsBackup(): Observable<DatabaseBackupResult> {
    return this.post<DatabaseBackupResult>('backups/inserts', null);
  }
}
