import { ResourcePageConfig } from '../../shared/resource-crud/resource-page.types';

export const rolesPageConfig: ResourcePageConfig = {
  key: 'roles',
  idKey: 'idRol',
  title: 'Roles y permisos',
  description: 'Define que modulos puede usar cada perfil operativo dentro de la botica.',
  createLabel: 'rol',
  emptyState: 'Todavia no hay roles configurados.',
  searchableFields: ['nombre', 'descripcion'],
  columns: [
    { key: 'nombre', label: 'Rol' },
    { key: 'descripcion', label: 'Descripcion' },
    { key: 'puedeVender', label: 'Ventas', type: 'boolean' },
    { key: 'puedeAdministrarInventario', label: 'Inventario', type: 'boolean' },
    { key: 'puedeVerReportes', label: 'Reportes', type: 'boolean' },
    { key: 'puedeAdministrarUsuarios', label: 'Usuarios', type: 'boolean' },
  ],
  fields: [
    { key: 'nombre', label: 'Nombre', type: 'text', required: true, maxLength: 50 },
    { key: 'descripcion', label: 'Descripcion', type: 'textarea', maxLength: 255 },
    { key: 'puedeVender', label: 'Puede vender', type: 'checkbox' },
    { key: 'puedeAdministrarInventario', label: 'Administra inventario', type: 'checkbox' },
    { key: 'puedeVerReportes', label: 'Puede ver reportes', type: 'checkbox' },
    { key: 'puedeAdministrarUsuarios', label: 'Administra usuarios', type: 'checkbox' },
    { key: 'activo', label: 'Activo', type: 'checkbox' },
  ],
};
