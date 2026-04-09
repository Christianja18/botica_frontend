import { HttpErrorResponse } from '@angular/common/http';

export function resolveApiError(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const payload = error.error;

    if (typeof payload === 'string' && payload.trim()) {
      return payload;
    }
    if (payload?.message) {
      return String(payload.message);
    }
    if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
      return payload.errors.join(', ');
    }
    if (typeof payload?.error === 'string') {
      return payload.error;
    }
    if (error.status === 0) {
      return 'No se pudo conectar con el backend en http://localhost:8082.';
    }
    return `La operacion fallo con estado ${error.status}.`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Ocurrio un error inesperado al comunicarse con el backend.';
}
