import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class StockRefreshService {
  readonly version = signal(0);

  notifyStockChanged(): void {
    this.version.update((current) => current + 1);
  }
}
