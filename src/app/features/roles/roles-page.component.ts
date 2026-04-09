import { Component, inject } from '@angular/core';

import { RolesService } from './services';
import { ResourcePageComponent } from '../../shared/resource-crud/resource-page.component';
import { rolesPageConfig } from './roles.config';

@Component({
  selector: 'app-roles-page',
  imports: [ResourcePageComponent],
  templateUrl: './roles-page.component.html',
  styleUrl: './roles-page.component.css',
})
export class RolesPageComponent {
  readonly resourceService = inject(RolesService);
  readonly config = rolesPageConfig;
}
