import { Component, inject } from '@angular/core';

import { UsuariosService } from './services';
import { ResourcePageComponent } from '../../shared/resource-crud/resource-page.component';
import { usuariosPageConfig } from './usuarios.config';

@Component({
  selector: 'app-usuarios-page',
  imports: [ResourcePageComponent],
  templateUrl: './usuarios-page.component.html',
  styleUrl: './usuarios-page.component.css',
})
export class UsuariosPageComponent {
  readonly resourceService = inject(UsuariosService);
  readonly config = usuariosPageConfig;
}
