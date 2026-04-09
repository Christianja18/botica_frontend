import { ResourcePageConfig } from '../../shared/resource-crud/resource-page.types';

export const inventarioPageConfig: ResourcePageConfig = {
  key: 'inventario',
  idKey: 'idInventario',
  title: 'Inventario',
  description: 'Monitorea stock actual, stock minimo y trazabilidad de actualizacion por producto.',
  createLabel: 'registro de inventario',
  emptyState: 'Todavia no hay registros de inventario.',
  searchableFields: ['idProducto', 'stockActual', 'stockMinimo'],
  columns: [
    { key: 'idProducto', label: 'Producto', type: 'lookup', lookup: { resource: 'productos', labelKey: 'nombre', valueKey: 'idProducto' } },
    { key: 'stockActual', label: 'Stock actual' },
    { key: 'stockMinimo', label: 'Stock minimo' },
    { key: 'fechaActualizacion', label: 'Actualizado', type: 'datetime' },
  ],
  fields: [
    { key: 'idProducto', label: 'Producto', type: 'select', required: true, lookup: { resource: 'productos', labelKey: 'nombre', valueKey: 'idProducto' } },
    { key: 'stockActual', label: 'Stock actual', type: 'number', required: true, min: 0 },
    { key: 'stockMinimo', label: 'Stock minimo', type: 'number', required: true, min: 0 },
  ],
};
