import { RolePermissions } from '../shared/permissions.models';

export interface SessionUser {
  id: number;
  nombre: string;
  apellido: string;
  nombreCompleto: string;
  email: string;
  activo: boolean;
  idRol: number;
  rolNombre: string;
  permissions: RolePermissions;
}

export interface AuthSession {
  token: string;
  tokenType: string;
  expiresAt: string;
  user: SessionUser;
}

export interface AuthApiResponse {
  token: string;
  tokenType: string;
  expiresAt: string;
  usuario: {
    idUsuario: number;
    nombre: string;
    apellido: string;
    nombreCompleto: string;
    email: string;
    activo: boolean;
    idRol: number;
    rolNombre: string;
    puedeVender: boolean;
    puedeAdministrarInventario: boolean;
    puedeVerReportes: boolean;
    puedeAdministrarUsuarios: boolean;
  };
}

export interface DevelopmentCredential {
  rolNombre: string;
  email: string;
  password: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}
