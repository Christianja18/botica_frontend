export interface UsuarioDTO {
  idUsuario?: number;
  nombre: string;
  apellido: string;
  email: string;
  passwordHash?: string | null;
  activo: boolean;
  idRol: number;
  fechaCreacion?: string | null;
}
