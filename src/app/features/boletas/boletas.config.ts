import { ResourceCreateValueContext, ResourcePageConfig } from '../../shared/resource-crud/resource-page.types';

function formatCurrency(value: unknown): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

function nextBoletaNumber({ items }: ResourceCreateValueContext): string {
  const lastNumber = items.reduce((max, item) => {
    const current = String(item['numeroBoleta'] ?? '').trim();
    const match = current.match(/^B001-(\d{1,6})$/i);
    if (!match) {
      return max;
    }

    return Math.max(max, Number(match[1] ?? 0));
  }, 0);

  return `B001-${String(lastNumber + 1).padStart(6, '0')}`;
}

function pedidoLookupLabel(option: Record<string, unknown>): string {
  const idPedido = option['idPedido'] ?? '-';
  const fechaPedido = String(option['fechaPedido'] ?? 'Sin fecha');
  const estado = String(option['estado'] ?? 'sin estado');
  const total = Number(option['total'] ?? 0);
  const cliente = option['cliente'] as Record<string, unknown> | undefined;
  const clienteNombre = [cliente?.['nombre'], cliente?.['apellido']].filter(Boolean).join(' ').trim();
  const totalLabel = formatCurrency(total);

  return [`Pedido #${idPedido}`, clienteNombre || null, fechaPedido, estado, totalLabel].filter(Boolean).join(' · ');
}

const pedidoLookup = {
  resource: 'pedidos' as const,
  labelKey: 'idPedido',
  valueKey: 'idPedido',
  displayWith: pedidoLookupLabel,
};

export const boletasPageConfig: ResourcePageConfig = {
  key: 'boletas',
  idKey: 'idBoleta',
  title: 'Boletas',
  description: 'Administra comprobantes vinculados a pedidos y controla su impresion.',
  createLabel: 'boleta',
  emptyState: 'Todavía no hay boletas registradas.',
  searchableFields: ['numeroBoleta', 'idPedido', 'datosCliente', 'datosEmpleado'],
  pagination: {
    enabled: true,
    pageSize: 5,
    pageSizeOptions: [5, 10, 15, 20, 50],
    sortBy: 'idBoleta',
    direction: 'desc',
  },
  importExport: {
    enabled: true,
    defaultFormat: 'excel',
    formats: ['excel', 'csv'],
  },
  columns: [
    { key: 'numeroBoleta', label: 'Numero' },
    {
      key: 'idPedido',
      label: 'Pedido',
      type: 'lookup',
      lookup: pedidoLookup,
      renderLines: (item, context) => {
        const pedido = context.lookupOption(pedidoLookup, item['idPedido']);
        const idPedido = item['idPedido'] ?? pedido?.['idPedido'] ?? '-';
        const cliente = pedido?.['cliente'] as Record<string, unknown> | undefined;
        const clienteNombre = [cliente?.['nombre'], cliente?.['apellido']].filter(Boolean).join(' ').trim();
        const fechaPedido = String(pedido?.['fechaPedido'] ?? 'Sin fecha');
        const estado = String(pedido?.['estado'] ?? 'Sin estado');
        const total = pedido?.['total'] ?? 0;

        return [
          [`Pedido #${idPedido}`, clienteNombre || null].filter(Boolean).join(' · '),
          fechaPedido,
          estado,
          formatCurrency(total),
        ];
      },
    },
    { key: 'total', label: 'Total', type: 'currency' },
    { key: 'igv', label: 'IGV', type: 'currency' },
    { key: 'totalConIgv', label: 'Total + IGV', type: 'currency' },
    { key: 'impresa', label: 'Impresa', type: 'boolean' },
    { key: 'fechaEmision', label: 'Emision', type: 'datetime' },
  ],
  fields: [
    {
      key: 'numeroBoleta',
      label: 'Numero de boleta',
      type: 'text',
      required: true,
      maxLength: 20,
      readonly: true,
      createValue: nextBoletaNumber,
      helpText: 'Se genera automaticamente.',
    },
    {
      key: 'idPedido',
      label: 'Pedido',
      type: 'select',
      required: true,
      lookup: pedidoLookup,
      pickerOnly: true,
      pickerMode: 'modal',
      pickerButtonLabel: 'Buscar pedido',
      selectionQueryParam: 'pedidoSeleccionado',
      helpText: 'Selecciona un pedido que todavia no tenga boleta registrada.',
      usedValues: {
        resource: 'boletas',
        valueKey: 'idPedido',
        hideUsedOnCreate: true,
      },
    },
    { key: 'total', label: 'Total', type: 'currency', hiddenInForm: true },
    { key: 'igv', label: 'IGV', type: 'currency', min: 0, integerDigits: 8, fractionDigits: 2, step: '0.01' },
    { key: 'datosCliente', label: 'Datos cliente', type: 'textarea', hiddenInForm: true },
    { key: 'datosEmpleado', label: 'Datos empleado', type: 'textarea', hiddenInForm: true },
    { key: 'impresa', label: 'Impresa', type: 'checkbox' },
  ],
};
