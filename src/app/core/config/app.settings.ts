import { DevelopmentCredential } from '../models';

export const appSettings = {
  appName: 'Josue Farma',
  appTagline: 'Gestión comercial, inventario y reportes para farmacia',
  apiBaseUrl: 'http://localhost:8082/api',
  authStorageKey: 'botica-horizonte-auth',
  developmentCredentials: [
    {
      rolNombre: 'Administrador',
      email: 'maria.perez@botica.com',
      password: 'Botica2026!',
    },
    {
      rolNombre: 'Vendedor',
      email: 'juan.lopez@botica.com',
      password: 'Botica2026!',
    },
    {
      rolNombre: 'Inventario',
      email: 'ana.suarez@botica.com',
      password: 'Botica2026!',
    },
    {
      rolNombre: 'Reportes',
      email: 'luis.castro@botica.com',
      password: 'Botica2026!',
    },
  ] satisfies DevelopmentCredential[],
} as const;
