import { ResourcePageConfig } from '../../shared/resource-crud/resource-page.types';

function productoLookupLabel(option: Record<string, unknown>): string {
  const nombre = String(option['nombre'] ?? 'Producto sin nombre');
  const codigoBarras = String(option['codigoBarras'] ?? '').trim();
  const precioVenta = Number(option['precioVenta'] ?? 0);
  const precioLabel = new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(precioVenta);

  return [nombre, codigoBarras || null, precioLabel].filter(Boolean).join(' · ');
}

const productoLookup = {
  resource: 'productos' as const,
  labelKey: 'nombre',
  valueKey: 'idProducto',
  displayWith: productoLookupLabel,
};

export const inventarioPageConfig: ResourcePageConfig = {
  key: 'inventario',
  idKey: 'idInventario',
  title: 'Inventario',
  description: 'Monitorea stock actual, stock minimo y trazabilidad de actualizacion por producto.',
  createLabel: 'registro de inventario',
  emptyState: 'Todavia no hay registros de inventario.',
  searchableFields: ['idProducto', 'stockActual', 'stockMinimo'],
  columns: [
    { key: 'idProducto', label: 'Producto', type: 'lookup', lookup: productoLookup },
    { key: 'stockActual', label: 'Stock actual' },
    { key: 'stockMinimo', label: 'Stock minimo' },
  ],
  fields: [
    {
      key: 'idProducto',
      label: 'Producto',
      type: 'select',
      required: true,
      lookup: productoLookup,
      pickerOnly: true,
      pickerMode: 'modal',
      pickerButtonLabel: 'Buscar producto',
      helpText: 'Selecciona el producto desde una ventana asistida sin salir del formulario.',
    },
    { key: 'stockActual', label: 'Stock actual', type: 'number', required: true, min: 0 },
    { key: 'stockMinimo', label: 'Stock minimo', type: 'number', required: true, min: 0 },
  ],
};
