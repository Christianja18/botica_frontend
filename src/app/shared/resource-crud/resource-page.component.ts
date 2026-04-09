import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, input, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, Observable, of } from 'rxjs';

import { CrudResourceKey } from '../../core/models';
import { BoticaApiService, resolveApiError } from '../../core/services';
import {
  decimalPrecisionValidator,
  isTextLikeField,
  maxIsoDateValidator,
  minIsoDateValidator,
  notBlankTrimmedValidator,
  trimTextValue,
} from '../../core/validators';
import {
  CrudPageService,
  LookupConfig,
  ResourceColumnConfig,
  ResourceFieldConfig,
  ResourcePageConfig,
} from './resource-page.types';

@Component({
  selector: 'app-resource-page',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './resource-page.component.html',
  styleUrl: './resource-page.component.css',
})
export class ResourcePageComponent implements OnInit {
  private readonly lookupApi = inject(BoticaApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly config = input.required<ResourcePageConfig>();
  readonly resourceService = input.required<CrudPageService>();
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly submitted = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly searchTerm = signal('');
  readonly editingId = signal<number | null>(null);
  readonly viewMode = signal<'list' | 'form'>('list');
  readonly items = signal<Record<string, unknown>[]>([]);
  readonly lookupOptions = signal<Record<string, Record<string, unknown>[]>>({});
  readonly defaultValues: Record<string, unknown> = {};
  readonly form = new FormGroup<Record<string, FormControl<unknown>>>({});
  readonly requestedEditId = signal<number | null>(null);

  readonly filteredItems = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) {
      return this.items();
    }

