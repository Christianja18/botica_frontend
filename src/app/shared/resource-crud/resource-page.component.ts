import { CommonModule, DOCUMENT } from '@angular/common';
import { Component, computed, DestroyRef, effect, HostListener, inject, Injector, input, OnDestroy, OnInit, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { forkJoin, map, Observable, of } from 'rxjs';

import { CrudResourceKey } from '../../core/models';
import { BoticaApiService, resolveApiError } from '../../core/services';
import {
  CrudPageService,
  LookupConfig,
  ResourceColumnConfig,
  ResourceFieldConfig,
  ResourcePageConfig,
} from './resource-page.types';
import {
  buildResourceFieldValidators,
  fieldErrorMessage as buildFieldErrorMessage,
  formatPickerMetaValue,
  formatResourceValue,
  normalizeResourcePayload,
  parsePickerReturnParams,
  resolveResourceDateBound,
  shouldIncludePickerMetaValue,
} from './resource-page.utils';

@Component({
  selector: 'app-resource-page',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './resource-page.component.html',
  styleUrl: './resource-page.component.css',
})
export class ResourcePageComponent implements OnInit, OnDestroy {
  private readonly lookupApi = inject(BoticaApiService);
  private readonly document = inject(DOCUMENT);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);

  readonly config = input.required<ResourcePageConfig>();
  readonly resourceService = input.required<CrudPageService>();
  readonly refreshVersion = input(0);
  readonly saved = output<Record<string, unknown>>();
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly actionLoading = signal(false);
  readonly actionMessage = signal('Cargando informacion...');
  readonly submitted = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly searchTerm = signal('');
  readonly editingId = signal<number | null>(null);
  readonly viewMode = signal<'list' | 'form'>('list');
  readonly pickerTarget = signal<string | null>(null);
  readonly pickerFieldParam = signal<string | null>(null);
  readonly pickerExtraParamName = signal<string | null>(null);
  readonly pickerExtraParamValue = signal<string | null>(null);
  readonly pickerReturnParams = signal<Record<string, string | number | null>>({});
  readonly activePickerField = signal<ResourceFieldConfig | null>(null);
  readonly pickerSearchTerm = signal('');
  readonly items = signal<Record<string, unknown>[]>([]);
  readonly lookupOptions = signal<Record<string, Record<string, unknown>[]>>({});
  readonly currentPage = signal(0);
  readonly pageSize = signal(5);
  readonly totalPages = signal(1);
  readonly totalElements = signal(0);
  readonly defaultValues: Record<string, unknown> = {};
  readonly form = new FormGroup<Record<string, FormControl<unknown>>>({});
  readonly requestedEditId = signal<number | null>(null);
  readonly todayIso = this.toIsoDate(new Date());
  private pendingSuccessMessage: string | null = null;
  private successMessageTimeoutId: number | null = null;
  private handledRefreshVersion = 0;

  readonly filteredItems = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) {
      return this.items();
    }

    return this.items().filter((item) =>
      this.config().searchableFields.some((fieldKey) => String(item[fieldKey] ?? '').toLowerCase().includes(term)),
    );
  });

  readonly filteredPickerOptions = computed(() => {
    const field = this.activePickerField();
    if (!field?.lookup) {
      return [];
    }

    const options = this.lookupOptions()[field.lookup.resource] ?? [];
    const term = this.pickerSearchTerm().trim().toLowerCase();
    if (!term) {
      return options;
    }

    return options.filter((option) => {
      const label = this.lookupOptionLabel(field.lookup!, option).toLowerCase();
      if (label.includes(term)) {
        return true;
      }

      return Object.values(option).some((value) => String(value ?? '').toLowerCase().includes(term));
    });
  });

  readonly paginationEnabled = computed(
    () => Boolean(this.config().pagination?.enabled && this.resourceService().listPage),
  );

  readonly pageSizeOptions = computed(() => {
    const configured = this.config().pagination?.pageSizeOptions ?? [];
    const activeSize = this.pageSize();
    const options = configured.length ? configured : [activeSize];
    return Array.from(new Set([...options, activeSize])).sort((left, right) => left - right);
  });

  readonly showPagination = computed(() => this.paginationEnabled() && !this.loading());

  readonly listCountLabel = computed(() =>
    this.paginationEnabled() ? `${this.totalElements()} registros` : `${this.filteredItems().length} elementos`,
  );

  readonly pageRangeLabel = computed(() => {
    if (!this.totalElements()) {
      return 'Sin registros';
    }

    const start = this.currentPage() * this.pageSize() + 1;
    const end = Math.min(this.currentPage() * this.pageSize() + this.items().length, this.totalElements());
    return `Mostrando ${start}-${end} de ${this.totalElements()} registros`;
  });

  ngOnInit(): void {
    this.buildForm();
    this.restorePaginationState();
    this.handledRefreshVersion = this.refreshVersion();

    effect(
      () => {
        const version = this.refreshVersion();
        if (!version || version === this.handledRefreshVersion) {
          return;
        }

        this.handledRefreshVersion = version;
        this.loadPage('Actualizando listado...');
      },
      { injector: this.injector },
    );

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const view = params.get('vista') === 'formulario' ? 'form' : 'list';
      const rawEditId = params.get('editar');
      const editId = rawEditId ? Number(rawEditId) : null;

      this.viewMode.set(view);
      this.requestedEditId.set(rawEditId && Number.isFinite(editId) ? editId : null);
      this.pickerTarget.set(params.get('pickerTarget'));
      this.pickerFieldParam.set(params.get('pickerFieldParam'));
      this.pickerExtraParamName.set(params.get('pickerExtraParamName'));
      this.pickerExtraParamValue.set(params.get('pickerExtraParamValue'));
      this.pickerReturnParams.set(parsePickerReturnParams(params.get('pickerReturnParams')));

      if (view === 'list') {
        this.prepareCreateForm();
        return;
      }

      this.syncFormWithRouteState();
      this.applySelectionQueryParams(params);
    });

    this.loadPage();
  }

  ngOnDestroy(): void {
    this.setBackgroundScrollLocked(false);
    this.clearSuccessMessage();
  }

  @HostListener('document:keydown.escape', ['$event'])
  handleEscapeKey(event: Event): void {
    if (!this.activePickerField()) {
      return;
    }

    event.preventDefault();
    this.closePickerModal();
  }

  loadPage(busyMessage?: string): void {
    if (busyMessage) {
      this.startActionLoading(busyMessage);
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    forkJoin({
      itemsPage: this.loadItemsPage(),
      lookups: this.loadLookups(),
    }).subscribe({
      next: ({ itemsPage, lookups }) => {
        this.items.set(itemsPage.content);
        this.lookupOptions.set(lookups);
        this.totalElements.set(itemsPage.totalElements);
        this.totalPages.set(Math.max(itemsPage.totalPages, 1));
        this.currentPage.set(itemsPage.page);
        this.pageSize.set(itemsPage.size);
        this.persistPaginationState();
        this.loading.set(false);
        this.syncFormWithRouteState();
        this.applySelectionQueryParams(this.route.snapshot.queryParamMap);
        if (this.pendingSuccessMessage) {
          this.showSuccessMessage(this.pendingSuccessMessage);
          this.pendingSuccessMessage = null;
          this.saving.set(false);
        }
        this.finishActionLoading();
      },
      error: (error: unknown) => {
        this.errorMessage.set(resolveApiError(error));
        this.loading.set(false);
        this.pendingSuccessMessage = null;
        this.saving.set(false);
        this.finishActionLoading();
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
    const payload = normalizeResourcePayload(this.config().fields, this.form.getRawValue());
    const request = this.editingId()
      ? (this.resourceService().update(this.editingId()!, payload) as Observable<Record<string, unknown>>)
      : (this.resourceService().create(payload) as Observable<Record<string, unknown>>);

    request.subscribe({
      next: (savedItem) => {
        this.pendingSuccessMessage = this.editingId()
          ? 'Registro actualizado correctamente.'
          : 'Registro guardado correctamente.';
        this.errorMessage.set(null);
        this.navigateToList();
        this.loadPage();
        this.saved.emit(savedItem);
      },
      error: (error: unknown) => {
        this.errorMessage.set(resolveApiError(error));
        this.saving.set(false);
      },
    });
  }

  editItem(item: Record<string, unknown>): void {
    this.startActionLoading('Cargando registro...');
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

    this.startActionLoading('Eliminando registro...');
    this.resourceService().delete(id).subscribe({
      next: () => {
        if (this.paginationEnabled() && this.items().length === 1 && this.currentPage() > 0) {
          this.currentPage.update((page) => Math.max(page - 1, 0));
        }
        this.loadPage();
      },
      error: (error: unknown) => {
        this.errorMessage.set(resolveApiError(error));
        this.finishActionLoading();
      },
    });
  }

  resetForm(): void {
    this.clearSuccessMessage();
    this.prepareCreateForm();
  }

  controlInvalid(key: string): boolean {
    const control = this.form.controls[key];
    return !!control && control.invalid && (control.touched || this.submitted());
  }

  fieldErrorMessage(field: ResourceFieldConfig): string {
    return buildFieldErrorMessage(field, this.form.controls[field.key]);
  }

  fieldInputType(field: ResourceFieldConfig): string {
    return field.type === 'currency' ? 'number' : field.type;
  }

  fieldMinDate(field: ResourceFieldConfig): string | null {
    return field.type !== 'date' ? null : resolveResourceDateBound(field.minDate, this.todayIso);
  }

  fieldMaxDate(field: ResourceFieldConfig): string | null {
    return field.type !== 'date' ? null : resolveResourceDateBound(field.maxDate, this.todayIso);
  }

  formatValue(item: Record<string, unknown>, column: ResourceColumnConfig): string {
    return formatResourceValue(item, column, this.lookupLabel.bind(this));
  }

  lookupLabel(lookup: LookupConfig | undefined, value: unknown): string {
    if (!lookup) {
      return String(value ?? '-');
    }

    const options = this.lookupOptions()[lookup.resource] ?? [];
    const match = options.find((option) => String(option[lookup.valueKey]) === String(value));
    return match ? this.lookupOptionLabel(lookup, match) : String(value ?? '-');
  }

  lookupOptionLabel(lookup: LookupConfig, option: Record<string, unknown>): string {
    if (lookup.displayWith) {
      return lookup.displayWith(option);
    }

    return String(option[lookup.labelKey] ?? '-');
  }

  pickerDisplayValue(field: ResourceFieldConfig): string {
    const control = this.form.controls[field.key];
    const currentValue = control?.value;
    if (currentValue === null || currentValue === undefined || currentValue === '') {
      return 'Ningun elemento seleccionado';
    }

    if (!field.lookup) {
      return String(currentValue);
    }

    return this.lookupLabel(field.lookup, currentValue);
  }

  openFieldPicker(field: ResourceFieldConfig): void {
    if (field.pickerMode === 'modal' && field.lookup) {
      this.setBackgroundScrollLocked(true);
      this.pickerSearchTerm.set('');
      this.activePickerField.set(field);
      return;
    }

    if (!field.pickerRoute) {
      return;
    }

    this.router.navigate([field.pickerRoute], {
      queryParams: field.pickerQueryParams ?? {},
    });
  }

  selectItemForPicker(item: Record<string, unknown>): void {
    const target = this.pickerTarget();
    const fieldParam = this.pickerFieldParam();
    if (!target || !fieldParam) {
      return;
    }

    const queryParams: Record<string, string | number> = {
      vista: 'formulario',
      [fieldParam]: Number(item[this.config().idKey]),
    };

    for (const [key, value] of Object.entries(this.pickerReturnParams())) {
      if (value !== null && value !== undefined && value !== '') {
        queryParams[key] = value;
      }
    }

    const extraParamName = this.pickerExtraParamName();
    const extraParamValue = this.pickerExtraParamValue();
    if (extraParamName && extraParamValue !== null) {
      const numericValue = Number(extraParamValue);
      queryParams[extraParamName] =
        Number.isFinite(numericValue) && extraParamValue.trim() !== '' ? numericValue : extraParamValue;
    }

    this.router.navigate([target], { queryParams });
  }

  openCreateView(): void {
    this.clearSuccessMessage();
    this.startActionLoading('Abriendo formulario...');
    if (this.viewMode() === 'form' && this.requestedEditId() === null) {
      this.prepareCreateForm();
      this.finishActionLoading();
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
    this.closePickerModal();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        vista: null,
        editar: null,
      },
      queryParamsHandling: 'merge',
    });
  }

  closePickerModal(): void {
    this.setBackgroundScrollLocked(false);
    this.activePickerField.set(null);
    this.pickerSearchTerm.set('');
  }

  previousPage(): void {
    this.goToPage(this.currentPage() - 1);
  }

  nextPage(): void {
    this.goToPage(this.currentPage() + 1);
  }

  goToPage(page: number): void {
    if (!this.paginationEnabled()) {
      return;
    }

    const targetPage = Math.max(0, Math.min(page, this.totalPages() - 1));
    if (targetPage === this.currentPage()) {
      return;
    }

    this.currentPage.set(targetPage);
    this.persistPaginationState();
    this.loadPage('Cargando pagina...');
  }

  changePageSize(value: string | number): void {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue <= 0 || numericValue === this.pageSize()) {
      return;
    }

    this.pageSize.set(numericValue);
    this.currentPage.set(0);
    this.persistPaginationState();
    this.loadPage('Actualizando paginacion...');
  }

  selectLookupOption(option: Record<string, unknown>): void {
    const field = this.activePickerField();
    if (!field?.lookup) {
      return;
    }

    const control = this.form.controls[field.key];
    if (!control) {
      return;
    }

    control.setValue(option[field.lookup.valueKey] ?? null);
    control.markAsDirty();
    control.markAsTouched();
    control.updateValueAndValidity({ emitEvent: false });
    this.closePickerModal();
  }

  pickerOptionMeta(option: Record<string, unknown>): string[] {
    const field = this.activePickerField();
    if (!field?.lookup) {
      return [];
    }

    const label = this.lookupOptionLabel(field.lookup, option);
    return Object.entries(option)
      .filter(([key, value]) => shouldIncludePickerMetaValue(field.lookup!, key, value))
      .map(([, value], index, entries) => formatPickerMetaValue(entries[index][0], value))
      .filter((value) => value !== label)
      .slice(0, 3);
  }

  private buildForm(): void {
    for (const field of this.config().fields) {
      const defaultValue = field.type === 'checkbox' ? false : '';
      this.defaultValues[field.key] = defaultValue;
      this.form.addControl(field.key, new FormControl(defaultValue));
    }

    this.applyFieldValidators(false);
  }

  private syncFormWithRouteState(): void {
    if (this.viewMode() !== 'form') {
      this.finishActionLoading();
      return;
    }

    const editId = this.requestedEditId();
    if (editId === null) {
      this.prepareCreateForm();
      this.finishActionLoading();
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
    this.finishActionLoading();
  }

  private populateForm(item: Record<string, unknown>): void {
    this.editingId.set(Number(item[this.config().idKey]));
    this.applyFieldValidators(true);

    for (const field of this.config().fields) {
      const control = this.form.controls[field.key];
      control?.setValue((field.type === 'checkbox' ? Boolean(item[field.key]) : (item[field.key] ?? '')) as unknown, {
        emitEvent: false,
      });
    }

    this.submitted.set(false);
  }

  private prepareCreateForm(): void {
    this.editingId.set(null);
    this.submitted.set(false);
    this.form.reset(this.defaultValues);
    this.applyCreateFieldValues();
    this.applyFieldValidators(false);
  }

  private applySelectionQueryParams(params: ParamMap): void {
    if (this.viewMode() !== 'form' || this.requestedEditId() !== null) {
      return;
    }

    for (const field of this.config().fields) {
      if (!field.selectionQueryParam) {
        continue;
      }

      const rawValue = params.get(field.selectionQueryParam);
      if (rawValue === null) {
        continue;
      }

      const control = this.form.controls[field.key];
      if (!control) {
        continue;
      }

      let parsedValue: unknown = rawValue;
      if (field.type === 'number' || field.type === 'select') {
        const numericValue = Number(rawValue);
        if (!Number.isFinite(numericValue)) {
          continue;
        }
        parsedValue = numericValue;
      }

      control.setValue(parsedValue, { emitEvent: false });
      control.markAsDirty();
      control.markAsTouched();
      control.updateValueAndValidity({ emitEvent: false });
    }
  }

  private applyFieldValidators(isEditing: boolean): void {
    for (const field of this.config().fields) {
      const control = this.form.controls[field.key];
      control.setValidators(buildResourceFieldValidators(field, isEditing, this.todayIso));
      control.updateValueAndValidity({ emitEvent: false });
    }
  }

  private loadLookups() {
    const lookups = new Map<CrudResourceKey, LookupConfig>();
    for (const column of this.config().columns) {
      if (column.lookup) {
        lookups.set(column.lookup.resource, column.lookup);
      }
    }
    for (const field of this.config().fields) {
      if (field.lookup) {
        lookups.set(field.lookup.resource, field.lookup);
      }
    }

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

  private loadItemsPage(): Observable<{
    content: Record<string, unknown>[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
  }> {
    if (this.paginationEnabled()) {
      return (this.resourceService().listPage!({
        page: this.currentPage(),
        size: this.pageSize(),
        sortBy: this.config().pagination?.sortBy,
        direction: this.config().pagination?.direction,
      }) as Observable<{
        content: Record<string, unknown>[];
        page: number;
        size: number;
        totalElements: number;
        totalPages: number;
      }>).pipe(
        map((response) => ({
          content: response.content,
          page: response.page,
          size: response.size,
          totalElements: response.totalElements,
          totalPages: response.totalPages,
        })),
      );
    }

    return (this.resourceService().list() as Observable<Record<string, unknown>[]>).pipe(
      map((items) => ({
        content: items,
        page: 0,
        size: items.length || this.pageSize(),
        totalElements: items.length,
        totalPages: 1,
      })),
    );
  }

  private restorePaginationState(): void {
    const defaultSize = this.config().pagination?.pageSize ?? 5;
    this.pageSize.set(defaultSize);
    this.currentPage.set(0);

    if (!this.paginationEnabled()) {
      return;
    }

    const rawState = this.document.defaultView?.sessionStorage?.getItem(this.paginationStateKey());
    if (!rawState) {
      return;
    }

    try {
      const parsed = JSON.parse(rawState) as { page?: unknown; size?: unknown };
      const storedPage = Number(parsed.page);
      const storedSize = Number(parsed.size);

      if (Number.isFinite(storedPage) && storedPage >= 0) {
        this.currentPage.set(storedPage);
      }

      if (Number.isFinite(storedSize) && storedSize > 0) {
        this.pageSize.set(storedSize);
      }
    } catch {
      this.document.defaultView?.sessionStorage?.removeItem(this.paginationStateKey());
    }
  }

  private persistPaginationState(): void {
    if (!this.paginationEnabled()) {
      return;
    }

    this.document.defaultView?.sessionStorage?.setItem(
      this.paginationStateKey(),
      JSON.stringify({
        page: this.currentPage(),
        size: this.pageSize(),
      }),
    );
  }

  private paginationStateKey(): string {
    return `resource-pagination:${this.config().key}`;
  }

  private toIsoDate(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private applyCreateFieldValues(): void {
    for (const field of this.config().fields) {
      if (!field.createValue) {
        continue;
      }

      const control = this.form.controls[field.key];
      if (!control) {
        continue;
      }

      control.setValue(field.createValue({ items: this.items() }), { emitEvent: false });
      control.markAsPristine();
      control.markAsUntouched();
      control.updateValueAndValidity({ emitEvent: false });
    }
  }

  private setBackgroundScrollLocked(locked: boolean): void {
    const value = locked ? 'hidden' : '';
    this.document.body.style.overflow = value;
    this.document.documentElement.style.overflow = value;
  }

  private startActionLoading(message: string): void {
    this.actionMessage.set(message);
    this.actionLoading.set(true);
  }

  private finishActionLoading(): void {
    this.actionLoading.set(false);
  }

  private showSuccessMessage(message: string): void {
    this.clearSuccessMessage();
    this.successMessage.set(message);
    this.successMessageTimeoutId = window.setTimeout(() => {
      this.successMessage.set(null);
      this.successMessageTimeoutId = null;
    }, 3500);
  }

  private clearSuccessMessage(): void {
    if (this.successMessageTimeoutId !== null) {
      window.clearTimeout(this.successMessageTimeoutId);
      this.successMessageTimeoutId = null;
    }
    this.successMessage.set(null);
  }
}
