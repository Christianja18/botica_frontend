import { HttpClient, HttpHeaders } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { map, Observable, tap } from 'rxjs';

import { appSettings } from '../../config/app.settings';
import { AuthApiResponse, AuthSession, LoginCredentials, PermissionKey, SessionUser } from '../../models';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly storage = inject(StorageService);
  private readonly sessionSignal = signal<AuthSession | null>(this.hydrateSession());

  readonly session = computed(() => this.sessionSignal());
  readonly user = computed(() => this.sessionSignal()?.user ?? null);
  readonly isAuthenticated = computed(() => this.sessionSignal() !== null);
  readonly developmentCredentials = appSettings.developmentCredentials;

  login(credentials: LoginCredentials): Observable<SessionUser> {
    return this.http
      .post<AuthApiResponse>(`${appSettings.apiBaseUrl}/auth/login`, credentials)
      .pipe(
        map((response) => this.mapSession(response)),
        tap((session) => this.persistSession(session)),
        map((session) => session.user),
      );
  }

  logout(): void {
    const token = this.sessionSignal()?.token;
    if (token) {
      this.http
        .post(
          `${appSettings.apiBaseUrl}/auth/logout`,
          {},
          {
            headers: new HttpHeaders({
              Authorization: `Bearer ${token}`,
            }),
          },
        )
        .subscribe({
          next: () => undefined,
          error: () => undefined,
        });
    }

    this.sessionSignal.set(null);
    this.storage.removeItem(appSettings.authStorageKey);
  }

  hasPermission(permission?: PermissionKey): boolean {
    if (!permission) {
      return this.isAuthenticated();
    }

    return !!this.sessionSignal()?.user.permissions[permission];
  }

  preferredRoute(): string {
    const permissions = this.sessionSignal()?.user.permissions;
    if (!permissions) {
      return '/login';
    }

    const enabled = (Object.entries(permissions) as Array<[PermissionKey, boolean]>)
      .filter(([, allowed]) => allowed)
      .map(([permission]) => permission);

    if (enabled.length !== 1) {
      return '/dashboard';
    }

    switch (enabled[0]) {
      case 'puedeVender':
        return '/pedidos';
      case 'puedeAdministrarInventario':
        return '/inventario';
      case 'puedeVerReportes':
        return '/reportes';
      case 'puedeAdministrarUsuarios':
        return '/usuarios';
      default:
        return '/dashboard';
    }
  }

  private hydrateSession(): AuthSession | null {
    const raw = this.storage.getItem(appSettings.authStorageKey);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as AuthSession;
    } catch {
      this.storage.removeItem(appSettings.authStorageKey);
      return null;
    }
  }

  private persistSession(session: AuthSession): void {
    this.sessionSignal.set(session);
    this.storage.setItem(appSettings.authStorageKey, JSON.stringify(session));
  }

  private mapSession(response: AuthApiResponse): AuthSession {
    return {
      token: response.token,
      tokenType: response.tokenType,
      expiresAt: response.expiresAt,
      user: {
        id: response.usuario.idUsuario,
        nombre: response.usuario.nombre,
        apellido: response.usuario.apellido,
        nombreCompleto: response.usuario.nombreCompleto,
        email: response.usuario.email,
        activo: response.usuario.activo,
        idRol: response.usuario.idRol,
        rolNombre: response.usuario.rolNombre,
        permissions: {
          puedeVender: response.usuario.puedeVender,
          puedeAdministrarInventario: response.usuario.puedeAdministrarInventario,
          puedeVerReportes: response.usuario.puedeVerReportes,
          puedeAdministrarUsuarios: response.usuario.puedeAdministrarUsuarios,
        },
      },
    };
  }
}

@Injectable({
  providedIn: 'root',
})
class StorageService {
  getItem(key: string): string | null {
    return sessionStorage.getItem(key);
  }

  setItem(key: string, value: string): void {
    sessionStorage.setItem(key, value);
  }

  removeItem(key: string): void {
    sessionStorage.removeItem(key);
  }
}
