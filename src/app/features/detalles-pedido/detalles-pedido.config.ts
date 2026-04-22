import { ResourcePageConfig } from '../../shared/resource-crud/resource-page.types';

function formatCurrency(value: unknown): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

function pedidoLookupLabel(option: Record<string, unknown>): string {
  const idPedido = option['idPedido'] ?? '-';
  const fechaPedido = String(option['fechaPedido'] ?? 'Sin fecha');
  const estado = String(option['estado'] ?? 'sin estado');
  const total = Number(option['total'] ?? 0);
  const cliente = option['cliente'] as Record<string, unknown> | undefined;
  const clienteNombre = [cliente?.['nombre'], cliente?.['apellido']].filter(Boolean).join(' ').trim();
  const totalLabel = new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(total);

  return [`Pedido #${idPedido}`, clienteNombre || null, fechaPedido, estado, totalLabel].filter(Boolean).join(' · ');
}

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

const pedidoLookup = {
  resource: 'pedidos' as const,
  labelKey: 'idPedido',
  valueKey: 'idPedido',
  displayWith: pedidoLookupLabel,
};

const productoLookup = {
  resource: 'productos' as const,
  labelKey: 'nombre',
  valueKey: 'idProducto',
  displayWith: productoLookupLabel,
};

export const detallesPedidoPageConfig: ResourcePageConfig = {
  key: 'detalles-pedido',
  idKey: 'idDetalle',
  title: 'Mantenimiento de detalles',
  description: 'Realiza ajustes puntuales en el detalle de los pedidos.',
  createLabel: 'ajuste puntual',
  emptyState: 'Todavía no hay ajustes de detalles registrados.',
  searchableFields: ['idPedido', 'idProducto'],
  pagination: {
    enabled: true,
    pageSize: 5,
    pageSizeOptions: [5, 10, 15, 20, 50],
    sortBy: 'idDetalle',
    direction: 'desc',
  },
  importExport: {
    enabled: true,
    defaultFormat: 'excel',
    formats: ['excel', 'csv'],
  },
  columns: [
    {
      key: 'idPedido',
      label: 'Pedido',
      type: 'lookup',
      lookup: pedidoLookup,
      renderLines: (item) => {
        const pedido = item['pedido'] as Record<string, unknown> | undefined;
        const idPedido = item['idPedido'] ?? pedido?.['idPedido'] ?? '-';
        const fechaPedido = String(pedido?.['fechaPedido'] ?? 'Sin fecha');
        const estado = String(pedido?.['estado'] ?? 'Sin estado');
        const total = pedido?.['total'] ?? 0;

        return [
          `Pedido #${idPedido} · ${fechaPedido}`,
          estado,
          formatCurrency(total),
        ];
      },
    },
    {
      key: 'idProducto',
      label: 'Producto',
      type: 'lookup',
      lookup: productoLookup,
      renderLines: (item) => {
        const producto = item['producto'] as Record<string, unknown> | undefined;
        const nombre = String(producto?.['nombre'] ?? 'Producto sin nombre');
        const codigoBarras = String(producto?.['codigoBarras'] ?? 'Sin codigo');
        const precioVenta = producto?.['precioVenta'] ?? item['precioUnitario'] ?? 0;

        return [
          nombre,
          codigoBarras,
          formatCurrency(precioVenta),
        ];
      },
    },
    { key: 'cantidad', label: 'Cantidad' },
    { key: 'precioUnitario', label: 'Precio', type: 'currency' },
    { key: 'subtotal', label: 'Subtotal', type: 'currency' },
  ],
  fields: [
    {
      key: 'idPedido',
      label: 'Pedido',
      type: 'select',
      required: true,
      lookup: pedidoLookup,
      pickerOnly: true,
      pickerMode: 'modal',
      pickerButtonLabel: 'Buscar pedido',
      helpText: 'Selecciona el pedido.',
    },
    {
      key: 'idProducto',
      label: 'Producto',
      type: 'select',
      required: true,
      lookup: productoLookup,
      pickerOnly: true,
      pickerMode: 'modal',
      pickerButtonLabel: 'Buscar producto',
      helpText: 'Selecciona el producto.',
    },
    { key: 'cantidad', label: 'Cantidad', type: 'number', required: true, min: 1 },
    {
      key: 'precioUnitario',
      label: 'Precio unitario',
      type: 'currency',
      required: true,
      min: 0.01,
      integerDigits: 8,
      fractionDigits: 2,
      step: '0.01',
    },
  ],
};
