import { Component, inject } from '@angular/core';

import { BoletasService } from './services';
import { ResourcePageComponent } from '../../shared/resource-crud/resource-page.component';
import { boletasPageConfig } from './boletas.config';

@Component({
  selector: 'app-boletas-page',
  imports: [ResourcePageComponent],
  templateUrl: './boletas-page.component.html',
  styleUrl: './boletas-page.component.css',
})
export class BoletasPageComponent {
  readonly resourceService = inject(BoletasService);
  readonly config = boletasPageConfig;
}
