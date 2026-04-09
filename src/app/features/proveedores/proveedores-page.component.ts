import { Component, inject } from '@angular/core';

import { ProveedoresService } from './services';
import { ResourcePageComponent } from '../../shared/resource-crud/resource-page.component';
import { proveedoresPageConfig } from './proveedores.config';

@Component({
  selector: 'app-proveedores-page',
  imports: [ResourcePageComponent],
  templateUrl: './proveedores-page.component.html',
  styleUrl: './proveedores-page.component.css',
})
export class ProveedoresPageComponent {
  readonly resourceService = inject(ProveedoresService);
  readonly config = proveedoresPageConfig;
}
