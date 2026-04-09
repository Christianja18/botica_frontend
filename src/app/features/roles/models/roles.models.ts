import { RolePermissions } from '../../../core/models/shared/permissions.models';

export interface RolDTO extends RolePermissions {
  idRol?: number;
  nombre: string;
  descripcion?: string | null;
  activo: boolean;
  fechaCreacion?: string | null;
}
