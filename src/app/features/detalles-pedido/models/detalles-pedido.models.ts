export interface DetallePedidoClienteResumenDTO {
  idCliente?: number | null;
  nombre?: string | null;
  apellido?: string | null;
  dni?: string | null;
  telefono?: string | null;
  email?: string | null;
}

export interface DetallePedidoUsuarioResumenDTO {
  idUsuario?: number | null;
  nombre?: string | null;
  apellido?: string | null;
  email?: string | null;
}

export interface DetallePedidoPedidoResumenDTO {
  idPedido?: number | null;
  fechaPedido?: string | null;
  total?: number | null;
  estado?: string | null;
  cliente?: DetallePedidoClienteResumenDTO | null;
  usuario?: DetallePedidoUsuarioResumenDTO | null;
}

export interface DetallePedidoProductoResumenDTO {
  idProducto?: number | null;
  nombre?: string | null;
  codigoBarras?: string | null;
  descripcion?: string | null;
  precioVenta?: number | null;
  requiereReceta?: boolean | null;
  fechaVencimiento?: string | null;
}

export interface DetallePedidoDTO {
  idDetalle?: number;
  idPedido?: number | null;
  pedido?: DetallePedidoPedidoResumenDTO | null;
  idProducto: number;
  producto?: DetallePedidoProductoResumenDTO | null;
  cantidad: number;
  precioUnitario: number;
  subtotal?: number | null;
}
