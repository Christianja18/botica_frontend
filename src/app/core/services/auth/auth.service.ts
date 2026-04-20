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
    const token = this.activeToken();
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

    this.clearSession();
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

  activeToken(): string | null {
    const session = this.sessionSignal();
    if (!session) {
      return null;
    }

    if (this.isExpired(session.expiresAt)) {
      this.clearSession();
      return null;
    }

    return session.token || null;
  }

  clearSession(): void {
    this.sessionSignal.set(null);
    this.storage.removeItem(appSettings.authStorageKey);
  }

  private hydrateSession(): AuthSession | null {
    const raw = this.storage.getItem(appSettings.authStorageKey);
    if (!raw) {
      return null;
    }

    try {
      const session = JSON.parse(raw) as AuthSession;
      if (this.isExpired(session.expiresAt)) {
        this.storage.removeItem(appSettings.authStorageKey);
        return null;
      }
      return session;
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

  private isExpired(expiresAt: string | null | undefined): boolean {
    if (!expiresAt) {
      return true;
    }

    const match = expiresAt.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/);
    if (!match) {
      return true;
    }

    const [, day, month, year, hour, minute] = match;
    const expirationDate = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      0,
      0,
    );

    return Number.isNaN(expirationDate.getTime()) || expirationDate.getTime() <= Date.now();
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
