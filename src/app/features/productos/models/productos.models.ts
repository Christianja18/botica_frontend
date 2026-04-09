export interface ProductoDTO {
  idProducto?: number;
  nombre: string;
  codigoBarras: string;
  descripcion?: string | null;
  precioVenta: number;
  precioCompra: number;
  idCategoria: number;
  idProveedor: number;
  requiereReceta: boolean;
  fechaVencimiento?: string | null;
  fechaCreacion?: string | null;
}
