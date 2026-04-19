import { ResourcePageConfig } from '../../shared/resource-crud/resource-page.types';

function proveedorLookupLabel(option: Record<string, unknown>): string {
  const nombre = String(option['nombre'] ?? 'Proveedor sin nombre');
  const ruc = String(option['ruc'] ?? '').trim();
  const telefono = String(option['telefono'] ?? '').trim();
  const email = String(option['email'] ?? '').trim();

  return [nombre, ruc || null, telefono || null, email || null].filter(Boolean).join(' · ');
}

const proveedorLookup = {
  resource: 'proveedores' as const,
  labelKey: 'nombre',
  valueKey: 'idProveedor',
  displayWith: proveedorLookupLabel,
};

export const productosPageConfig: ResourcePageConfig = {
  key: 'productos',
  idKey: 'idProducto',
  title: 'Productos',
  description: 'Gestiona medicamentos y productos de cuidado con categoria, proveedor y vencimiento.',
  createLabel: 'producto',
  emptyState: 'Todavía no hay productos en catálogo.',
  searchableFields: ['nombre', 'codigoBarras', 'descripcion'],
  pagination: {
    enabled: true,
    pageSize: 5,
    pageSizeOptions: [5, 10, 15, 20, 50],
    sortBy: 'idProducto',
    direction: 'asc',
  },
  importExport: {
    enabled: true,
    defaultFormat: 'csv',
    formats: ['csv', 'excel'],
  },
  columns: [
    { key: 'codigoBarras', label: 'Codigo' },
    { key: 'nombre', label: 'Producto' },
    { key: 'precioVenta', label: 'Venta', type: 'currency' },
    { key: 'precioCompra', label: 'Compra', type: 'currency' },
    { key: 'idCategoria', label: 'Categoria', type: 'lookup', lookup: { resource: 'categorias', labelKey: 'nombre', valueKey: 'idCategoria' } },
    {
      key: 'idProveedor',
      label: 'Proveedor',
      type: 'lookup',
      lookup: proveedorLookup,
      renderLines: (item, context) => {
        const proveedor = context.lookupOption(proveedorLookup, item['idProveedor']);
        const nombre = String(proveedor?.['nombre'] ?? 'Proveedor sin nombre');
        const ruc = String(proveedor?.['ruc'] ?? '').trim();
        const telefono = String(proveedor?.['telefono'] ?? '').trim();
        const email = String(proveedor?.['email'] ?? '').trim();

        return [
          nombre,
          [ruc || null, telefono || null].filter(Boolean).join(' · '),
          email || 'Sin correo',
        ].filter(Boolean);
      },
    },
    { key: 'requiereReceta', label: 'Receta', type: 'boolean' },
    { key: 'fechaVencimiento', label: 'Vencimiento', type: 'date' },
  ],
  fields: [
    { key: 'nombre', label: 'Nombre', type: 'text', required: true, maxLength: 200 },
    {
      key: 'codigoBarras',
      label: 'Codigo de barras',
      type: 'text',
      required: true,
      inputFilter: 'digits',
      minLength: 13,
      maxLength: 13,
      pattern: '^\\d{13}$',
      helpText: 'Ingresa solo numeros. Debe tener exactamente 13 digitos.',
    },
    {
      key: 'precioVenta',
      label: 'Precio de venta',
      type: 'currency',
      required: true,
      min: 0.01,
      integerDigits: 8,
      fractionDigits: 2,
      step: '0.01',
    },
    {
      key: 'precioCompra',
      label: 'Precio de compra',
      type: 'currency',
      required: true,
      min: 0.01,
      integerDigits: 8,
      fractionDigits: 2,
      step: '0.01',
    },
    { key: 'idCategoria', label: 'Categoria', type: 'select', required: true, lookup: { resource: 'categorias', labelKey: 'nombre', valueKey: 'idCategoria' } },
    {
      key: 'fechaVencimiento',
      label: 'Fecha de vencimiento',
      type: 'date',
      minDate: 'today',
      helpText: 'Elige una fecha de vencimiento valida.',
    },
    {
      key: 'idProveedor',
      label: 'Proveedor',
      type: 'select',
      required: true,
      lookup: proveedorLookup,
      pickerOnly: true,
      pickerMode: 'modal',
      pickerButtonLabel: 'Buscar proveedor',
      helpText: 'Selecciona el proveedor.',
    },
    { key: 'requiereReceta', label: 'Requiere receta', type: 'checkbox' },
    { key: 'descripcion', label: 'Descripcion', type: 'textarea', maxLength: 500 },
  ],
};
