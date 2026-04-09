import { ResourcePageConfig } from '../../shared/resource-crud/resource-page.types';

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
    { key: 'idPedido', label: 'Pedido', type: 'lookup', lookup: { resource: 'pedidos', labelKey: 'idPedido', valueKey: 'idPedido' } },
    { key: 'total', label: 'Total', type: 'currency' },
    { key: 'igv', label: 'IGV', type: 'currency' },
    { key: 'totalConIgv', label: 'Total + IGV', type: 'currency' },
    { key: 'impresa', label: 'Impresa', type: 'boolean' },
    { key: 'fechaEmision', label: 'Emision', type: 'datetime' },
  ],
  fields: [
    { key: 'numeroBoleta', label: 'Numero de boleta', type: 'text', required: true, maxLength: 20 },
    { key: 'idPedido', label: 'Pedido', type: 'select', required: true, lookup: { resource: 'pedidos', labelKey: 'idPedido', valueKey: 'idPedido' } },
    { key: 'total', label: 'Total', type: 'currency', hiddenInForm: true },
    { key: 'igv', label: 'IGV', type: 'currency', min: 0, integerDigits: 8, fractionDigits: 2, step: '0.01' },
    { key: 'datosCliente', label: 'Datos cliente', type: 'textarea' },
    { key: 'datosEmpleado', label: 'Datos empleado', type: 'textarea' },
    { key: 'impresa', label: 'Impresa', type: 'checkbox' },
  ],
};
