import { CommonModule, CurrencyPipe, DOCUMENT } from '@angular/common';
import { Component, computed, DestroyRef, HostListener, inject, OnDestroy, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';

import { resolveApiError, StockRefreshService } from '../../core/services';
import { decimalPrecisionValidator } from '../../core/validators';
import { ClienteDTO } from '../clientes/models';
import { ClientesService } from '../clientes/services';
import { DetallePedidoDTO } from '../detalles-pedido/models';
import { InventarioDTO } from '../inventario/models';
import { InventarioService } from '../inventario/services';
import { PedidoDTO, PedidoEstado } from './models';
import { PedidosService } from './services';
import { ProductoDTO } from '../productos/models';
import { ProductosService } from '../productos/services';
import { UsuarioDTO } from '../usuarios/models';
import { UsuariosService } from '../usuarios/services';
import {
  buildClientLabel,
  buildOrderClientLabel,
  buildOrderDetailProductLabel,
  buildOrderUserLabel,
  buildProductLabel,
  buildUserLabel,
  daysUntilExpiration as calculateDaysUntilExpiration,
  findInventory,
  findProduct,
  isProductExpired as productIsExpired,
  isProductExpiringSoon as productIsExpiringSoon,
  todayAtMidnight,
  totalQuantityForProduct,
} from './pedidos.logic';

interface DetailFormValue {
  idDetalle: number | null;
  idProducto: number | null;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

type DetailFormGroup = FormGroup<{
  idDetalle: FormControl<number | null>;
  idProducto: FormControl<number | null>;
  cantidad: FormControl<number>;
  precioUnitario: FormControl<number>;
  subtotal: FormControl<number>;
}>;
type PedidoPickerType = 'cliente' | 'usuario' | 'producto';

@Component({
  selector: 'app-pedidos-page',
  imports: [CommonModule, ReactiveFormsModule, CurrencyPipe],
  templateUrl: './pedidos-page.component.html',
  styleUrl: './pedidos-page.component.css',
})
export class PedidosPageComponent implements OnDestroy {
  private readonly clientesService = inject(ClientesService);
  private readonly inventarioService = inject(InventarioService);
  private readonly pedidosService = inject(PedidosService);
  private readonly productosService = inject(ProductosService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly stockRefresh = inject(StockRefreshService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  private readonly usuariosService = inject(UsuariosService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly actionLoading = signal(false);
  readonly actionMessage = signal('Cargando información...');
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly pedidos = signal<PedidoDTO[]>([]);
  readonly clientes = signal<ClienteDTO[]>([]);
  readonly inventario = signal<InventarioDTO[]>([]);
  readonly originalOrder = signal<PedidoDTO | null>(null);
  readonly usuarios = signal<UsuarioDTO[]>([]);
  readonly productos = signal<ProductoDTO[]>([]);
  readonly estadoFiltro = signal<'todos' | PedidoEstado>('todos');
  readonly editingId = signal<number | null>(null);
  readonly viewMode = signal<'list' | 'form'>('list');
  readonly requestedEditId = signal<number | null>(null);
  readonly selectorMode = signal<'none' | 'boleta'>('none');
  readonly activePicker = signal<PedidoPickerType | null>(null);
  readonly activePickerDetailIndex = signal<number | null>(null);
  readonly pickerSearch = signal('');
  private pendingSuccessMessage: string | null = null;
  private successMessageTimeoutId: number | null = null;

  readonly pedidoForm = new FormGroup({
    idCliente: new FormControl<number | null>(null),
    idUsuario: new FormControl<number | null>(null, { validators: [Validators.required] }),
    estado: new FormControl<PedidoEstado>('pendiente', { nonNullable: true, validators: [Validators.required] }),
    detalles: new FormArray<DetailFormGroup>([]),
  });

  readonly filteredOrders = computed(() => {
    const estado = this.estadoFiltro();
    return estado === 'todos' ? this.pedidos() : this.pedidos().filter((pedido) => pedido.estado === estado);
  });
  readonly filteredClientes = computed(() => {
    const term = this.pickerSearch().trim().toLowerCase();
    if (!term) {
      return this.clientes();
    }

    return this.clientes().filter((cliente) =>
      [cliente.nombre, cliente.apellido, cliente.dni, cliente.email, cliente.telefono].some((value) =>
        String(value ?? '').toLowerCase().includes(term),
      ),
    );
  });
  readonly filteredUsuarios = computed(() => {
    const term = this.pickerSearch().trim().toLowerCase();
    if (!term) {
      return this.usuarios();
    }

    return this.usuarios().filter((usuario) =>
      [usuario.nombre, usuario.apellido, usuario.email].some((value) =>
        String(value ?? '').toLowerCase().includes(term),
      ),
    );
  });
  readonly filteredProductos = computed(() => {
    const term = this.pickerSearch().trim().toLowerCase();
    if (!term) {
      return this.productos();
    }

    return this.productos().filter((producto) =>
      [producto.nombre, producto.codigoBarras, producto.descripcion].some((value) =>
        String(value ?? '').toLowerCase().includes(term),
      ),
    );
  });
  readonly completedOrderEditNotice = computed(() => {
    if (this.viewMode() !== 'form' || this.originalOrder()?.estado !== 'completado') {
      return [];
    }

    return [
      'Quitar productos devolvera stock.',
      'Agregar o aumentar cantidades descontara stock.',
      'Cambiar a cancelado revertira stock.',
    ];
  });
  readonly orderBusinessWarnings = computed(() => this.collectCompletionIssues());

  constructor() {
    this.addDetail();
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const view = params.get('vista') === 'formulario' ? 'form' : 'list';
      const rawEditId = params.get('editar');
      const editId = rawEditId ? Number(rawEditId) : null;
      const selector = params.get('selector');

      this.viewMode.set(view);
      this.requestedEditId.set(rawEditId && Number.isFinite(editId) ? editId : null);
      this.selectorMode.set(selector === 'boleta' ? 'boleta' : 'none');

      if (view === 'list') {
        this.resetForm();
        return;
      }

      this.syncFormWithRouteState();
    });
    this.loadPage();
  }

  ngOnDestroy(): void {
    this.setBackgroundScrollLocked(false);
    this.clearSuccessMessage();
  }

  @HostListener('document:keydown.escape', ['$event'])
  handleEscapeKey(event: Event): void {
    if (!this.activePicker()) {
      return;
    }

    event.preventDefault();
    this.closePicker();
  }

  get detailsArray(): FormArray<DetailFormGroup> {
    return this.pedidoForm.controls.detalles;
  }

  loadPage(busyMessage?: string): void {
    if (busyMessage) {
      this.startActionLoading(busyMessage);
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    forkJoin({
      pedidos: this.pedidosService.list(),
      clientes: this.clientesService.list(),
      inventario: this.inventarioService.list(),
      usuarios: this.usuariosService.list(),
      productos: this.productosService.list(),
    }).subscribe({
      next: (response) => {
        this.pedidos.set(response.pedidos);
        this.clientes.set(response.clientes);
        this.inventario.set(response.inventario);
        this.usuarios.set(response.usuarios);
        this.productos.set(response.productos);
        this.loading.set(false);
        this.syncFormWithRouteState();
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

  addDetail(detail?: Partial<DetailFormValue>): void {
    const detailGroup: DetailFormGroup = new FormGroup({
        idDetalle: new FormControl<number | null>(detail?.idDetalle ?? null),
        idProducto: new FormControl<number | null>(detail?.idProducto ?? null, Validators.required),
        cantidad: new FormControl<number>(detail?.cantidad ?? 1, {
          nonNullable: true,
          validators: [Validators.required, Validators.min(1)],
        }),
        precioUnitario: new FormControl<number>(detail?.precioUnitario ?? 0, {
          nonNullable: true,
          validators: [Validators.required, Validators.min(0.01), decimalPrecisionValidator(8, 2)],
        }),
        subtotal: new FormControl<number>(detail?.subtotal ?? 0, {
          nonNullable: true,
        }),
      });

    this.syncDetailSubtotal(detailGroup);
    this.detailsArray.push(detailGroup);
  }

  removeDetail(index: number): void {
    if (this.detailsArray.length === 1) {
      return;
    }
    this.detailsArray.removeAt(index);
  }

  productChanged(index: number): void {
    const detailGroup = this.detailsArray.at(index);
    const productId = Number(detailGroup.get('idProducto')?.value);
    const product = this.productos().find((item) => item.idProducto === productId);
    if (product) {
      this.applyProductSelection(detailGroup, product);
    }
  }

  totalDraft(): number {
    return this.detailsArray.controls.reduce((sum, group) => {
      return sum + Number(group.get('subtotal')?.value ?? 0);
    }, 0);
  }

  detailSubtotal(index: number): number {
    const group = this.detailsArray.at(index);
    return Number(group.get('subtotal')?.value ?? 0);
  }

  saveOrder(): void {
    if (this.pedidoForm.invalid || !this.detailsArray.length) {
      this.pedidoForm.markAllAsTouched();
      return;
    }

    const completionIssues = this.collectCompletionIssues();
    if (completionIssues.length > 0) {
      this.errorMessage.set(completionIssues[0]);
      this.pedidoForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);

    const payload: PedidoDTO = {
      idCliente: this.pedidoForm.controls.idCliente.value,
      idUsuario: Number(this.pedidoForm.controls.idUsuario.value),
      estado: this.pedidoForm.controls.estado.value,
      total: this.totalDraft(),
      detalles: this.detailsArray.controls.map((group) => ({
        idDetalle: group.get('idDetalle')?.value ?? undefined,
        idProducto: Number(group.get('idProducto')?.value),
        cantidad: Number(group.get('cantidad')?.value),
        precioUnitario: Number(group.get('precioUnitario')?.value),
        subtotal: Number(group.get('subtotal')?.value ?? 0),
      })),
    };

    const request = this.editingId()
      ? this.pedidosService.update(this.editingId()!, payload)
      : this.pedidosService.create(payload);

    request.subscribe({
      next: () => {
        this.stockRefresh.notifyStockChanged();
        this.pendingSuccessMessage = this.editingId()
          ? 'Venta actualizada correctamente.'
          : 'Venta registrada correctamente.';
        this.errorMessage.set(null);
        this.navigateToList();
        this.loadPage();
      },
      error: (error: unknown) => {
        this.errorMessage.set(resolveApiError(error));
        this.saving.set(false);
      },
    });
  }

  editOrder(order: PedidoDTO): void {
    this.startActionLoading('Cargando pedido...');
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        vista: 'formulario',
        editar: order.idPedido ?? null,
      },
      queryParamsHandling: 'merge',
    });
  }

  deleteOrder(order: PedidoDTO): void {
    if (!order.idPedido || !window.confirm('¿Deseas eliminar este pedido?')) {
      return;
    }
    this.startActionLoading('Eliminando pedido...');
    this.pedidosService.delete(order.idPedido).subscribe({
      next: () => {
        this.stockRefresh.notifyStockChanged();
        this.loadPage();
      },
      error: (error: unknown) => {
        this.errorMessage.set(resolveApiError(error));
        this.finishActionLoading();
      },
    });
  }

  resetForm(): void {
    this.editingId.set(null);
    this.originalOrder.set(null);
    this.clearSuccessMessage();
    this.pedidoForm.reset({ idCliente: null, idUsuario: null, estado: 'pendiente', detalles: [] });
    this.detailsArray.clear();
    this.addDetail();
    this.closePicker();
  }

  openCreateView(): void {
    this.clearSuccessMessage();
    this.startActionLoading('Abriendo formulario...');
    if (this.viewMode() === 'form' && this.requestedEditId() === null) {
      this.resetForm();
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

  openClientPicker(): void {
    this.setBackgroundScrollLocked(true);
    this.activePicker.set('cliente');
    this.activePickerDetailIndex.set(null);
    this.pickerSearch.set('');
  }

  openUserPicker(): void {
    this.setBackgroundScrollLocked(true);
    this.activePicker.set('usuario');
    this.activePickerDetailIndex.set(null);
    this.pickerSearch.set('');
  }

  openProductPicker(index: number): void {
    this.setBackgroundScrollLocked(true);
    this.activePicker.set('producto');
    this.activePickerDetailIndex.set(index);
    this.pickerSearch.set('');
  }

  navigateToList(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        vista: null,
        editar: null,
        selector: null,
      },
      queryParamsHandling: 'merge',
    });
    this.closePicker();
  }

  clientLabel(idCliente: number | null | undefined): string {
    return buildClientLabel(this.clientes(), idCliente);
  }

  orderClientLabel(order: PedidoDTO): string {
    return buildOrderClientLabel(this.clientes(), order);
  }

  userLabel(idUsuario: number | null | undefined): string {
    return buildUserLabel(this.usuarios(), idUsuario);
  }

  orderUserLabel(order: PedidoDTO): string {
    return buildOrderUserLabel(this.usuarios(), order);
  }

  productLabel(idProducto: number | null | undefined): string {
    return buildProductLabel(this.productos(), idProducto);
  }

  orderDetailProductLabel(detail: DetallePedidoDTO): string {
    return buildOrderDetailProductLabel(this.productos(), detail);
  }

  selectedClientLabel(): string {
    return this.clientLabel(this.pedidoForm.controls.idCliente.value);
  }

  selectedUserLabel(): string {
    const userId = this.pedidoForm.controls.idUsuario.value;
    return userId ? this.userLabel(userId) : 'Selecciona un usuario desde el historial';
  }

  selectedProductLabel(index: number): string {
    const productId = this.detailsArray.at(index)?.get('idProducto')?.value as number | null | undefined;
    return productId ? this.productLabel(productId) : 'Selecciona un producto desde catalogo';
  }

  detailBusinessWarning(index: number): string | null {
    const detailGroup = this.detailsArray.at(index);
    const productId = Number(detailGroup?.controls.idProducto.value ?? 0);
    if (!productId) {
      return null;
    }

    const product = this.productById(productId);
    if (!product) {
      return null;
    }

    if (this.isProductExpired(product)) {
      return 'Producto vencido. No se puede completar el pedido con este item.';
    }

    if (this.isStockInsufficient(productId)) {
      const available = this.availableStock(productId);
      return `Stock insuficiente. Disponible: ${available}.`;
    }

    if (this.isProductExpiringSoon(product)) {
      const days = this.daysUntilExpiration(product);
      return `Producto por vencer${days !== null ? ` en ${days} dias` : ''}.`;
    }

    if (this.isStockLow(productId)) {
      const inventory = this.inventoryByProductId(productId);
      return `Stock bajo. Minimo sugerido: ${inventory?.stockMinimo ?? 0}.`;
    }

    return null;
  }

  productPickerBadges(product: ProductoDTO): string[] {
    const badges: string[] = [];

    if (this.isProductExpired(product)) {
      badges.push('Vencido');
    } else if (this.isProductExpiringSoon(product)) {
      badges.push('Por vencer');
    }

    if (product.idProducto && this.isStockInsufficient(product.idProducto)) {
      badges.push('Stock insuficiente');
    } else if (product.idProducto && this.isStockLow(product.idProducto)) {
      badges.push('Stock bajo');
    }

    return badges;
  }

  productPickerStockNote(product: ProductoDTO): string {
    const inventory = this.inventoryByProductId(product.idProducto);
    if (!inventory) {
      return 'Inventario no disponible';
    }

    return `Stock ${inventory.stockActual} · Minimo ${inventory.stockMinimo}`;
  }

  closePicker(): void {
    this.setBackgroundScrollLocked(false);
    this.activePicker.set(null);
    this.activePickerDetailIndex.set(null);
    this.pickerSearch.set('');
  }

  pickClient(client: ClienteDTO | null): void {
    this.pedidoForm.controls.idCliente.setValue(client?.idCliente ?? null);
    this.closePicker();
  }

  pickUser(user: UsuarioDTO): void {
    this.pedidoForm.controls.idUsuario.setValue(user.idUsuario ?? null);
    this.closePicker();
  }

  pickProduct(product: ProductoDTO): void {
    const detailIndex = this.activePickerDetailIndex();
    if (detailIndex === null) {
      return;
    }

    while (this.detailsArray.length <= detailIndex) {
      this.addDetail();
    }

    this.applyProductSelection(this.detailsArray.at(detailIndex), product);
    this.closePicker();
  }

  stateClass(estado: PedidoEstado): string {
    if (estado === 'completado') return 'completed';
    if (estado === 'cancelado') return 'cancelled';
    return 'pending';
  }

  selectOrderForBoleta(order: PedidoDTO): void {
    if (!order.idPedido) {
      return;
    }

    this.router.navigate(['/boletas'], {
      queryParams: {
        vista: 'formulario',
        pedidoSeleccionado: order.idPedido,
      },
    });
  }

  private syncFormWithRouteState(): void {
    if (this.viewMode() !== 'form') {
      this.finishActionLoading();
      return;
    }

    const editId = this.requestedEditId();
    if (editId === null) {
      this.resetForm();
      this.finishActionLoading();
      return;
    }

    const order = this.pedidos().find((item) => item.idPedido === editId);
    if (!order) {
      if (!this.loading()) {
        this.errorMessage.set('No se encontro el pedido solicitado para editar.');
        this.navigateToList();
      }
      return;
    }

    this.populateOrder(order);
    this.finishActionLoading();
  }

  private populateOrder(order: PedidoDTO): void {
    this.editingId.set(order.idPedido ?? null);
    this.originalOrder.set(order);
    this.pedidoForm.patchValue({
      idCliente: order.idCliente ?? null,
      idUsuario: order.idUsuario,
      estado: order.estado,
    });
    this.detailsArray.clear();
    if (order.detalles?.length) {
      for (const detail of order.detalles) {
        this.addDetail({
          idDetalle: detail.idDetalle ?? null,
          idProducto: detail.idProducto,
          cantidad: detail.cantidad,
          precioUnitario: Number(detail.precioUnitario),
          subtotal: Number(detail.subtotal ?? 0),
        });
      }
      return;
    }

    this.addDetail();
  }

  private syncDetailSubtotal(detailGroup: DetailFormGroup): void {
    const updateSubtotal = () => {
      const quantity = Number(detailGroup.controls.cantidad.value ?? 0);
      const price = Number(detailGroup.controls.precioUnitario.value ?? 0);
      const subtotal = quantity * price;
      detailGroup.controls.subtotal.setValue(subtotal, { emitEvent: false });
    };

    updateSubtotal();
    detailGroup.controls.cantidad.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(updateSubtotal);
    detailGroup.controls.precioUnitario.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(updateSubtotal);
  }

  private applyProductSelection(detailGroup: DetailFormGroup, product: ProductoDTO): void {
    detailGroup.controls.idProducto.setValue(product.idProducto ?? null, { emitEvent: false });
    detailGroup.controls.precioUnitario.setValue(Number(product.precioVenta ?? 0));
    detailGroup.controls.precioUnitario.markAsDirty();
    detailGroup.controls.precioUnitario.markAsTouched();
  }

  private collectCompletionIssues(): string[] {
    if (this.pedidoForm.controls.estado.value !== 'completado') {
      return [];
    }

    const issues: string[] = [];
    const detailGroups = this.detailsArray.controls.filter((group) => Number(group.controls.idProducto.value ?? 0));

    if (!detailGroups.length) {
      issues.push('No se puede completar un pedido sin detalles.');
      return issues;
    }

    for (const detailGroup of detailGroups) {
      const productId = Number(detailGroup.controls.idProducto.value ?? 0);
      const product = this.productById(productId);
      if (!product) {
        continue;
      }

      if (this.isProductExpired(product)) {
        issues.push(`No se puede agregar un producto vencido: ${product.nombre}.`);
      }

      if (this.isStockInsufficient(productId)) {
        issues.push(`Stock insuficiente para ${product.nombre}.`);
      }
    }

    return [...new Set(issues)];
  }

  private productById(productId: number | null | undefined): ProductoDTO | undefined {
    return findProduct(this.productos(), productId);
  }

  private inventoryByProductId(productId: number | null | undefined): InventarioDTO | undefined {
    return findInventory(this.inventario(), productId);
  }

  private availableStock(productId: number | null | undefined): number {
    return Number(this.inventoryByProductId(productId)?.stockActual ?? 0);
  }

  private isStockLow(productId: number | null | undefined): boolean {
    const inventory = this.inventoryByProductId(productId);
    if (!inventory) {
      return false;
    }

    return Number(inventory.stockActual ?? 0) <= Number(inventory.stockMinimo ?? 0);
  }

  private isStockInsufficient(productId: number | null | undefined): boolean {
    if (!productId) {
      return false;
    }

    return this.requiredAdditionalStock(productId) > this.availableStock(productId);
  }

  private requiredAdditionalStock(productId: number): number {
    if (this.pedidoForm.controls.estado.value !== 'completado') {
      return 0;
    }

    const currentQuantity = this.currentDraftQuantity(productId);
    const originalCommitted = this.originalCommittedQuantity(productId);
    return Math.max(0, currentQuantity - originalCommitted);
  }

  private currentDraftQuantity(productId: number): number {
    return totalQuantityForProduct(
      this.detailsArray.controls.map((group) => ({
        idProducto: group.controls.idProducto.value,
        cantidad: group.controls.cantidad.value,
      })),
      productId,
    );
  }

  private originalCommittedQuantity(productId: number): number {
    const originalOrder = this.originalOrder();
    if (originalOrder?.estado !== 'completado') {
      return 0;
    }

    return totalQuantityForProduct(originalOrder.detalles ?? [], productId);
  }

  private isProductExpired(product: ProductoDTO | null | undefined): boolean {
    return productIsExpired(product, todayAtMidnight());
  }

  private isProductExpiringSoon(product: ProductoDTO | null | undefined): boolean {
    return productIsExpiringSoon(product, todayAtMidnight());
  }

  private daysUntilExpiration(product: ProductoDTO | null | undefined): number | null {
    return calculateDaysUntilExpiration(product, todayAtMidnight());
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
