import { ResourcePageConfig } from '../../shared/resource-crud/resource-page.types';

function formatCurrency(value: unknown): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

function productoLookupLabel(option: Record<string, unknown>): string {
  const nombre = String(option['nombre'] ?? 'Producto sin nombre');
  const codigoBarras = String(option['codigoBarras'] ?? '').trim();
  const precioVenta = Number(option['precioVenta'] ?? 0);
  const precioLabel = formatCurrency(precioVenta);

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
  description: 'Consulta y actualiza el stock de cada producto.',
  createLabel: 'registro de inventario',
  emptyState: 'Todavía no hay registros de inventario.',
  searchableFields: ['idProducto', 'stockActual', 'stockMinimo'],
  pagination: {
    enabled: true,
    pageSize: 5,
    pageSizeOptions: [5, 10, 15, 20, 50],
    sortBy: 'idInventario',
    direction: 'asc',
  },
  importExport: {
    enabled: true,
    defaultFormat: 'excel',
    formats: ['excel', 'csv'],
  },
  columns: [
    {
      key: 'idProducto',
      label: 'Producto',
      type: 'lookup',
      lookup: productoLookup,
      renderLines: (item, context) => {
        const producto = context.lookupOption(productoLookup, item['idProducto']);
        const nombre = String(producto?.['nombre'] ?? 'Producto sin nombre');
        const codigoBarras = String(producto?.['codigoBarras'] ?? 'Sin codigo');
        const precioVenta = producto?.['precioVenta'] ?? 0;

        return [
          nombre,
          codigoBarras,
          formatCurrency(precioVenta),
        ];
      },
    },
    { key: 'stockActual', label: 'Stock actual' },
    { key: 'stockMinimo', label: 'Stock mínimo' },
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
      helpText: 'Selecciona un producto que todavia no tenga inventario registrado.',
      usedValues: {
        resource: 'inventario',
        valueKey: 'idProducto',
        hideUsedOnCreate: true,
      },
    },
    { key: 'stockActual', label: 'Stock actual', type: 'number', required: true, min: 0 },
    { key: 'stockMinimo', label: 'Stock mínimo', type: 'number', required: true, min: 0 },
  ],
};
