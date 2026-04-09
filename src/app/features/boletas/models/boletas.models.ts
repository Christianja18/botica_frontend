export interface BoletaPedidoClienteDTO {
  idCliente?: number | null;
  nombre?: string | null;
  apellido?: string | null;
  dni?: string | null;
  telefono?: string | null;
  email?: string | null;
}

export interface BoletaPedidoUsuarioDTO {
  idUsuario?: number | null;
  nombre?: string | null;
  apellido?: string | null;
  email?: string | null;
}

export interface BoletaPedidoProductoDTO {
  idProducto?: number | null;
  nombre?: string | null;
  codigoBarras?: string | null;
  descripcion?: string | null;
  precioVenta?: number | null;
  requiereReceta?: boolean | null;
  fechaVencimiento?: string | null;
}

export interface BoletaPedidoDetalleDTO {
  idDetalle?: number | null;
  cantidad?: number | null;
  precioUnitario?: number | null;
  subtotal?: number | null;
  producto?: BoletaPedidoProductoDTO | null;
}

export interface BoletaPedidoDTO {
  idPedido?: number | null;
  fechaPedido?: string | null;
  total?: number | null;
  estado?: string | null;
  cliente?: BoletaPedidoClienteDTO | null;
  usuario?: BoletaPedidoUsuarioDTO | null;
  detalles?: BoletaPedidoDetalleDTO[] | null;
}

export interface BoletaDTO {
  idBoleta?: number;
  numeroBoleta: string;
  idPedido: number;
  pedido?: BoletaPedidoDTO | null;
  fechaEmision?: string | null;
  total?: number | null;
  igv?: number | null;
  totalConIgv?: number | null;
  datosCliente?: string | null;
  datosEmpleado?: string | null;
  impresa: boolean;
}
