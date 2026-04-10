import { ResourcePageConfig } from '../../shared/resource-crud/resource-page.types';

export const proveedoresPageConfig: ResourcePageConfig = {
  key: 'proveedores',
  idKey: 'idProveedor',
  title: 'Proveedores',
  description: 'Manten actualizada la red de proveedores y distribuidores de la botica.',
  createLabel: 'proveedor',
  emptyState: 'Todavia no hay proveedores cargados.',
  searchableFields: ['nombre', 'ruc', 'telefono', 'email', 'direccion'],
  pagination: {
    enabled: true,
    pageSize: 5,
    pageSizeOptions: [5, 10, 15, 20, 50],
    sortBy: 'idProveedor',
    direction: 'asc',
  },
  columns: [
    { key: 'nombre', label: 'Proveedor' },
    { key: 'ruc', label: 'RUC' },
    { key: 'telefono', label: 'Telefono' },
    { key: 'email', label: 'Correo' },
    { key: 'direccion', label: 'Direccion' },
  ],
  fields: [
    { key: 'nombre', label: 'Nombre', type: 'text', required: true, maxLength: 150 },
    { key: 'ruc', label: 'RUC', type: 'text', required: true, maxLength: 11, minLength: 11, pattern: '^\\d{11}$' },
    { key: 'telefono', label: 'Telefono', type: 'text', maxLength: 9, minLength: 9, pattern: '^\\d{9}$' },
    { key: 'email', label: 'Correo', type: 'email', maxLength: 150 },
    { key: 'direccion', label: 'Direccion', type: 'textarea', maxLength: 500 },
  ],
};
