import { Observable } from 'rxjs';

import { CrudResourceKey, PageQueryParams, PageResponse } from '../../core/models';

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
  displayWith?: (option: Record<string, unknown>) => string;
}

export interface ResourceCreateValueContext {
  items: Record<string, unknown>[];
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
  readonly?: boolean;
  createValue?: (context: ResourceCreateValueContext) => unknown;
  pickerOnly?: boolean;
  pickerMode?: 'route' | 'modal';
  pickerRoute?: string;
  pickerButtonLabel?: string;
  pickerQueryParams?: Record<string, string | number | boolean>;
  selectionQueryParam?: string;
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
  pagination?: {
    enabled: boolean;
    pageSize?: number;
    pageSizeOptions?: number[];
    sortBy?: string;
    direction?: 'asc' | 'desc';
  };
}

export interface CrudPageService<TItem = unknown, TPayload = unknown> {
  list(): Observable<TItem[]>;
  listPage?(query: PageQueryParams): Observable<PageResponse<TItem>>;
  create(payload: TPayload): Observable<TItem>;
  update(id: number, payload: TPayload): Observable<TItem>;
  delete(id: number): Observable<void>;
}
