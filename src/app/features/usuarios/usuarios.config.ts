import { ResourcePageConfig } from '../../shared/resource-crud/resource-page.types';

export const usuariosPageConfig: ResourcePageConfig = {
  key: 'usuarios',
  idKey: 'idUsuario',
  title: 'Usuarios del sistema',
  description: 'Administra al personal y sus permisos de acceso.',
  createLabel: 'usuario',
  emptyState: 'Todavia no hay usuarios registrados.',
  searchableFields: ['nombre', 'apellido', 'email'],
  pagination: {
    enabled: true,
    pageSize: 5,
    pageSizeOptions: [5, 10, 15, 20, 50],
    sortBy: 'idUsuario',
    direction: 'asc',
  },
  columns: [
    { key: 'nombre', label: 'Nombre' },
    { key: 'apellido', label: 'Apellido' },
    { key: 'email', label: 'Correo' },
    {
      key: 'idRol',
      label: 'Rol',
      type: 'lookup',
      lookup: { resource: 'roles', labelKey: 'nombre', valueKey: 'idRol' },
    },
    { key: 'activo', label: 'Activo', type: 'boolean' },
  ],
  fields: [
    { key: 'nombre', label: 'Nombre', type: 'text', required: true, maxLength: 100 },
    { key: 'apellido', label: 'Apellido', type: 'text', required: true, maxLength: 100 },
    { key: 'email', label: 'Correo', type: 'email', required: true, maxLength: 150 },
    {
      key: 'passwordHash',
      label: 'Contrasena',
      type: 'password',
      requiredOnCreate: true,
      minLength: 8,
      maxLength: 8,
      helpText: 'Si lo dejas vacio al editar, se mantiene la clave actual.',
    },
    {
      key: 'idRol',
      label: 'Rol',
      type: 'select',
      required: true,
      lookup: { resource: 'roles', labelKey: 'nombre', valueKey: 'idRol' },
    },
    { key: 'activo', label: 'Activo', type: 'checkbox' },
  ],
};
