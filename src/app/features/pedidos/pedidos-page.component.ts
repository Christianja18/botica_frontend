import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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

  readonly pedidoForm = new FormGroup({
    idCliente: new FormControl<number | null>(null),
    idUsuario: new FormControl<number | null>(null, { validators: [Validators.required] }),
    estado: new FormControl<PedidoEstado>('pendiente', { nonNullable: true, validators: [Validators.required] }),
    detalles: new FormArray<FormGroup>([]),
  });

  readonly filteredOrders = computed(() => {
    const estado = this.estadoFiltro();
    return estado === 'todos' ? this.pedidos() : this.pedidos().filter((pedido) => pedido.estado === estado);
  });

  constructor() {
    this.addDetail();
    this.loadPage();
  }

  get detailsArray(): FormArray<FormGroup> {
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
      },
      error: (error: unknown) => {
        this.errorMessage.set(resolveApiError(error));
        this.loading.set(false);
      },
    });
  }

  addDetail(detail?: Partial<DetailFormValue>): void {
    this.detailsArray.push(
      new FormGroup({
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
      }),
    );
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
      detailGroup.get('precioUnitario')?.setValue(Number(product.precioVenta));
    }
  }

  totalDraft(): number {
    return this.detailsArray.controls.reduce((sum, group) => {
      const quantity = Number(group.get('cantidad')?.value ?? 0);
      const price = Number(group.get('precioUnitario')?.value ?? 0);
      return sum + quantity * price;
    }, 0);
  }

  detailSubtotal(index: number): number {
    const group = this.detailsArray.at(index);
    return Number(group.get('cantidad')?.value ?? 0) * Number(group.get('precioUnitario')?.value ?? 0);
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
        idDetalle: group.get('idDetalle')?.value,
        idProducto: Number(group.get('idProducto')?.value),
        cantidad: Number(group.get('cantidad')?.value),
        precioUnitario: Number(group.get('precioUnitario')?.value),
        subtotal: Number(group.get('cantidad')?.value) * Number(group.get('precioUnitario')?.value),
      })),
    };

    const request = this.editingId()
      ? this.pedidosService.update(this.editingId()!, payload)
      : this.pedidosService.create(payload);

    request.subscribe({
      next: () => {
        this.resetForm();
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
        });
      }
    } else {
      this.addDetail();
    }
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

  stateClass(estado: PedidoEstado): string {
    if (estado === 'completado') return 'completed';
    if (estado === 'cancelado') return 'cancelled';
    return 'pending';
  }
}
