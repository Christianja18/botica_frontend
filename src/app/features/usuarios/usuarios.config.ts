import { ResourcePageConfig } from '../../shared/resource-crud/resource-page.types';

export const usuariosPageConfig: ResourcePageConfig = {
  key: 'usuarios',
  idKey: 'idUsuario',
  title: 'Usuarios del sistema',
  description: 'Administra al personal que usa la plataforma y asignales un rol del backend.',
  createLabel: 'usuario',
  emptyState: 'Todavia no hay usuarios registrados.',
  searchableFields: ['nombre', 'apellido', 'email'],
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
      helpText: 'Si editas y lo dejas vacio, se conserva la contrasena actual.',
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
