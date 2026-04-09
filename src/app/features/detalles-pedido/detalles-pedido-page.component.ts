import { Component, inject } from '@angular/core';

import { DetallesPedidoService } from './services';
import { ResourcePageComponent } from '../../shared/resource-crud/resource-page.component';
import { detallesPedidoPageConfig } from './detalles-pedido.config';

@Component({
  selector: 'app-detalles-pedido-page',
  imports: [ResourcePageComponent],
  templateUrl: './detalles-pedido-page.component.html',
  styleUrl: './detalles-pedido-page.component.css',
})
export class DetallesPedidoPageComponent {
  readonly resourceService = inject(DetallesPedidoService);
  readonly config = detallesPedidoPageConfig;
}
