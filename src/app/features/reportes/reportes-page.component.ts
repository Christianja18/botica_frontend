import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, FormsModule, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { resolveApiError } from '../../core/services';
import { MonthlyMetric, ReporteDTO } from './models';
import { ReportesService } from './services';
import { UsuarioDTO } from '../usuarios/models';
import { UsuariosService } from '../usuarios/services';

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

  readonly loading = signal(true);
  readonly generating = signal(false);
  readonly actionLoading = signal(false);
  readonly actionMessage = signal('Cargando informaciÃ³n...');
  readonly errorMessage = signal<string | null>(null);
  readonly reportes = signal<ReporteDTO[]>([]);
  readonly reportesPage = signal(0);
  readonly reportesPageSize = signal(5);
  readonly reportesTotalElements = signal(0);
  readonly reportesTotalPages = signal(1);
  readonly usuarios = signal<UsuarioDTO[]>([]);
  readonly ventasMensuales = signal<MonthlyMetric[]>([]);
  readonly gananciasMensuales = signal<MonthlyMetric[]>([]);
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

  readonly monthlyMax = computed(() =>
    Math.max(1, ...this.ventasMensuales().map((item) => Number(item.totalVentas ?? item.total_ventas ?? 0))),
  );
  readonly gainMax = computed(() =>
    Math.max(1, ...this.gananciasMensuales().map((item) => Number(item.ganancia ?? 0))),
  );

  constructor() {
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
      ventas: this.reportesService.getVentasPorMes(this.currentYear),
      ganancias: this.reportesService.getGananciasPorMes(this.currentYear),
    }).subscribe({
      next: (response) => {
        this.reportes.set(response.reportesPage.content);
        this.reportesPage.set(response.reportesPage.page);
        this.reportesPageSize.set(response.reportesPage.size);
        this.reportesTotalElements.set(response.reportesPage.totalElements);
        this.reportesTotalPages.set(Math.max(response.reportesPage.totalPages, 1));
        this.usuarios.set(response.usuarios);
        this.ventasMensuales.set(response.ventas);
        this.gananciasMensuales.set(response.ganancias);
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

  createSalesReport(): void {
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
          this.salesForm.reset({ fechaInicio: '', fechaFin: '', idUsuario: null });
          this.loadPage();
          this.generating.set(false);
        },
        error: (error: unknown) => {
          this.errorMessage.set(resolveApiError(error));
          this.generating.set(false);
        },
      });
  }

  createInventoryReport(): void {
    if (this.inventoryForm.invalid) {
      this.inventoryForm.markAllAsTouched();
      return;
    }

    this.generating.set(true);
    this.reportesService.generateInventoryReport(Number(this.inventoryForm.controls.idUsuario.value)).subscribe({
      next: () => {
        this.inventoryForm.reset({ idUsuario: null });
        this.loadPage();
        this.generating.set(false);
      },
      error: (error: unknown) => {
        this.errorMessage.set(resolveApiError(error));
        this.generating.set(false);
      },
    });
  }

  deleteReport(report: ReporteDTO): void {
    if (!report.idReporte || !window.confirm('¿Deseas eliminar este reporte?')) {
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

  reportOwner(idUsuario: number): string {
    const user = this.usuarios().find((item) => item.idUsuario === idUsuario);
    return user ? `${user.nombre} ${user.apellido}` : `Usuario #${idUsuario}`;
  }

  reportDataPreview(report: ReporteDTO): string {
    if (!report.datos) return 'Sin datos JSON adicionales.';
    return report.datos.length <= 120 ? report.datos : `${report.datos.slice(0, 120)}...`;
  }

  monthLabel(item: MonthlyMetric): string {
    const month = item.mes ?? item.month ?? 1;
    return new Intl.DateTimeFormat('es-PE', { month: 'long' }).format(new Date(2026, month - 1, 1));
  }

  barWidth(item: MonthlyMetric, kind: 'sales' | 'gain'): number {
    const max = kind === 'sales' ? this.monthlyMax() : this.gainMax();
    const value = kind === 'sales' ? Number(item.totalVentas ?? item.total_ventas ?? 0) : Number(item.ganancia ?? 0);
    return (value / max) * 100;
  }

  metricValue(item: MonthlyMetric, kind: 'sales' | 'gain'): number {
    return kind === 'sales' ? Number(item.totalVentas ?? item.total_ventas ?? 0) : Number(item.ganancia ?? 0);
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
}
