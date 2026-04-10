import { DetallePedidoDTO } from '../../detalles-pedido/models';

export type PedidoEstado = 'pendiente' | 'completado' | 'cancelado';

export interface PedidoClienteResumenDTO {
  idCliente?: number | null;
  nombre?: string | null;
  apellido?: string | null;
  dni?: string | null;
  telefono?: string | null;
  email?: string | null;
}

export interface PedidoUsuarioResumenDTO {
  idUsuario?: number | null;
  nombre?: string | null;
  apellido?: string | null;
  email?: string | null;
}

export interface PedidoDTO {
  idPedido?: number;
  idCliente?: number | null;
  cliente?: PedidoClienteResumenDTO | null;
  idUsuario: number;
  usuario?: PedidoUsuarioResumenDTO | null;
  fechaPedido?: string | null;
  total?: number;
  estado: PedidoEstado;
  detalles?: DetallePedidoDTO[];
}
