import { Component, inject } from '@angular/core';

import { CategoriasService } from './services';
import { ResourcePageComponent } from '../../shared/resource-crud/resource-page.component';
import { categoriasPageConfig } from './categorias.config';

@Component({
  selector: 'app-categorias-page',
  imports: [ResourcePageComponent],
  templateUrl: './categorias-page.component.html',
  styleUrl: './categorias-page.component.css',
})
export class CategoriasPageComponent {
  readonly resourceService = inject(CategoriasService);
  readonly config = categoriasPageConfig;
}
