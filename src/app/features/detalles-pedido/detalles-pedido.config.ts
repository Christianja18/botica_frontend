import { ResourcePageConfig } from '../../shared/resource-crud/resource-page.types';

export const detallesPedidoPageConfig: ResourcePageConfig = {
  key: 'detalles-pedido',
  idKey: 'idDetalle',
  title: 'Detalles de pedido',
  description: 'Modulo tecnico para auditar o ajustar items individuales vinculados a pedidos.',
  createLabel: 'detalle',
  emptyState: 'Todavia no hay detalles de pedidos.',
  searchableFields: ['idPedido', 'idProducto'],
  columns: [
    { key: 'idPedido', label: 'Pedido', type: 'lookup', lookup: { resource: 'pedidos', labelKey: 'idPedido', valueKey: 'idPedido' } },
    { key: 'idProducto', label: 'Producto', type: 'lookup', lookup: { resource: 'productos', labelKey: 'nombre', valueKey: 'idProducto' } },
    { key: 'cantidad', label: 'Cantidad' },
    { key: 'precioUnitario', label: 'Precio', type: 'currency' },
    { key: 'subtotal', label: 'Subtotal', type: 'currency' },
  ],
  fields: [
    { key: 'idPedido', label: 'Pedido', type: 'select', required: true, lookup: { resource: 'pedidos', labelKey: 'idPedido', valueKey: 'idPedido' } },
    { key: 'idProducto', label: 'Producto', type: 'select', required: true, lookup: { resource: 'productos', labelKey: 'nombre', valueKey: 'idProducto' } },
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
