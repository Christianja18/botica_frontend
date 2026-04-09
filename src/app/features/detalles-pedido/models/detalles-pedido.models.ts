export interface DetallePedidoDTO {
  idDetalle?: number;
  idPedido?: number | null;
  idProducto: number;
  cantidad: number;
  precioUnitario: number;
  subtotal?: number | null;
}
