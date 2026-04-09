import { ResourcePageConfig } from '../../shared/resource-crud/resource-page.types';

function pedidoLookupLabel(option: Record<string, unknown>): string {
  const idPedido = option['idPedido'] ?? '-';
  const fechaPedido = String(option['fechaPedido'] ?? 'Sin fecha');
  const estado = String(option['estado'] ?? 'sin estado');
  const total = Number(option['total'] ?? 0);
  const totalLabel = new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(total);

  return `Pedido #${idPedido} · ${fechaPedido} · ${estado} · ${totalLabel}`;
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
  emptyState: 'Todavia no hay boletas registradas.',
  searchableFields: ['numeroBoleta', 'idPedido', 'datosCliente', 'datosEmpleado'],
  columns: [
    { key: 'numeroBoleta', label: 'Numero' },
    { key: 'idPedido', label: 'Pedido', type: 'lookup', lookup: pedidoLookup },
    { key: 'total', label: 'Total', type: 'currency' },
    { key: 'igv', label: 'IGV', type: 'currency' },
    { key: 'totalConIgv', label: 'Total + IGV', type: 'currency' },
    { key: 'impresa', label: 'Impresa', type: 'boolean' },
    { key: 'fechaEmision', label: 'Emision', type: 'datetime' },
  ],
  fields: [
    { key: 'numeroBoleta', label: 'Numero de boleta', type: 'text', required: true, maxLength: 20 },
    {
      key: 'idPedido',
      label: 'Pedido',
      type: 'select',
      required: true,
      lookup: pedidoLookup,
      pickerOnly: true,
      pickerRoute: '/pedidos',
      pickerButtonLabel: 'Buscar pedido en historial',
      pickerQueryParams: { selector: 'boleta' },
      selectionQueryParam: 'pedidoSeleccionado',
      helpText: 'Selecciona el pedido o abre el historial para elegir uno y volver con la boleta preparada.',
    },
    { key: 'total', label: 'Total', type: 'currency', hiddenInForm: true },
    { key: 'igv', label: 'IGV', type: 'currency', min: 0, integerDigits: 8, fractionDigits: 2, step: '0.01' },
    { key: 'datosCliente', label: 'Datos cliente', type: 'textarea', hiddenInForm: true },
    { key: 'datosEmpleado', label: 'Datos empleado', type: 'textarea', hiddenInForm: true },
    { key: 'impresa', label: 'Impresa', type: 'checkbox' },
  ],
};
