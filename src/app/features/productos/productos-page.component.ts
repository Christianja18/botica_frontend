import { Component, inject } from '@angular/core';

import { ProductosService } from './services';
import { ResourcePageComponent } from '../../shared/resource-crud/resource-page.component';
import { productosPageConfig } from './productos.config';

@Component({
  selector: 'app-productos-page',
  imports: [ResourcePageComponent],
  templateUrl: './productos-page.component.html',
  styleUrl: './productos-page.component.css',
})
export class ProductosPageComponent {
  readonly resourceService = inject(ProductosService);
  readonly config = productosPageConfig;
}
