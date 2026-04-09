import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { permissionGuard } from './core/guards/permission.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login-page.component').then((module) => module.LoginPageComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/app-shell.component').then((module) => module.AppShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard-page.component').then(
            (module) => module.DashboardPageComponent,
          ),
      },
      {
        path: 'usuarios',
        canActivate: [permissionGuard],
        data: { permission: 'puedeAdministrarUsuarios' },
        loadComponent: () =>
          import('./features/usuarios/usuarios-page.component').then(
            (module) => module.UsuariosPageComponent,
          ),
      },
      {
        path: 'roles',
        canActivate: [permissionGuard],
        data: { permission: 'puedeAdministrarUsuarios' },
        loadComponent: () =>
          import('./features/roles/roles-page.component').then((module) => module.RolesPageComponent),
      },
      {
        path: 'clientes',
        canActivate: [permissionGuard],
        data: { permission: 'puedeVender' },
        loadComponent: () =>
          import('./features/clientes/clientes-page.component').then(
            (module) => module.ClientesPageComponent,
          ),
      },
      {
        path: 'categorias',
        canActivate: [permissionGuard],
        data: { permission: 'puedeAdministrarInventario' },
        loadComponent: () =>
          import('./features/categorias/categorias-page.component').then(
            (module) => module.CategoriasPageComponent,
          ),
      },
      {
        path: 'proveedores',
        canActivate: [permissionGuard],
        data: { permission: 'puedeAdministrarInventario' },
        loadComponent: () =>
          import('./features/proveedores/proveedores-page.component').then(
            (module) => module.ProveedoresPageComponent,
          ),
      },
      {
        path: 'productos',
        canActivate: [permissionGuard],
        data: { permission: 'puedeAdministrarInventario' },
        loadComponent: () =>
          import('./features/productos/productos-page.component').then(
            (module) => module.ProductosPageComponent,
          ),
      },
      {
        path: 'inventario',
        canActivate: [permissionGuard],
        data: { permission: 'puedeAdministrarInventario' },
        loadComponent: () =>
          import('./features/inventario/inventario-page.component').then(
            (module) => module.InventarioPageComponent,
          ),
      },
      {
        path: 'detalles-pedido',
        canActivate: [permissionGuard],
        data: { permission: 'puedeAdministrarInventario' },
        loadComponent: () =>
          import('./features/detalles-pedido/detalles-pedido-page.component').then(
            (module) => module.DetallesPedidoPageComponent,
          ),
      },
      {
        path: 'pedidos',
        canActivate: [permissionGuard],
        data: { permission: 'puedeVender' },
        loadComponent: () =>
          import('./features/pedidos/pedidos-page.component').then(
            (module) => module.PedidosPageComponent,
          ),
      },
      {
        path: 'boletas',
        canActivate: [permissionGuard],
        data: { permission: 'puedeVender' },
        loadComponent: () =>
          import('./features/boletas/boletas-page.component').then(
            (module) => module.BoletasPageComponent,
          ),
      },
      {
        path: 'reportes',
        canActivate: [permissionGuard],
        data: { permission: 'puedeVerReportes' },
        loadComponent: () =>
          import('./features/reportes/reportes-page.component').then(
            (module) => module.ReportesPageComponent,
          ),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
