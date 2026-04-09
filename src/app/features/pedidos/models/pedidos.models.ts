import { DetallePedidoDTO } from '../../detalles-pedido/models';

export type PedidoEstado = 'pendiente' | 'completado' | 'cancelado';

export interface PedidoDTO {
  idPedido?: number;
  idCliente?: number | null;
  idUsuario: number;
  fechaPedido?: string | null;
  total?: number;
  estado: PedidoEstado;
  detalles?: DetallePedidoDTO[];
}
