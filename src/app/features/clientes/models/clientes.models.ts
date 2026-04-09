export interface ClienteDTO {
  idCliente?: number;
  nombre: string;
  apellido: string;
  dni?: string | null;
  telefono?: string | null;
  email?: string | null;
  fechaCreacion?: string | null;
}
