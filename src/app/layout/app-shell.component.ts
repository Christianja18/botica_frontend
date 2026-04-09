import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { appSettings } from '../core/config/app.settings';
import { PermissionKey } from '../core/models';
import { AuthService } from '../core/services';

interface NavItem {
  label: string;
  route: string;
  caption: string;
  permission?: PermissionKey;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

@Component({
  selector: 'app-shell',
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.css',
})
export class AppShellComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly appName = appSettings.appName;
  readonly appTagline = appSettings.appTagline;
  readonly currentUser = this.auth.user;
  readonly sidebarOpen = signal(false);

  readonly sections = computed(() => {
    const catalog: NavSection[] = [
      {
        title: 'Operación',
        items: [
          { label: 'Dashboard', route: '/dashboard', caption: 'Indicadores y alertas' },
          {
            label: 'Pedidos',
            route: '/pedidos',
            caption: 'Ventas y detalle comercial',
            permission: 'puedeVender',
          },
          {
            label: 'Clientes',
            route: '/clientes',
            caption: 'Registro de compradores',
            permission: 'puedeVender',
          },
          {
            label: 'Boletas',
            route: '/boletas',
            caption: 'Comprobantes',
            permission: 'puedeVender',
          },
        ],
      },
      {
        title: 'Catálogos',
        items: [
          {
            label: 'Productos',
            route: '/productos',
            caption: 'Maestro comercial',
            permission: 'puedeAdministrarInventario',
          },
          {
            label: 'Inventario',
            route: '/inventario',
            caption: 'Stock y mínimos',
            permission: 'puedeAdministrarInventario',
          },
          {
            label: 'Categorías',
            route: '/categorias',
            caption: 'Clasificación',
            permission: 'puedeAdministrarInventario',
          },
          {
            label: 'Proveedores',
            route: '/proveedores',
            caption: 'Abastecimiento',
            permission: 'puedeAdministrarInventario',
          },
          {
            label: 'Detalle pedidos',
            route: '/detalles-pedido',
            caption: 'Auditoría granular',
            permission: 'puedeAdministrarInventario',
          },
        ],
      },
      {
        title: 'Gestión',
        items: [
          {
            label: 'Reportes',
            route: '/reportes',
            caption: 'Analítica y generación',
            permission: 'puedeVerReportes',
          },
          {
            label: 'Usuarios',
            route: '/usuarios',
            caption: 'Personal y accesos',
            permission: 'puedeAdministrarUsuarios',
          },
          {
            label: 'Roles',
            route: '/roles',
            caption: 'Permisos por perfil',
            permission: 'puedeAdministrarUsuarios',
          },
        ],
      },
    ];

    return catalog
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => this.auth.hasPermission(item.permission)),
      }))
      .filter((section) => section.items.length > 0);
  });

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  toggleSidebar(): void {
    this.sidebarOpen.update((value) => !value);
  }

  logout(): void {
    this.auth.logout();
    void this.router.navigate(['/login']);
  }
}
