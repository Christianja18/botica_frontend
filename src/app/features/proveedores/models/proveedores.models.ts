export interface ProveedorDTO {
  idProveedor?: number;
  nombre: string;
  ruc: string;
  telefono?: string | null;
  email?: string | null;
  direccion?: string | null;
  fechaCreacion?: string | null;
}
