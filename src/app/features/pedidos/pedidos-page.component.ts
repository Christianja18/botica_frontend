import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';

import { resolveApiError } from '../../core/services';
import { decimalPrecisionValidator } from '../../core/validators';
import { ClienteDTO } from '../clientes/models';
import { ClientesService } from '../clientes/services';
import { PedidoDTO, PedidoEstado } from './models';
import { PedidosService } from './services';
import { ProductoDTO } from '../productos/models';
import { ProductosService } from '../productos/services';
import { UsuarioDTO } from '../usuarios/models';
import { UsuariosService } from '../usuarios/services';

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

interface PedidoDraftValue {
  idCliente: number | null;
  idUsuario: number | null;
  estado: PedidoEstado;
  detalles: DetailFormValue[];
}

@Component({
  selector: 'app-pedidos-page',
  imports: [CommonModule, ReactiveFormsModule, CurrencyPipe],
  templateUrl: './pedidos-page.component.html',
  styleUrl: './pedidos-page.component.css',
})
export class PedidosPageComponent {
  private readonly clientesService = inject(ClientesService);
  private readonly pedidosService = inject(PedidosService);
  private readonly productosService = inject(ProductosService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly usuariosService = inject(UsuariosService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly pedidos = signal<PedidoDTO[]>([]);
  readonly clientes = signal<ClienteDTO[]>([]);
  readonly usuarios = signal<UsuarioDTO[]>([]);
  readonly productos = signal<ProductoDTO[]>([]);
  readonly estadoFiltro = signal<'todos' | PedidoEstado>('todos');
  readonly editingId = signal<number | null>(null);
  readonly viewMode = signal<'list' | 'form'>('list');
  readonly requestedEditId = signal<number | null>(null);
  readonly selectorMode = signal<'none' | 'boleta'>('none');

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

  constructor() {
    this.addDetail();
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const view = params.get('vista') === 'formulario' ? 'form' : 'list';
      const rawEditId = params.get('editar');
      const editId = rawEditId ? Number(rawEditId) : null;
      const selector = params.get('selector');
      const selectedClient = params.get('pedidoClienteSeleccionado');
      const selectedUser = params.get('pedidoUsuarioSeleccionado');
      const selectedProduct = params.get('pedidoProductoSeleccionado');
      const selectedDetailIndex = params.get('pedidoDetalleIndex');
      const draft = params.get('pedidoDraft');

      this.viewMode.set(view);
      this.requestedEditId.set(rawEditId && Number.isFinite(editId) ? editId : null);
      this.selectorMode.set(selector === 'boleta' ? 'boleta' : 'none');

      if (view === 'list') {
        this.resetForm();
        return;
      }

      this.syncFormWithRouteState();
      this.applyDraft(draft);
      this.applyPickerSelections(selectedClient, selectedUser, selectedProduct, selectedDetailIndex);
    });
    this.loadPage();
  }

  get detailsArray(): FormArray<DetailFormGroup> {
    return this.pedidoForm.controls.detalles;
  }

