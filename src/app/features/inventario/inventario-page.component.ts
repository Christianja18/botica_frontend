import { Component, computed, inject } from '@angular/core';

import { StockRefreshService } from '../../core/services';
import { InventarioService } from './services';
import { ResourcePageComponent } from '../../shared/resource-crud/resource-page.component';
import { inventarioPageConfig } from './inventario.config';

@Component({
  selector: 'app-inventario-page',
  imports: [ResourcePageComponent],
  templateUrl: './inventario-page.component.html',
  styleUrl: './inventario-page.component.css',
})
export class InventarioPageComponent {
  private readonly stockRefresh = inject(StockRefreshService);

  readonly resourceService = inject(InventarioService);
  readonly config = inventarioPageConfig;
  readonly refreshVersion = computed(() => this.stockRefresh.version());

  notifyInventorySaved(): void {
    this.stockRefresh.notifyStockChanged();
  }
}
