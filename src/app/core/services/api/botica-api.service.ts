import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { CrudResourceKey } from '../../models';
import { BoletasService } from '../../../features/boletas/services';
import { CategoriasService } from '../../../features/categorias/services';
import { ClientesService } from '../../../features/clientes/services';
import { DetallesPedidoService } from '../../../features/detalles-pedido/services';
import { InventarioService } from '../../../features/inventario/services';
import { PedidoDTO, PedidoEstado } from '../../../features/pedidos/models';
import { PedidosService } from '../../../features/pedidos/services';
import { ProductoDTO } from '../../../features/productos/models';
import { ProductosService } from '../../../features/productos/services';
import { ProveedoresService } from '../../../features/proveedores/services';
import { ExpiringProduct, InventoryAlert, MonthlyMetric, PeriodSummary, ReportPeriodGrouping, ReporteDTO } from '../../../features/reportes/models';
import { ReportesService } from '../../../features/reportes/services';
import { RolesService } from '../../../features/roles/services';
import { UsuariosService } from '../../../features/usuarios/services';

@Injectable({
  providedIn: 'root',
})
export class BoticaApiService {
  private readonly crudServices: Record<CrudResourceKey, CrudServiceFacade<unknown>>;

  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly rolesService: RolesService,
    private readonly clientesService: ClientesService,
    private readonly categoriasService: CategoriasService,
    private readonly proveedoresService: ProveedoresService,
    private readonly productosService: ProductosService,
    private readonly inventarioService: InventarioService,
    private readonly pedidosService: PedidosService,
    private readonly detallesPedidoService: DetallesPedidoService,
    private readonly boletasService: BoletasService,
    private readonly reportesService: ReportesService,
  ) {
    this.crudServices = {
      usuarios: this.usuariosService,
      roles: this.rolesService,
      clientes: this.clientesService,
      categorias: this.categoriasService,
      proveedores: this.proveedoresService,
      productos: this.productosService,
      inventario: this.inventarioService,
      pedidos: this.pedidosService,
      'detalles-pedido': this.detallesPedidoService,
      boletas: this.boletasService,
      reportes: this.reportesService,
    };
  }

  list<T>(resource: CrudResourceKey): Observable<T[]> {
    return this.selectCrudService<T>(resource).list();
  }

  create<T>(resource: CrudResourceKey, payload: unknown): Observable<T> {
    return this.selectCrudService<T>(resource).create(payload);
  }

  update<T>(resource: CrudResourceKey, id: number, payload: unknown): Observable<T> {
    return this.selectCrudService<T>(resource).update(id, payload);
  }

  delete(resource: CrudResourceKey, id: number): Observable<void> {
    return this.selectCrudService<void>(resource).delete(id);
  }

  getPedidosByEstado(estado: PedidoEstado): Observable<PedidoDTO[]> {
    return this.pedidosService.getByEstado(estado);
  }

  searchProductos(nombre: string): Observable<ProductoDTO[]> {
    return this.productosService.searchByNombre(nombre);
  }

  generateSalesReport(payload: {
    fechaInicio: string;
    fechaFin: string;
    idUsuario: number;
  }): Observable<ReporteDTO> {
    return this.reportesService.generateSalesReport(payload);
  }

  generateInventoryReport(idUsuario: number): Observable<ReporteDTO> {
    return this.reportesService.generateInventoryReport(idUsuario);
  }

  getVentasResumen(agrupacion: ReportPeriodGrouping, year?: number): Observable<PeriodSummary[]> {
    return this.reportesService.getVentasResumen(agrupacion, year);
  }

  getGananciasResumen(agrupacion: ReportPeriodGrouping, year?: number): Observable<PeriodSummary[]> {
    return this.reportesService.getGananciasResumen(agrupacion, year);
  }

  getVentasPorMes(year: number): Observable<MonthlyMetric[]> {
    return this.reportesService.getVentasPorMes(year);
  }

  getGananciasPorMes(year: number): Observable<MonthlyMetric[]> {
    return this.reportesService.getGananciasPorMes(year);
  }

  getInventarioBajo(): Observable<InventoryAlert[]> {
    return this.reportesService.getInventarioBajo();
  }

  getProductosPorVencer(): Observable<ExpiringProduct[]> {
    return this.reportesService.getProductosPorVencer();
  }

  getProductosVencidos(): Observable<ExpiringProduct[]> {
    return this.reportesService.getProductosVencidos();
  }

  private selectCrudService<T>(resource: CrudResourceKey): CrudServiceFacade<T> {
    return this.crudServices[resource] as CrudServiceFacade<T>;
  }
}

interface CrudServiceFacade<T> {
  list(): Observable<T[]>;
  create(payload: unknown): Observable<T>;
  update(id: number, payload: unknown): Observable<T>;
  delete(id: number): Observable<void>;
}
