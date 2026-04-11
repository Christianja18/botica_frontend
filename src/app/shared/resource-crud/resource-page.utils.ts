import { AbstractControl, ValidatorFn, Validators } from '@angular/forms';

import {
  decimalPrecisionValidator,
  isTextLikeField,
  maxIsoDateValidator,
  minIsoDateValidator,
  notBlankTrimmedValidator,
  trimTextValue,
} from '../../core/validators';
import { LookupConfig, ResourceColumnConfig, ResourceFieldConfig } from './resource-page.types';

export function buildResourceFieldValidators(
  field: ResourceFieldConfig,
  isEditing: boolean,
  todayIso: string,
): ValidatorFn[] {
  const validators: ValidatorFn[] = [];
  const required =
    field.required ||
    (field.requiredOnCreate && !isEditing) ||
    (field.requiredOnEdit && isEditing);

  if (required && field.type !== 'checkbox') {
    validators.push(Validators.required);
    if (isTextLikeField(field.type)) {
      validators.push(notBlankTrimmedValidator());
    }
  }
  if (field.type === 'email') validators.push(Validators.email);
  if (field.minLength !== undefined) validators.push(Validators.minLength(field.minLength));
  if (field.maxLength !== undefined) validators.push(Validators.maxLength(field.maxLength));
  if (field.min !== undefined) validators.push(Validators.min(field.min));
  if (field.integerDigits !== undefined && field.fractionDigits !== undefined) {
    validators.push(decimalPrecisionValidator(field.integerDigits, field.fractionDigits));
  }

  const minDate = resolveResourceDateBound(field.minDate, todayIso);
  const maxDate = resolveResourceDateBound(field.maxDate, todayIso);
  if (field.type === 'date' && minDate) {
    validators.push(minIsoDateValidator(minDate));
  }
  if (field.type === 'date' && maxDate) {
    validators.push(maxIsoDateValidator(maxDate));
  }
  if (field.pattern) validators.push(Validators.pattern(field.pattern));

  return validators;
}

export function fieldErrorMessage(field: ResourceFieldConfig, control: AbstractControl | null | undefined): string {
  if (!control?.errors) {
    return `Revisa el campo ${field.label.toLowerCase()}.`;
  }

  if (control.hasError('required')) {
    return `El campo ${field.label.toLowerCase()} es obligatorio.`;
  }

  if (control.hasError('email')) {
    return 'Usa la estructura usuario@organizacion.dominio.';
  }

  if (control.hasError('minlength')) {
    const error = control.getError('minlength') as { requiredLength: number; actualLength: number };
    const missing = Math.max(0, error.requiredLength - error.actualLength);
    if (field.minLength === field.maxLength) {
      return missing > 0
        ? `Faltan ${missing} caracteres. Debe tener exactamente ${field.minLength} caracteres.`
        : `Debe tener exactamente ${field.minLength} caracteres.`;
    }

    return missing > 0
      ? `Faltan ${missing} caracteres. Debe tener al menos ${field.minLength} caracteres.`
      : `Debe tener al menos ${field.minLength} caracteres.`;
  }

  if (control.hasError('maxlength')) {
    return `Solo admite ${field.maxLength} caracteres.`;
  }

  if (control.hasError('pattern')) {
    if (field.type === 'email') {
      return 'Usa la estructura usuario@organizacion.dominio.';
    }

    return `El formato de ${field.label.toLowerCase()} no es valido.`;
  }

  if (control.hasError('min')) {
    return `El valor minimo para ${field.label.toLowerCase()} es ${field.min}.`;
  }

  if (control.hasError('maxIsoDate')) {
    return `La fecha maxima permitida para ${field.label.toLowerCase()} ya fue superada.`;
  }

  if (control.hasError('minIsoDate')) {
    return `La fecha minima permitida para ${field.label.toLowerCase()} no se cumple.`;
  }

  return `Revisa el campo ${field.label.toLowerCase()}.`;
}

export function resolveResourceDateBound(value: string | 'today' | undefined, todayIso: string): string | null {
  if (!value) {
    return null;
  }

  return value === 'today' ? todayIso : value;
}

export function formatResourceValue(
  item: Record<string, unknown>,
  column: ResourceColumnConfig,
  lookupLabel: (lookup: LookupConfig | undefined, value: unknown) => string,
): string {
  const value = item[column.key];
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  if (column.type === 'boolean') {
    return value ? 'Si' : 'No';
  }
  if (column.type === 'currency') {
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(Number(value));
  }
  if (column.type === 'lookup') {
    return lookupLabel(column.lookup, value);
  }

  return String(value);
}

export function normalizeResourcePayload(
  fields: ResourceFieldConfig[],
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  for (const field of fields) {
    const rawValue = raw[field.key];
    if (field.type === 'checkbox') {
      payload[field.key] = Boolean(rawValue);
    } else if (isTextLikeField(field.type)) {
      const trimmedValue = trimTextValue(rawValue);
      payload[field.key] = trimmedValue === '' || trimmedValue === null || trimmedValue === undefined ? null : trimmedValue;
    } else if (rawValue === '' || rawValue === null || rawValue === undefined) {
      payload[field.key] = null;
    } else if (field.type === 'number' || field.type === 'select') {
      payload[field.key] = Number(rawValue);
    } else if (field.type === 'currency') {
      payload[field.key] = Number.parseFloat(String(rawValue));
    } else {
      payload[field.key] = rawValue;
    }
  }

  return payload;
}

export function parsePickerReturnParams(value: string | null): Record<string, string | number | null> {
  if (!value) {
    return {};
  }

  try {
    return JSON.parse(value) as Record<string, string | number | null>;
  } catch {
    return {};
  }
}

export function humanizeResourceKey(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replaceAll('_', ' ')
    .replace(/^\w/, (char) => char.toUpperCase());
}

export function shouldIncludePickerMetaValue(lookup: LookupConfig, key: string, value: unknown): boolean {
  if (key === lookup.labelKey || key === lookup.valueKey) {
    return false;
  }

  if (value === null || value === undefined || value === '') {
    return false;
  }

  if (/^id[A-Z]/.test(key) || /^id[a-z]/.test(key)) {
    return false;
  }

  return formatPickerMetaValue(key, value).trim() !== '';
}

export function formatPickerMetaValue(key: string, value: unknown): string {
  if (Array.isArray(value)) {
    return value.length ? `${humanizeResourceKey(key)}: ${value.length} registros` : '';
  }

  if (typeof value === 'object' && value !== null) {
    return formatPickerMetaObject(key, value as Record<string, unknown>);
  }

  return String(value);
}

export function formatPickerMetaObject(key: string, value: Record<string, unknown>): string {
  const fullName = [value['nombre'], value['apellido']].filter(Boolean).join(' ').trim();
  if (fullName) {
    return fullName;
  }

  const preferred = [value['email'], value['dni'], value['telefono'], value['codigoBarras'], value['descripcion']]
    .filter((item) => item !== null && item !== undefined && item !== '')
    .map((item) => String(item));

  if (preferred.length) {
    return preferred[0];
  }

  const fallback = Object.entries(value)
    .filter(([childKey]) => !/^id[A-Z]/.test(childKey) && !/^id[a-z]/.test(childKey))
    .filter(([, childValue]) => childValue !== null && childValue !== undefined && childValue !== '')
    .map(([, childValue]) => String(childValue))
    .filter(Boolean)
    .slice(0, 2)
    .join(' · ');

  return fallback ? `${humanizeResourceKey(key)}: ${fallback}` : '';
}
