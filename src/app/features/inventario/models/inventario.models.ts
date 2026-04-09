export interface InventarioDTO {
  idInventario?: number;
  idProducto: number;
  stockActual: number;
  stockMinimo: number;
  fechaActualizacion?: string | null;
}
