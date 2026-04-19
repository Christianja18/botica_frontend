import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, computed, effect, inject, Injector, signal } from '@angular/core';
import { forkJoin, of } from 'rxjs';

import { AuthService, resolveApiError, StockRefreshService } from '../../core/services';
import { ClientesService } from '../clientes/services';
import { ClienteDTO as ClienteModelDTO } from '../clientes/models';
import { PedidosService } from '../pedidos/services';
import { PedidoDTO as PedidoModelDTO } from '../pedidos/models';
import { ProductosService } from '../productos/services';
import { ProductoDTO as ProductoModelDTO } from '../productos/models';
import { ReportesService } from '../reportes/services';
import {
  ExpiringProduct as ExpiringProductModel,
  InventoryAlert as InventoryAlertModel,
  MonthlyMetric as MonthlyMetricModel,
} from '../reportes/models';
import { UsuariosService } from '../usuarios/services';
import { UsuarioDTO as UsuarioModelDTO } from '../usuarios/models';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule, CurrencyPipe],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.css',
})
export class DashboardPageComponent {
  private readonly auth = inject(AuthService);
  private readonly clientesService = inject(ClientesService);
  private readonly injector = inject(Injector);
  private readonly pedidosService = inject(PedidosService);
  private readonly productosService = inject(ProductosService);
  private readonly reportesService = inject(ReportesService);
  private readonly stockRefresh = inject(StockRefreshService);
  private readonly usuariosService = inject(UsuariosService);
  private readonly currentYear = new Date().getFullYear();
  private handledStockRefreshVersion = 0;
  readonly canViewVentas = this.auth.hasPermission('puedeVender');
  readonly canViewInventario = this.auth.hasPermission('puedeAdministrarInventario');
  readonly canViewReportes = this.auth.hasPermission('puedeVerReportes');
  readonly canViewUsuarios = this.auth.hasPermission('puedeAdministrarUsuarios');
  readonly hasDashboardModules = computed(
    () => this.canViewVentas || this.canViewInventario || this.canViewReportes || this.canViewUsuarios,
  );

  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly productos = signal<ProductoModelDTO[]>([]);
  readonly pedidos = signal<PedidoModelDTO[]>([]);
  readonly clientes = signal<ClienteModelDTO[]>([]);
  readonly usuarios = signal<UsuarioModelDTO[]>([]);
  readonly inventarioBajo = signal<InventoryAlertModel[]>([]);
  readonly porVencer = signal<ExpiringProductModel[]>([]);
  readonly vencidos = signal<ExpiringProductModel[]>([]);
  readonly ventasMensuales = signal<MonthlyMetricModel[]>([]);
  readonly gananciasMensuales = signal<MonthlyMetricModel[]>([]);

  readonly completedOrders = computed(() => this.pedidos().filter((pedido) => pedido.estado === 'completado').length);
  readonly pendingOrders = computed(() => this.pedidos().filter((pedido) => pedido.estado === 'pendiente').length);
  readonly cancelledOrders = computed(() => this.pedidos().filter((pedido) => pedido.estado === 'cancelado').length);
  readonly totalVentasAnuales = computed(() =>
    this.ventasMensuales().reduce((sum, item) => sum + Number(item.totalVentas ?? item.total_ventas ?? 0), 0),
  );
  readonly totalGananciasAnuales = computed(() =>
    this.gananciasMensuales().reduce((sum, item) => sum + Number(item.ganancia ?? 0), 0),
  );
  readonly ventasBarMax = computed(() =>
    Math.max(1, ...this.ventasMensuales().map((item) => Number(item.totalVentas ?? item.total_ventas ?? 0))),
  );
  readonly gananciasBarMax = computed(() =>
    Math.max(1, ...this.gananciasMensuales().map((item) => Number(item.ganancia ?? 0))),
  );

  constructor() {
    this.handledStockRefreshVersion = this.stockRefresh.version();
    effect(
      () => {
        const version = this.stockRefresh.version();
        if (!version || version === this.handledStockRefreshVersion) {
          return;
        }

        this.handledStockRefreshVersion = version;
        this.loadDashboard();
      },
      { injector: this.injector },
    );
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    forkJoin({
      productos: this.canViewInventario ? this.productosService.list() : of([] as ProductoModelDTO[]),
      pedidos: this.canViewVentas ? this.pedidosService.list() : of([] as PedidoModelDTO[]),
      clientes: this.canViewVentas ? this.clientesService.list() : of([] as ClienteModelDTO[]),
      usuarios: this.canViewUsuarios ? this.usuariosService.list() : of([] as UsuarioModelDTO[]),
      inventarioBajo: this.canViewReportes
        ? this.reportesService.getInventarioBajo()
        : of([] as InventoryAlertModel[]),
      porVencer: this.canViewReportes
        ? this.reportesService.getProductosPorVencer()
        : of([] as ExpiringProductModel[]),
      vencidos: this.canViewReportes ? this.reportesService.getProductosVencidos() : of([] as ExpiringProductModel[]),
      ventas: this.canViewReportes
        ? this.reportesService.getVentasPorMes(this.currentYear)
        : of([] as MonthlyMetricModel[]),
      ganancias: this.canViewReportes
        ? this.reportesService.getGananciasPorMes(this.currentYear)
        : of([] as MonthlyMetricModel[]),
    }).subscribe({
      next: (response) => {
        this.productos.set(response.productos);
        this.pedidos.set(response.pedidos);
        this.clientes.set(response.clientes);
        this.usuarios.set(response.usuarios);
        this.inventarioBajo.set(response.inventarioBajo);
        this.porVencer.set(response.porVencer);
        this.vencidos.set(response.vencidos);
        this.ventasMensuales.set(response.ventas);
        this.gananciasMensuales.set(response.ganancias);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.errorMessage.set(resolveApiError(error));
        this.loading.set(false);
      },
    });
  }

  inventoryStock(item: InventoryAlertModel): string {
    return `${item.stockActual ?? item.stock_actual ?? 0} / minimo ${item.stockMinimo ?? item.stock_minimo ?? 0}`;
  }

  expiringDate(item: ExpiringProductModel): string {
    return item.fechaVencimiento ?? item.fecha_vencimiento ?? 'Sin fecha';
  }

  expiringDays(item: ExpiringProductModel): string {
    const days = item.diasParaVencer ?? item.dias_para_vencer;
    return days === undefined ? 'Fecha no disponible' : `${days} dias`;
  }

  metricMonth(item: MonthlyMetricModel): string {
    if (item.etiqueta?.trim()) {
      return item.etiqueta;
    }
    const month = item.mes ?? item.month ?? 1;
    return new Intl.DateTimeFormat('es-PE', { month: 'long' }).format(new Date(this.currentYear, month - 1, 1));
  }

  metricValue(item: MonthlyMetricModel, kind: 'sales' | 'gain'): number {
    return kind === 'sales' ? Number(item.totalVentas ?? item.total_ventas ?? 0) : Number(item.ganancia ?? 0);
  }

  metricBarWidth(item: MonthlyMetricModel, kind: 'sales' | 'gain'): number {
    const max = kind === 'sales' ? this.ventasBarMax() : this.gananciasBarMax();
    return (this.metricValue(item, kind) / max) * 100;
  }

  selectedYear(): number {
    return this.currentYear;
  }
}
