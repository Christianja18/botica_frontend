import { Component, inject } from '@angular/core';

import { ClientesService } from './services';
import { ResourcePageComponent } from '../../shared/resource-crud/resource-page.component';
import { clientesPageConfig } from './clientes.config';

@Component({
  selector: 'app-clientes-page',
  imports: [ResourcePageComponent],
  templateUrl: './clientes-page.component.html',
  styleUrl: './clientes-page.component.css',
})
export class ClientesPageComponent {
  readonly resourceService = inject(ClientesService);
  readonly config = clientesPageConfig;
}
