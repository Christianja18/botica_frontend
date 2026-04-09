export type PermissionKey =
  | 'puedeVender'
  | 'puedeAdministrarInventario'
  | 'puedeVerReportes'
  | 'puedeAdministrarUsuarios';

export interface RolePermissions {
  puedeVender: boolean;
  puedeAdministrarInventario: boolean;
  puedeVerReportes: boolean;
  puedeAdministrarUsuarios: boolean;
}

export type CrudResourceKey =
  | 'usuarios'
  | 'roles'
  | 'clientes'
  | 'categorias'
  | 'proveedores'
  | 'productos'
  | 'inventario'
  | 'pedidos'
  | 'detalles-pedido'
  | 'boletas'
  | 'reportes';
