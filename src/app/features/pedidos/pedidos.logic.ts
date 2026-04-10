import { DetallePedidoDTO } from '../detalles-pedido/models';
import { InventarioDTO } from '../inventario/models';
import { ProductoDTO } from '../productos/models';
import { ClienteDTO } from '../clientes/models';
import { UsuarioDTO } from '../usuarios/models';
import { PedidoDTO } from './models';

export function findProduct(productos: ProductoDTO[], productId: number | null | undefined): ProductoDTO | undefined {
  if (!productId) {
    return undefined;
  }

  return productos.find((item) => item.idProducto === productId);
}

export function findInventory(inventario: InventarioDTO[], productId: number | null | undefined): InventarioDTO | undefined {
  if (!productId) {
    return undefined;
  }

  return inventario.find((item) => item.idProducto === productId);
}

export function buildClientLabel(clientes: ClienteDTO[], idCliente: number | null | undefined): string {
  if (!idCliente) return 'Venta sin cliente';
  const client = clientes.find((item) => item.idCliente === idCliente);
  return client ? `${client.nombre} ${client.apellido}` : `Cliente #${idCliente}`;
}

export function buildOrderClientLabel(clientes: ClienteDTO[], order: PedidoDTO): string {
  const summary = order.cliente;
  const summaryName = [summary?.nombre, summary?.apellido].filter(Boolean).join(' ').trim();
  return summaryName || buildClientLabel(clientes, order.idCliente);
}

export function buildUserLabel(usuarios: UsuarioDTO[], idUsuario: number | null | undefined): string {
  const user = usuarios.find((item) => item.idUsuario === idUsuario);
  return user ? `${user.nombre} ${user.apellido}` : `Usuario #${idUsuario}`;
}

export function buildOrderUserLabel(usuarios: UsuarioDTO[], order: PedidoDTO): string {
  const summary = order.usuario;
  const summaryName = [summary?.nombre, summary?.apellido].filter(Boolean).join(' ').trim();
  return summaryName || buildUserLabel(usuarios, order.idUsuario);
}

export function buildProductLabel(productos: ProductoDTO[], idProducto: number | null | undefined): string {
  const product = productos.find((item) => item.idProducto === idProducto);
  return product ? product.nombre : `Producto #${idProducto}`;
}

export function buildOrderDetailProductLabel(productos: ProductoDTO[], detail: DetallePedidoDTO): string {
  const summaryName = detail.producto?.nombre?.trim();
  return summaryName || buildProductLabel(productos, detail.idProducto);
}

export function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function todayAtMidnight(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export function isProductExpired(product: ProductoDTO | null | undefined, today: Date): boolean {
  const expirationDate = parseDateOnly(product?.fechaVencimiento);
  if (!expirationDate) {
    return false;
  }

  return expirationDate.getTime() < today.getTime();
}

export function daysUntilExpiration(product: ProductoDTO | null | undefined, today: Date): number | null {
  const expirationDate = parseDateOnly(product?.fechaVencimiento);
  if (!expirationDate) {
    return null;
  }

  return Math.floor((expirationDate.getTime() - today.getTime()) / 86400000);
}

export function isProductExpiringSoon(product: ProductoDTO | null | undefined, today: Date): boolean {
  const days = daysUntilExpiration(product, today);
  return days !== null && days >= 0 && days <= 30;
}

export interface DetailQuantityLike {
  idProducto?: number | null;
  cantidad?: number | null;
}

export function totalQuantityForProduct(
  details: DetailQuantityLike[],
  productId: number,
  quantitySelector: (detail: DetailQuantityLike) => number = (detail) => Number(detail.cantidad ?? 0),
): number {
  return details.reduce((sum, detail) => {
    return Number(detail.idProducto) === productId ? sum + quantitySelector(detail) : sum;
  }, 0);
}
