import { Component, inject } from '@angular/core';

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
  readonly resourceService = inject(InventarioService);
  readonly config = inventarioPageConfig;
}