  loadPage(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    forkJoin({
      pedidos: this.pedidosService.list(),
      clientes: this.clientesService.list(),
      usuarios: this.usuariosService.list(),
      productos: this.productosService.list(),
    }).subscribe({
      next: (response) => {
        this.pedidos.set(response.pedidos);
        this.clientes.set(response.clientes);
        this.usuarios.set(response.usuarios);
        this.productos.set(response.productos);
        this.loading.set(false);
        this.syncFormWithRouteState();
        this.applyDraft(this.route.snapshot.queryParamMap.get('pedidoDraft'));
        this.applyPickerSelections(
          this.route.snapshot.queryParamMap.get('pedidoClienteSeleccionado'),
          this.route.snapshot.queryParamMap.get('pedidoUsuarioSeleccionado'),
          this.route.snapshot.queryParamMap.get('pedidoProductoSeleccionado'),
          this.route.snapshot.queryParamMap.get('pedidoDetalleIndex'),
        );
      },
      error: (error: unknown) => {
        this.errorMessage.set(resolveApiError(error));
        this.loading.set(false);
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

  editOrder(order: PedidoDTO): void {
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
    this.pedidosService.delete(order.idPedido).subscribe({
      next: () => this.loadPage(),
      error: (error: unknown) => this.errorMessage.set(resolveApiError(error)),
    });
  }

  resetForm(): void {
    this.editingId.set(null);
    this.pedidoForm.reset({ idCliente: null, idUsuario: null, estado: 'pendiente', detalles: [] });
    this.detailsArray.clear();
    this.addDetail();
  }

  openCreateView(): void {
    if (this.viewMode() === 'form' && this.requestedEditId() === null) {
      this.resetForm();
      return;
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        vista: 'formulario',
        editar: null,
        pedidoClienteSeleccionado: null,
        pedidoUsuarioSeleccionado: null,
        pedidoProductoSeleccionado: null,
        pedidoDetalleIndex: null,
        pedidoDraft: null,
      },
      queryParamsHandling: 'merge',
    });
  }

  openClientPicker(): void {
    this.router.navigate(['/clientes'], {
      queryParams: {
        pickerTarget: '/pedidos',
        pickerFieldParam: 'pedidoClienteSeleccionado',
        pickerReturnParams: this.pickerReturnParams(),
      },
    });
  }

  openUserPicker(): void {
    this.router.navigate(['/usuarios'], {
      queryParams: {
        pickerTarget: '/pedidos',
        pickerFieldParam: 'pedidoUsuarioSeleccionado',
        pickerReturnParams: this.pickerReturnParams(),
      },
    });
  }

  openProductPicker(index: number): void {
    this.router.navigate(['/productos'], {
      queryParams: {
        pickerTarget: '/pedidos',
        pickerFieldParam: 'pedidoProductoSeleccionado',
        pickerExtraParamName: 'pedidoDetalleIndex',
        pickerExtraParamValue: index,
        pickerReturnParams: this.pickerReturnParams(),
      },
    });
  }

  navigateToList(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        vista: null,
        editar: null,
        selector: null,
        pedidoClienteSeleccionado: null,
        pedidoUsuarioSeleccionado: null,
        pedidoProductoSeleccionado: null,
        pedidoDetalleIndex: null,
        pedidoDraft: null,
      },
      queryParamsHandling: 'merge',
    });
  }

  clientLabel(idCliente: number | null | undefined): string {
    if (!idCliente) return 'Venta sin cliente';
    const client = this.clientes().find((item) => item.idCliente === idCliente);
    return client ? `${client.nombre} ${client.apellido}` : `Cliente #${idCliente}`;
  }

  userLabel(idUsuario: number | null | undefined): string {
    const user = this.usuarios().find((item) => item.idUsuario === idUsuario);
    return user ? `${user.nombre} ${user.apellido}` : `Usuario #${idUsuario}`;
  }

  productLabel(idProducto: number | null | undefined): string {
    const product = this.productos().find((item) => item.idProducto === idProducto);
    return product ? product.nombre : `Producto #${idProducto}`;
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
      return;
    }

    const editId = this.requestedEditId();
    if (editId === null) {
      this.resetForm();
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
  }

  private populateOrder(order: PedidoDTO): void {
    this.editingId.set(order.idPedido ?? null);
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

  private applyPickerSelections(
    selectedClient: string | null,
    selectedUser: string | null,
    selectedProduct: string | null,
    selectedDetailIndex: string | null,
  ): void {
    if (this.viewMode() !== 'form') {
      return;
    }

    if (selectedClient !== null) {
      const clientId = Number(selectedClient);
      if (Number.isFinite(clientId)) {
        this.pedidoForm.controls.idCliente.setValue(clientId);
      }
    }

    if (selectedUser !== null) {
      const userId = Number(selectedUser);
      if (Number.isFinite(userId)) {
        this.pedidoForm.controls.idUsuario.setValue(userId);
      }
    }

    if (selectedProduct !== null) {
      const productId = Number(selectedProduct);
      const detailIndex = Number(selectedDetailIndex ?? 0);
      if (Number.isFinite(productId) && Number.isFinite(detailIndex)) {
        while (this.detailsArray.length <= detailIndex) {
          this.addDetail();
        }
        const detailGroup = this.detailsArray.at(detailIndex);
        const product = this.productos().find((item) => item.idProducto === productId);
        detailGroup.get('idProducto')?.setValue(productId);
        if (product) {
          this.applyProductSelection(detailGroup, product);
        }
      }
    }
  }

  private pickerReturnParams(): string {
    return JSON.stringify({
      vista: 'formulario',
      editar: this.editingId(),
      pedidoDraft: this.serializeDraft(),
    });
  }

  private serializeDraft(): string {
    const draft: PedidoDraftValue = {
      idCliente: this.pedidoForm.controls.idCliente.value,
      idUsuario: this.pedidoForm.controls.idUsuario.value,
      estado: this.pedidoForm.controls.estado.value,
      detalles: this.detailsArray.controls.map((group) => ({
        idDetalle: (group.get('idDetalle')?.value as number | null) ?? null,
        idProducto: (group.get('idProducto')?.value as number | null) ?? null,
        cantidad: Number(group.get('cantidad')?.value ?? 1),
        precioUnitario: Number(group.get('precioUnitario')?.value ?? 0),
        subtotal: Number(group.get('subtotal')?.value ?? 0),
      })),
    };

    return JSON.stringify(draft);
  }

  private applyDraft(serializedDraft: string | null): void {
    if (!serializedDraft || this.viewMode() !== 'form') {
      return;
    }

    try {
      const draft = JSON.parse(serializedDraft) as Partial<PedidoDraftValue>;
      this.pedidoForm.patchValue({
        idCliente: draft.idCliente ?? null,
        idUsuario: draft.idUsuario ?? null,
        estado: draft.estado ?? 'pendiente',
      });

      this.detailsArray.clear();
      const details = Array.isArray(draft.detalles) ? draft.detalles : [];
      if (!details.length) {
        this.addDetail();
        return;
      }

      for (const detail of details) {
        this.addDetail({
          idDetalle: detail.idDetalle ?? null,
          idProducto: detail.idProducto ?? null,
          cantidad: Number(detail.cantidad ?? 1),
          precioUnitario: Number(detail.precioUnitario ?? 0),
          subtotal: Number(detail.subtotal ?? 0),
        });
      }
    } catch {
      // Ignore malformed draft params and continue with the active form state.
    }
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
}
