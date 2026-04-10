import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';

import { BoletasService } from './services';
import { BoletaDTO } from './models';
import { ResourcePageComponent } from '../../shared/resource-crud/resource-page.component';
import { boletasPageConfig } from './boletas.config';
import { resolveApiError } from '../../core/services';
import { buildPrintableBoletaDocument, formatCurrency } from './boleta-print.util';

@Component({
  selector: 'app-boletas-page',
  imports: [CommonModule, FormsModule, CurrencyPipe, ResourcePageComponent],
  templateUrl: './boletas-page.component.html',
  styleUrl: './boletas-page.component.css',
})
export class BoletasPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly resourceService = inject(BoletasService);
  readonly config = boletasPageConfig;
  readonly boletas = signal<BoletaDTO[]>([]);
  readonly crudViewMode = signal<'list' | 'form'>('list');
  readonly loadingBoletas = signal(true);
  readonly printingId = signal<number | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly printPage = signal(0);
  readonly printPageSize = signal(5);
  readonly printTotalElements = signal(0);
  readonly printTotalPages = signal(1);
  readonly pageSizeOptions = [5, 10, 15, 20, 50];

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.crudViewMode.set(params.get('vista') === 'formulario' ? 'form' : 'list');
    });
    this.loadBoletas();
  }

  loadBoletas(resetPage = false): void {
    if (resetPage) {
      this.printPage.set(0);
    }

    this.loadingBoletas.set(true);
    this.errorMessage.set(null);
    this.resourceService
      .listPage({
        page: this.printPage(),
        size: this.printPageSize(),
        sortBy: 'idBoleta',
        direction: 'desc',
      })
      .subscribe({
      next: (response) => {
        this.boletas.set(response.content);
        this.printPage.set(response.page);
        this.printPageSize.set(response.size);
        this.printTotalElements.set(response.totalElements);
        this.printTotalPages.set(Math.max(response.totalPages, 1));
        this.loadingBoletas.set(false);
      },
      error: (error: unknown) => {
        this.errorMessage.set(resolveApiError(error));
        this.loadingBoletas.set(false);
      },
    });
  }

  printBoleta(boleta: BoletaDTO): void {
    const popup = window.open('', '_blank', 'width=840,height=720');
    if (!popup) {
      this.errorMessage.set('No se pudo abrir la ventana de impresion. Verifica si el navegador bloqueo el popup.');
      return;
    }

    this.printingId.set(boleta.idBoleta ?? null);

    const printableDocument = this.buildPrintableDocument(boleta);

    popup.document.open();
    popup.document.write(printableDocument);
    popup.document.close();
    popup.focus();

    if (!boleta.impresa && boleta.idBoleta) {
      this.resourceService.update(boleta.idBoleta, { ...boleta, impresa: true }).subscribe({
        next: (updatedBoleta) => {
          this.boletas.update((items) =>
            items.map((item) => (item.idBoleta === updatedBoleta.idBoleta ? updatedBoleta : item)),
          );
          this.printingId.set(null);
        },
        error: (error: unknown) => {
          this.errorMessage.set(resolveApiError(error));
          this.printingId.set(null);
        },
      });
      return;
    }

    this.printingId.set(null);
  }

  boletaTotal(boleta: BoletaDTO): number {
    if (boleta.totalConIgv !== null && boleta.totalConIgv !== undefined) {
      return Number(boleta.totalConIgv);
    }

    return Number(boleta.total ?? 0) + Number(boleta.igv ?? 0);
  }

  boletaDate(boleta: BoletaDTO): string {
    return boleta.fechaEmision || 'Fecha no registrada';
  }

  handleBoletaSaved(): void {
    this.loadBoletas(true);
  }

  printRangeLabel(): string {
    if (!this.printTotalElements()) {
      return 'Sin boletas registradas';
    }

    const start = this.printPage() * this.printPageSize() + 1;
    const end = Math.min(start + this.boletas().length - 1, this.printTotalElements());
    return `Mostrando ${start}-${end} de ${this.printTotalElements()} boletas`;
  }

  previousPrintPage(): void {
    if (this.printPage() === 0) {
      return;
    }

    this.printPage.update((page) => page - 1);
    this.loadBoletas();
  }

  nextPrintPage(): void {
    if (this.printPage() + 1 >= this.printTotalPages()) {
      return;
    }

    this.printPage.update((page) => page + 1);
    this.loadBoletas();
  }

  changePrintPageSize(value: number): void {
    if (value === this.printPageSize()) {
      return;
    }

    this.printPageSize.set(value);
    this.printPage.set(0);
    this.loadBoletas();
  }

  pedidoSummary(boleta: BoletaDTO): string {
    const pedido = boleta.pedido;
    if (!pedido) {
      return `Pedido #${boleta.idPedido}`;
    }

    const parts = [`Pedido #${pedido.idPedido ?? boleta.idPedido}`];
    if (pedido.estado) {
      parts.push(this.capitalize(pedido.estado));
    }
    if (pedido.total !== null && pedido.total !== undefined) {
      parts.push(formatCurrency(Number(pedido.total)));
    }

    return parts.join(' · ');
  }

  pedidoClientSummary(boleta: BoletaDTO): string {
    const cliente = boleta.pedido?.cliente;
    if (!cliente) {
      return this.displayEntityData(boleta.datosCliente, ['email']);
    }

    const name = [cliente.nombre, cliente.apellido].filter(Boolean).join(' ').trim();
    const details = [name, cliente.dni ? `DNI: ${cliente.dni}` : null, cliente.telefono]
      .filter(Boolean)
      .join('\n');

    return details || this.displayEntityData(boleta.datosCliente, ['email']);
  }

  pedidoUserSummary(boleta: BoletaDTO): string {
    const usuario = boleta.pedido?.usuario;
    if (!usuario) {
      return this.displayEntityData(boleta.datosEmpleado, ['email']);
    }

    const name = [usuario.nombre, usuario.apellido].filter(Boolean).join(' ').trim();
    return name || this.displayEntityData(boleta.datosEmpleado, ['email']);
  }

  displayEntityData(rawValue: string | null | undefined, hiddenKeys: string[] = []): string {
    if (!rawValue) {
      return 'Sin datos registrados';
    }

    try {
      const parsed = JSON.parse(rawValue) as Record<string, unknown>;
      return Object.entries(parsed)
        .filter(([key]) => !hiddenKeys.includes(key))
        .map(([key, value]) => `${this.humanizeKey(key)}: ${value ?? '-'}`)
        .join('\n');
    } catch {
      return rawValue;
    }
  }

  private buildPrintableDocument(boleta: BoletaDTO): string {
    return buildPrintableBoletaDocument(boleta, {
      total: this.boletaTotal(boleta),
      subtotal: Number(boleta.total ?? 0),
      igv: Number(boleta.igv ?? 0),
      issueDate: this.boletaDate(boleta),
      clientSummary: this.pedidoClientSummary(boleta),
      userSummary: this.pedidoUserSummary(boleta),
    });
  }

  private humanizeKey(key: string): string {
    return key
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replaceAll('_', ' ')
      .replace(/^\w/, (char) => char.toUpperCase());
  }

  private capitalize(value: string): string {
    return value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : value;
  }

}
