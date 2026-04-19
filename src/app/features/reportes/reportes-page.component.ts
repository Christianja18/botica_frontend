import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { forkJoin } from 'rxjs';

import { resolveApiError } from '../../core/services';
import { BestSellingProduct, ExpiringProduct, InventoryAlert, PeriodSummary, ReporteDTO, ReportPeriodGrouping } from './models';
import { ReportesService } from './services';
import { UsuarioDTO } from '../usuarios/models';
import { UsuariosService } from '../usuarios/services';

type QuickRangeId = 'today' | 'last7' | 'month';
type ReportDataMap = Record<string, unknown>;

interface ReportHistoryCard {
  id: number | null;
  typeLabel: string;
  typeClass: string;
  generatedAt: string;
  owner: string;
  summary: string;
  metrics: string[];
  range: string | null;
  source: ReporteDTO;
}

function maxIsoDateValidator(maxDate: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '').trim();
    if (!value) {
      return null;
    }

    return value > maxDate ? { maxIsoDate: true } : null;
  };
}

@Component({
  selector: 'app-reportes-page',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, CurrencyPipe],
  templateUrl: './reportes-page.component.html',
  styleUrl: './reportes-page.component.css',
})
export class ReportesPageComponent {
  private readonly reportesService = inject(ReportesService);
  private readonly usuariosService = inject(UsuariosService);
  private readonly today = new Date();
  private readonly currentYear = this.today.getFullYear();

  readonly groupingOptions: Array<{ value: ReportPeriodGrouping; label: string }> = [
    { value: 'dia', label: 'Por día' },
    { value: 'mes', label: 'Por mes' },
    { value: 'anio', label: 'Por año' },
    { value: 'bimestral', label: 'Bimestral' },
    { value: 'trimestral', label: 'Trimestral' },
    { value: 'semestral', label: 'Semestral' },
    { value: 'anual_consolidado', label: 'Anual consolidado' },
  ];
  readonly quickRanges: Array<{ id: QuickRangeId; label: string; hint: string }> = [
    { id: 'today', label: 'Hoy', hint: 'Mismo día' },
    { id: 'last7', label: 'Últimos 7 días', hint: 'Revisión corta' },
    { id: 'month', label: 'Mes actual', hint: 'Cierre mensual' },
  ];

  readonly loading = signal(true);
  readonly generating = signal(false);
  readonly salesSubmitted = signal(false);
  readonly inventorySubmitted = signal(false);
  readonly summarySubmitted = signal(false);
  readonly actionLoading = signal(false);
  readonly actionMessage = signal('Cargando información...');
  readonly errorMessage = signal<string | null>(null);
  readonly reportes = signal<ReporteDTO[]>([]);
  readonly reportesPage = signal(0);
  readonly reportesPageSize = signal(5);
  readonly reportesTotalElements = signal(0);
  readonly reportesTotalPages = signal(1);
  readonly usuarios = signal<UsuarioDTO[]>([]);
  readonly ventasResumen = signal<PeriodSummary[]>([]);
  readonly gananciasResumen = signal<PeriodSummary[]>([]);
  readonly inventarioBajo = signal<InventoryAlert[]>([]);
  readonly porVencer = signal<ExpiringProduct[]>([]);
  readonly vencidos = signal<ExpiringProduct[]>([]);
  readonly productosMasVendidos = signal<BestSellingProduct[]>([]);
  readonly selectedGrouping = signal<ReportPeriodGrouping>('mes');
  readonly selectedYear = signal(this.currentYear);
  readonly activeQuickRange = signal<QuickRangeId | null>('month');
  readonly todayIso = this.toIsoDate(this.today);
  readonly pageSizeOptions = [5, 10, 15, 20, 50];

