import { HttpErrorResponse } from '@angular/common/http';

export function resolveApiError(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const payload = error.error;
    let message = '';

    if (typeof payload === 'string' && payload.trim()) {
      message = payload;
    } else if (payload?.message) {
      message = String(payload.message);
    } else if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
      message = payload.errors.join(', ');
    } else if (typeof payload?.error === 'string') {
      message = payload.error;
    }

    if (message.trim()) {
      return mapFriendlyApiError(message);
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

function mapFriendlyApiError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes('pedido completado') && normalized.includes('detalle')) {
    return 'No se puede completar un pedido sin detalles.';
  }

  if (normalized.includes('stock') && normalized.includes('insuficiente')) {
    return 'Stock insuficiente.';
  }

  if (normalized.includes('vencid')) {
    return 'No se puede agregar un producto vencido.';
  }

  if (normalized.includes('cantidad valida')) {
    return 'Cada producto debe tener una cantidad valida.';
  }

  return message;
}
