import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const textLikeFieldTypes = new Set(['text', 'email', 'password', 'textarea']);

export function notBlankTrimmedValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value !== 'string') {
      return null;
    }

    return value.trim().length > 0 ? null : { blank: true };
  };
}

export function decimalPrecisionValidator(integerDigits: number, fractionDigits: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const normalized = typeof value === 'number' ? String(value) : String(value).trim();
    if (!/^-?\d+(?:\.\d+)?$/.test(normalized)) {
      return { decimalFormat: true };
    }

    const unsigned = normalized.startsWith('-') ? normalized.slice(1) : normalized;
    const [integerPart, fractionPart = ''] = unsigned.split('.');

    if (integerPart.length > integerDigits || fractionPart.length > fractionDigits) {
      return {
        decimalPrecision: {
          integerDigits,
          fractionDigits,
        },
      };
    }

    return null;
  };
}

export function trimTextValue(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export function isTextLikeField(type: string): boolean {
  return textLikeFieldTypes.has(type);
}