  readonly salesForm = new FormGroup({
    fechaInicio: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, maxIsoDateValidator(this.todayIso)],
    }),
    fechaFin: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, maxIsoDateValidator(this.todayIso)],
    }),
    idUsuario: new FormControl<number | null>(null, { validators: [Validators.required] }),
  });

  readonly inventoryForm = new FormGroup({
    idUsuario: new FormControl<number | null>(null, { validators: [Validators.required] }),
  });

  readonly yearRequired = computed(() => this.selectedGrouping() !== 'anio');
  readonly summarySectionTitle = computed(() => this.groupingLabel(this.selectedGrouping()).toLowerCase());
  readonly salesMax = computed(() =>
    Math.max(1, ...this.ventasResumen().map((item) => Number(item.valor ?? 0))),
  );
  readonly gainMax = computed(() =>
    Math.max(1, ...this.gananciasResumen().map((item) => Number(item.valor ?? 0))),
  );
  readonly totalSalesSummary = computed(() =>
    this.ventasResumen().reduce((total, item) => total + Number(item.valor ?? 0), 0),
  );
  readonly totalGainSummary = computed(() =>
    this.gananciasResumen().reduce((total, item) => total + Number(item.valor ?? 0), 0),
  );
  readonly latestSalesLabel = computed(() => {
    const items = this.ventasResumen();
    return items.length ? this.periodLabel(items[items.length - 1]) : 'Sin datos';
  });
  readonly productosMasVendidosMax = computed(() =>
    Math.max(
      1,
      ...this.productosMasVendidos().map((item) => this.bestSellingQuantity(item)),
    ),
  );
  readonly historyCards = computed<ReportHistoryCard[]>(() =>
    this.reportes().map((report) => this.toHistoryCard(report)),
  );

  constructor() {
    this.applyQuickRange('month');
    this.loadPage();
  }

  loadPage(busyMessage?: string): void {
    if (busyMessage) {
      this.startActionLoading(busyMessage);
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    forkJoin({
      reportesPage: this.reportesService.listPage({
        page: this.reportesPage(),
        size: this.reportesPageSize(),
        sortBy: 'idReporte',
        direction: 'desc',
      }),
      usuarios: this.usuariosService.list(),
      ventas: this.reportesService.getVentasResumen(this.selectedGrouping(), this.resolveSummaryYear()),
      ganancias: this.reportesService.getGananciasResumen(this.selectedGrouping(), this.resolveSummaryYear()),
      inventarioBajo: this.reportesService.getInventarioBajo(),
      porVencer: this.reportesService.getProductosPorVencer(),
      vencidos: this.reportesService.getProductosVencidos(),
      productosMasVendidos: this.reportesService.getProductosMasVendidos(),
    }).subscribe({
      next: (response) => {
        this.reportes.set(response.reportesPage.content);
        this.reportesPage.set(response.reportesPage.page);
        this.reportesPageSize.set(response.reportesPage.size);
        this.reportesTotalElements.set(response.reportesPage.totalElements);
        this.reportesTotalPages.set(Math.max(response.reportesPage.totalPages, 1));
        this.usuarios.set(response.usuarios);
        this.ventasResumen.set(response.ventas);
        this.gananciasResumen.set(response.ganancias);
        this.inventarioBajo.set(response.inventarioBajo);
        this.porVencer.set(response.porVencer);
        this.vencidos.set(response.vencidos);
        this.productosMasVendidos.set(response.productosMasVendidos);
        this.loading.set(false);
        this.finishActionLoading();
      },
      error: (error: unknown) => {
        this.errorMessage.set(resolveApiError(error));
        this.loading.set(false);
        this.finishActionLoading();
      },
    });
  }

  applySummaryFilters(): void {
    this.summarySubmitted.set(true);
    if (this.yearRequired() && (!Number.isFinite(this.selectedYear()) || this.selectedYear() <= 0)) {
      this.errorMessage.set('Ingresa un año válido para consultar el resumen.');
      return;
    }

    this.loadPage('Actualizando resumen...');
  }

  updateSummaryYear(value: number | string): void {
    const numericYear = Number(value);
    this.selectedYear.set(Number.isFinite(numericYear) ? numericYear : 0);
    this.applySummaryFilters();
  }

  applyQuickRange(rangeId: QuickRangeId): void {
    const today = new Date(this.today);
    const end = this.toIsoDate(today);
    let startDate = new Date(today);

    switch (rangeId) {
      case 'today':
        break;
      case 'last7':
        startDate.setDate(startDate.getDate() - 6);
        break;
      case 'month':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
    }

    this.salesForm.patchValue({
      fechaInicio: this.toIsoDate(startDate),
      fechaFin: end,
    });
    this.activeQuickRange.set(rangeId);
    this.errorMessage.set(null);
  }

  clearSalesDates(): void {
    this.salesForm.patchValue({ fechaInicio: '', fechaFin: '' });
    this.activeQuickRange.set(null);
  }

  createSalesReport(): void {
    this.salesSubmitted.set(true);
    if (this.salesForm.invalid) {
      if (this.salesForm.controls.fechaInicio.hasError('maxIsoDate')) {
        this.errorMessage.set(`La fecha inicio no puede ser posterior a ${this.toDisplayDate(this.todayIso)}.`);
      }
      if (this.salesForm.controls.fechaFin.hasError('maxIsoDate')) {
        this.errorMessage.set(`La fecha fin no puede ser posterior a ${this.toDisplayDate(this.todayIso)}.`);
      }
      this.salesForm.markAllAsTouched();
      return;
    }

    const { fechaInicio, fechaFin, idUsuario } = this.salesForm.getRawValue();
    if (fechaInicio > fechaFin) {
      this.errorMessage.set('La fecha de inicio no puede ser mayor que la fecha fin.');
      return;
    }

    this.generating.set(true);
    this.reportesService
      .generateSalesReport({
        fechaInicio: this.toApiDate(fechaInicio),
        fechaFin: this.toApiDate(fechaFin),
        idUsuario: Number(idUsuario),
      })
      .subscribe({
        next: () => {
          this.loadPage('Reporte de ventas generado.');
          this.generating.set(false);
        },
        error: (error: unknown) => {
          this.errorMessage.set(resolveApiError(error));
          this.generating.set(false);
        },
      });
  }

  createInventoryReport(): void {
    this.inventorySubmitted.set(true);
    if (this.inventoryForm.invalid) {
      this.inventoryForm.markAllAsTouched();
      return;
    }

    this.generating.set(true);
    this.reportesService.generateInventoryReport(Number(this.inventoryForm.controls.idUsuario.value)).subscribe({
      next: () => {
        this.loadPage('Reporte de inventario generado.');
        this.generating.set(false);
      },
      error: (error: unknown) => {
        this.errorMessage.set(resolveApiError(error));
        this.generating.set(false);
      },
    });
  }

  deleteReport(report: ReporteDTO): void {
    if (!report.idReporte || !window.confirm('Deseas eliminar este reporte?')) {
      return;
    }

    this.startActionLoading('Eliminando reporte...');
    this.reportesService.delete(report.idReporte).subscribe({
      next: () => {
        if (this.reportes().length === 1 && this.reportesPage() > 0) {
          this.reportesPage.update((page) => Math.max(page - 1, 0));
        }
        this.loadPage();
      },
      error: (error: unknown) => {
        this.errorMessage.set(resolveApiError(error));
        this.finishActionLoading();
      },
    });
  }

  periodLabel(item: PeriodSummary): string {
    if (item.etiqueta?.trim()) {
      return item.etiqueta;
    }
    if (item.periodo !== undefined && item.periodo !== null) {
      return `Periodo ${item.periodo}`;
    }
    if (item.anio !== undefined && item.anio !== null) {
      return `Año ${item.anio}`;
    }
    return 'Sin etiqueta';
  }

  barWidth(item: PeriodSummary, kind: 'sales' | 'gain'): number {
    const max = kind === 'sales' ? this.salesMax() : this.gainMax();
    const value = Number(item.valor ?? 0);
    return (value / max) * 100;
  }

  metricValue(item: PeriodSummary): number {
    return Number(item.valor ?? 0);
  }

  pageRangeLabel(): string {
    if (!this.reportesTotalElements()) {
      return 'Sin reportes generados';
    }

    const start = this.reportesPage() * this.reportesPageSize() + 1;
    const end = Math.min(start + this.reportes().length - 1, this.reportesTotalElements());
    return `Mostrando ${start}-${end} de ${this.reportesTotalElements()} reportes`;
  }

  previousReportPage(): void {
    if (this.reportesPage() === 0) {
      return;
    }

    this.reportesPage.update((page) => page - 1);
    this.loadPage('Cargando reportes...');
  }

  nextReportPage(): void {
    if (this.reportesPage() + 1 >= this.reportesTotalPages()) {
      return;
    }

    this.reportesPage.update((page) => page + 1);
    this.loadPage('Cargando reportes...');
  }

  changeReportPageSize(value: number): void {
    if (value === this.reportesPageSize()) {
      return;
    }

    this.reportesPageSize.set(value);
    this.reportesPage.set(0);
    this.loadPage('Actualizando historial...');
  }

  updateGrouping(value: string): void {
    const option = this.groupingOptions.find((item) => item.value === value);
    if (option) {
      this.selectedGrouping.set(option.value);
      this.applySummaryFilters();
    }
  }

  salesControlInvalid(key: 'fechaInicio' | 'fechaFin' | 'idUsuario'): boolean {
    const control = this.salesForm.controls[key];
    return control.invalid && this.salesSubmitted();
  }

  inventoryControlInvalid(): boolean {
    return this.inventoryForm.controls.idUsuario.invalid && this.inventorySubmitted();
  }

  summaryYearInvalid(): boolean {
    return this.summarySubmitted() && this.yearRequired() && (!Number.isFinite(this.selectedYear()) || this.selectedYear() <= 0);
  }

  groupingLabel(value: ReportPeriodGrouping): string {
    return this.groupingOptions.find((item) => item.value === value)?.label ?? value;
  }

  inventoryStock(item: InventoryAlert): string {
    const stockActual = item.stockActual ?? item.stock_actual ?? 0;
    const stockMinimo = item.stockMinimo ?? item.stock_minimo ?? 0;
    return `${stockActual} disponibles · mínimo ${stockMinimo}`;
  }

  expiringDate(item: ExpiringProduct): string {
    return item.fechaVencimiento ?? item.fecha_vencimiento ?? 'Sin fecha';
  }

  expiringDays(item: ExpiringProduct): string {
    const days = item.diasParaVencer ?? item.dias_para_vencer;
    if (days === undefined || days === null) {
      return 'Sin dato';
    }
    return `${days} días`;
  }

  private reportOwner(idUsuario: number): string {
    const user = this.usuarios().find((item) => item.idUsuario === idUsuario);
    return user ? `${user.nombre} ${user.apellido}` : `Usuario #${idUsuario}`;
  }

  private reportTypeLabel(type: string): string {
    switch (String(type).toLowerCase()) {
      case 'ventas':
        return 'Ventas';
      case 'inventario':
        return 'Inventario';
      default:
        return type || 'Reporte';
    }
  }

  private reportTypeClass(type: string): string {
    return String(type).toLowerCase() === 'ventas' ? 'sales' : 'inventory';
  }

  private reportSummary(report: ReporteDTO): string {
    const data = this.parseReportData(report);
    if (!data) {
      return 'Sin resumen disponible.';
    }

    if (Array.isArray(data['ventas'])) {
      const total = this.toNumericValue(data['total']);
      return `${data['ventas'].length} ventas incluidas${total !== null ? ` · Total ${this.currencyValue(total)}` : ''}`;
    }

    if (Array.isArray(data['inventario_bajo'])) {
      return `${data['inventario_bajo'].length} productos detectados con stock bajo.`;
    }

    return 'Reporte generado correctamente.';
  }

  private reportMetrics(report: ReporteDTO): string[] {
    const data = this.parseReportData(report);
    if (!data) {
      return [];
    }

    const metrics: string[] = [];
    if (Array.isArray(data['ventas'])) {
      metrics.push(`${data['ventas'].length} ventas`);
    }

    const total = this.toNumericValue(data['total']);
    if (total !== null) {
      metrics.push(`Total ${this.currencyValue(total)}`);
    }

    if (Array.isArray(data['inventario_bajo'])) {
      metrics.push(`${data['inventario_bajo'].length} alertas`);
    }

    return metrics;
  }

  private reportWindow(report: ReporteDTO): string | null {
    if (!report.fechaInicio || !report.fechaFin) {
      return null;
    }
    return `${report.fechaInicio} a ${report.fechaFin}`;
  }

  private parseReportData(report: ReporteDTO): ReportDataMap | null {
    if (!report.datos) {
      return null;
    }

    try {
      const parsed = JSON.parse(report.datos);
      return parsed && typeof parsed === 'object' ? (parsed as ReportDataMap) : null;
    } catch {
      return null;
    }
  }

  private toHistoryCard(report: ReporteDTO): ReportHistoryCard {
    return {
      id: report.idReporte ?? null,
      typeLabel: this.reportTypeLabel(report.tipoReporte),
      typeClass: this.reportTypeClass(report.tipoReporte),
      generatedAt: report.fechaGeneracion || 'Sin fecha',
      owner: this.reportOwner(report.generadoPor),
      summary: this.reportSummary(report),
      metrics: this.reportMetrics(report),
      range: this.reportWindow(report),
      source: report,
    };
  }

  private toNumericValue(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  private currencyValue(value: number): string {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  bestSellingQuantity(item: BestSellingProduct): number {
    return Number(item.cantidadVendida ?? item.cantidad_vendida ?? 0);
  }

  bestSellingAmount(item: BestSellingProduct): number {
    return Number(item.totalVendido ?? item.total_vendido ?? 0);
  }

  bestSellingCode(item: BestSellingProduct): string {
    return item.codigoBarras ?? item.codigo_barras ?? 'Sin codigo';
  }

  bestSellingBarWidth(item: BestSellingProduct): number {
    const max = this.productosMasVendidosMax();
    return (this.bestSellingQuantity(item) / max) * 100;
  }

  private toApiDate(value: string): string {
    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year}`;
  }

  private toIsoDate(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private toDisplayDate(value: string): string {
    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year}`;
  }

  private startActionLoading(message: string): void {
    this.actionMessage.set(message);
    this.actionLoading.set(true);
  }

  private finishActionLoading(): void {
    this.actionLoading.set(false);
  }

  private resolveSummaryYear(): number | undefined {
    return this.yearRequired() ? this.selectedYear() : undefined;
  }
}
