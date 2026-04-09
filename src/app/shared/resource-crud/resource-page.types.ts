import { Observable } from 'rxjs';

import { CrudResourceKey } from '../../core/models';

export type ResourceFieldType =
  | 'text'
  | 'email'
  | 'password'
  | 'number'
  | 'currency'
  | 'textarea'
  | 'checkbox'
  | 'select'
  | 'date';

export interface LookupConfig {
  resource: CrudResourceKey;
  labelKey: string;
  valueKey: string;
}

export interface ResourceColumnConfig {
  key: string;
  label: string;
  type?: 'text' | 'boolean' | 'date' | 'datetime' | 'currency' | 'lookup' | 'json';
  lookup?: LookupConfig;
}

export interface ResourceFieldConfig {
  key: string;
  label: string;
  type: ResourceFieldType;
  required?: boolean;
  requiredOnCreate?: boolean;
  requiredOnEdit?: boolean;
  maxLength?: number;
  minLength?: number;
  min?: number;
  integerDigits?: number;
  fractionDigits?: number;
  step?: string;
  minDate?: string | 'today';
  maxDate?: string | 'today';
  pattern?: string;
  lookup?: LookupConfig;
  hiddenInForm?: boolean;
  helpText?: string;
}

export interface ResourcePageConfig {
  key: CrudResourceKey;
  idKey: string;
  title: string;
  description: string;
  createLabel: string;
  emptyState: string;
  searchableFields: string[];
  columns: ResourceColumnConfig[];
  fields: ResourceFieldConfig[];
}

export interface CrudPageService<TItem = unknown, TPayload = unknown> {
  list(): Observable<TItem[]>;
  create(payload: TPayload): Observable<TItem>;
  update(id: number, payload: TPayload): Observable<TItem>;
  delete(id: number): Observable<void>;
}