    return this.items().filter((item) =>
      this.config()
        .searchableFields.some((fieldKey) => String(item[fieldKey] ?? '').toLowerCase().includes(term)),
    );
  });
  readonly todayIso = this.toIsoDate(new Date());

  ngOnInit(): void {
    this.buildForm();
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const view = params.get('vista') === 'formulario' ? 'form' : 'list';
      const rawEditId = params.get('editar');
      const editId = rawEditId ? Number(rawEditId) : null;

      this.viewMode.set(view);
      this.requestedEditId.set(rawEditId && Number.isFinite(editId) ? editId : null);

      if (view === 'list') {
        this.prepareCreateForm();
        return;
      }

      this.syncFormWithRouteState();
    });
    this.loadPage();
  }

  loadPage(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    forkJoin({
      items: this.resourceService().list() as Observable<Record<string, unknown>[]>,
      lookups: this.loadLookups(),
    }).subscribe({
      next: ({ items, lookups }) => {
        this.items.set(items);
        this.lookupOptions.set(lookups);
        this.loading.set(false);
        this.syncFormWithRouteState();
      },
      error: (error: unknown) => {
        this.errorMessage.set(resolveApiError(error));
        this.loading.set(false);
      },
    });
  }

  save(): void {
    this.submitted.set(true);
    this.applyFieldValidators(Boolean(this.editingId()));

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const payload = this.normalizePayload(this.form.getRawValue());
    const request = this.editingId()
      ? (this.resourceService().update(this.editingId()!, payload) as Observable<Record<string, unknown>>)
      : (this.resourceService().create(payload) as Observable<Record<string, unknown>>);

    request.subscribe({
      next: () => {
        this.navigateToList();
        this.loadPage();
        this.saving.set(false);
      },
      error: (error: unknown) => {
        this.errorMessage.set(resolveApiError(error));
        this.saving.set(false);
      },
    });
  }

  editItem(item: Record<string, unknown>): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        vista: 'formulario',
        editar: Number(item[this.config().idKey]),
      },
      queryParamsHandling: 'merge',
    });
  }

  deleteItem(item: Record<string, unknown>): void {
    const id = Number(item[this.config().idKey]);
    if (!window.confirm(`Deseas eliminar este registro de ${this.config().createLabel}?`)) {
      return;
    }

    this.resourceService().delete(id).subscribe({
      next: () => this.loadPage(),
      error: (error: unknown) => this.errorMessage.set(resolveApiError(error)),
    });
  }

  resetForm(): void {
    this.prepareCreateForm();
  }

  controlInvalid(key: string): boolean {
    const control = this.form.controls[key];
    return !!control && control.invalid && (control.touched || this.submitted());
  }

  fieldInputType(field: ResourceFieldConfig): string {
    return field.type === 'currency' ? 'number' : field.type;
  }

  fieldMinDate(field: ResourceFieldConfig): string | null {
    if (field.type !== 'date' || !field.minDate) {
      return null;
    }

    return field.minDate === 'today' ? this.todayIso : field.minDate;
  }

  fieldMaxDate(field: ResourceFieldConfig): string | null {
    if (field.type !== 'date' || !field.maxDate) {
      return null;
    }

    return field.maxDate === 'today' ? this.todayIso : field.maxDate;
  }

  formatValue(item: Record<string, unknown>, column: ResourceColumnConfig): string {
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
      return this.lookupLabel(column.lookup, value);
    }
    return String(value);
  }

  lookupLabel(lookup: LookupConfig | undefined, value: unknown): string {
    if (!lookup) {
      return String(value ?? '-');
    }

    const options = this.lookupOptions()[lookup.resource] ?? [];
    const match = options.find((option) => String(option[lookup.valueKey]) === String(value));
    return match ? String(match[lookup.labelKey]) : String(value ?? '-');
  }

  openCreateView(): void {
    if (this.viewMode() === 'form' && this.requestedEditId() === null) {
      this.prepareCreateForm();
      return;
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        vista: 'formulario',
        editar: null,
      },
      queryParamsHandling: 'merge',
    });
  }

  navigateToList(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        vista: null,
        editar: null,
      },
      queryParamsHandling: 'merge',
    });
  }

  private buildForm(): void {
    for (const field of this.config().fields) {
      const defaultValue = field.type === 'checkbox' ? false : field.hiddenInForm ? 0 : '';
      this.defaultValues[field.key] = defaultValue;
      this.form.addControl(field.key, new FormControl(defaultValue));
    }

    this.applyFieldValidators(false);
  }

  private syncFormWithRouteState(): void {
    if (this.viewMode() !== 'form') {
      return;
    }

    const editId = this.requestedEditId();
    if (editId === null) {
      this.prepareCreateForm();
      return;
    }

    const item = this.items().find((entry) => Number(entry[this.config().idKey]) === editId);
    if (!item) {
      if (!this.loading()) {
        this.errorMessage.set(`No se encontro el ${this.config().createLabel} solicitado para editar.`);
        this.navigateToList();
      }
      return;
    }

    this.populateForm(item);
  }

  private populateForm(item: Record<string, unknown>): void {
    this.editingId.set(Number(item[this.config().idKey]));
    this.applyFieldValidators(true);

    for (const field of this.config().fields) {
      const control = this.form.controls[field.key];
      control?.setValue(
        (field.type === 'checkbox' ? Boolean(item[field.key]) : (item[field.key] ?? '')) as unknown,
        { emitEvent: false },
      );
    }

    this.submitted.set(false);
  }

  private prepareCreateForm(): void {
    this.editingId.set(null);
    this.submitted.set(false);
    this.form.reset(this.defaultValues);
    this.applyFieldValidators(false);
  }

  private applyFieldValidators(isEditing: boolean): void {
    for (const field of this.config().fields) {
      const control = this.form.controls[field.key];
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
      if (field.type === 'date' && field.minDate) {
        validators.push(minIsoDateValidator(this.fieldMinDate(field)!));
      }
      if (field.type === 'date' && field.maxDate) {
        validators.push(maxIsoDateValidator(this.fieldMaxDate(field)!));
      }
      if (field.pattern) validators.push(Validators.pattern(field.pattern));

      control.setValidators(validators);
      control.updateValueAndValidity({ emitEvent: false });
    }
  }

  private loadLookups() {
    const lookups = new Map<CrudResourceKey, LookupConfig>();
    for (const column of this.config().columns) if (column.lookup) lookups.set(column.lookup.resource, column.lookup);
    for (const field of this.config().fields) if (field.lookup) lookups.set(field.lookup.resource, field.lookup);

    if (!lookups.size) {
      return of({});
    }

    return forkJoin(
      Object.fromEntries(
        Array.from(lookups.values()).map((lookup) => [
          lookup.resource,
          this.lookupApi.list<Record<string, unknown>>(lookup.resource),
        ]),
      ),
    );
  }

  private normalizePayload(raw: Record<string, unknown>): Record<string, unknown> {
    const payload: Record<string, unknown> = {};
    for (const field of this.config().fields) {
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

  private toIsoDate(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
