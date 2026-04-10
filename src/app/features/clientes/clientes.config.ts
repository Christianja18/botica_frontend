import { ResourcePageConfig } from '../../shared/resource-crud/resource-page.types';

export const clientesPageConfig: ResourcePageConfig = {
  key: 'clientes',
  idKey: 'idCliente',
  title: 'Clientes y pacientes',
  description: 'Registra la base comercial de compradores y pacientes frecuentes.',
  createLabel: 'cliente',
  emptyState: 'Todavia no hay clientes creados.',
  searchableFields: ['nombre', 'apellido', 'dni', 'telefono', 'email'],
  columns: [
    { key: 'nombre', label: 'Nombre' },
    { key: 'apellido', label: 'Apellido' },
    { key: 'dni', label: 'DNI' },
    { key: 'telefono', label: 'Telefono' },
    { key: 'email', label: 'Correo' },
  ],
  fields: [
    { key: 'nombre', label: 'Nombre', type: 'text', required: true, maxLength: 100 },
    { key: 'apellido', label: 'Apellido', type: 'text', required: true, maxLength: 100 },
    { key: 'dni', label: 'DNI', type: 'text', maxLength: 8, minLength: 8, pattern: '^\\d{8}$' },
    { key: 'telefono', label: 'Telefono', type: 'text', maxLength: 9, minLength: 9, pattern: '^\\d{9}$' },
    { key: 'email', label: 'Correo', type: 'email', maxLength: 150 },
  ],
};
