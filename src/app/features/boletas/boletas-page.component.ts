import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';

import { BoletasService } from './services';
import { BoletaDTO } from './models';
import { ResourcePageComponent } from '../../shared/resource-crud/resource-page.component';
import { boletasPageConfig } from './boletas.config';
import { resolveApiError } from '../../core/services';

@Component({
  selector: 'app-boletas-page',
  imports: [CommonModule, CurrencyPipe, ResourcePageComponent],
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

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.crudViewMode.set(params.get('vista') === 'formulario' ? 'form' : 'list');
    });
    this.loadBoletas();
  }

  loadBoletas(): void {
    this.loadingBoletas.set(true);
    this.errorMessage.set(null);
    this.resourceService.list().subscribe({
      next: (boletas) => {
        this.boletas.set(
          [...boletas].sort((current, next) => Number(next.idBoleta ?? 0) - Number(current.idBoleta ?? 0)),
        );
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
      parts.push(this.formatCurrency(Number(pedido.total)));
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
    const total = this.boletaTotal(boleta);
    const subtotal = Number(boleta.total ?? 0);
    const igv = Number(boleta.igv ?? 0);
    const detailRows = this.buildPrintableDetailRows(boleta);
    const itemCount = this.boletaItemCount(boleta);
    const issueDate = this.boletaDate(boleta);
    const clientSummary = this.pedidoClientSummary(boleta);
    const userSummary = this.pedidoUserSummary(boleta);
    const pedidoNumber = boleta.pedido?.idPedido ?? boleta.idPedido ?? '-';

    return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>Boleta ${this.escapeHtml(boleta.numeroBoleta)}</title>
    <style>
      :root {
        color-scheme: light;
        font-family: "Segoe UI", Arial, sans-serif;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        padding: 8px;
        background: #f5f5f5;
        color: #111;
      }
      .receipt {
        width: 80mm;
        max-width: 80mm;
        margin: 0 auto;
        background: #fff;
        border: 1px solid #222;
        padding: 14px 12px 10px;
      }
      .center {
        text-align: center;
      }
      .brand {
        margin: 0 0 4px;
        font-size: 24px;
        font-weight: 800;
        font-style: italic;
        letter-spacing: 0.02em;
      }
      .company-line {
        margin: 0;
        font-size: 11px;
        line-height: 1.25;
      }
      .doc-type {
        margin: 10px 0 6px;
        font-size: 13px;
        font-weight: 800;
      }
      .doc-number {
        margin: 0 0 10px;
        font-size: 14px;
        font-weight: 800;
      }
      .section {
        margin: 8px 0;
      }
      .meta-row {
        display: flex;
        gap: 8px;
        justify-content: space-between;
        align-items: flex-start;
        margin: 2px 0;
        font-size: 11px;
      }
      .meta-label {
        font-weight: 700;
        flex: 0 0 auto;
      }
      .meta-value {
        text-align: right;
        flex: 1 1 auto;
        white-space: pre-wrap;
      }
      .divider {
        border-top: 1px dashed #222;
        margin: 10px 0;
      }
      .items-head,
      .item-row {
        display: grid;
        grid-template-columns: 1fr 34px 52px 58px;
        gap: 6px;
        align-items: start;
      }
      .items-head {
        font-size: 10px;
        font-weight: 800;
        text-transform: uppercase;
        margin-bottom: 6px;
      }
      .item-row {
        font-size: 10px;
        padding: 5px 0;
        border-top: 1px dotted #bbb;
      }
      .item-row:first-of-type {
        border-top: 0;
      }
      .item-name {
        font-weight: 700;
        display: block;
      }
      .item-code {
        display: block;
        margin-top: 2px;
        font-size: 9px;
      }
      .numeric {
        text-align: right;
      }
      .summary-row {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        margin: 3px 0;
        font-size: 11px;
      }
      .summary-row.total {
        margin-top: 8px;
        font-size: 13px;
        font-weight: 800;
      }
      .muted {
        font-size: 10px;
      }
      .footer {
        text-align: center;
        font-size: 10px;
        margin-top: 12px;
      }
      @media print {
        body {
          padding: 0;
          background: white;
        }
        .receipt {
          width: 80mm;
          max-width: 80mm;
          border: 0;
        }
      }
    </style>
    <script>
      window.addEventListener('load', () => {
        window.setTimeout(() => {
          window.focus();
          window.print();
        }, 180);
      });
      window.addEventListener('afterprint', () => {
        window.setTimeout(() => window.close(), 120);
      });
    </script>
  </head>
  <body>
    <main class="receipt">
      <section class="center">
        <h1 class="brand">Josue Farma</h1>
        <p class="company-line">BOTIQUIN & BAZAR</p>
        <p class="company-line">RUC 20512009000</p>
        <p class="company-line">Central: Av. Principal 123 - Trujillo</p>
        <p class="company-line">Tel: 2130760</p>
        <p class="doc-type">BOLETA ELECTRONICA</p>
        <p class="doc-number">${this.escapeHtml(boleta.numeroBoleta)}</p>
      </section>

      <div class="divider"></div>

      <section class="section">
        <div class="meta-row">
          <span class="meta-label">Fecha emision</span>
          <span class="meta-value">${this.escapeHtml(issueDate)}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Pedido venta</span>
          <span class="meta-value">${this.escapeHtml(String(pedidoNumber))}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Cliente</span>
          <span class="meta-value">${this.escapeHtml(clientSummary)}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Responsable</span>
          <span class="meta-value">${this.escapeHtml(userSummary)}</span>
        </div>
      </section>

      <div class="divider"></div>

      <section class="section">
        <div class="items-head">
          <span>Descripcion</span>
          <span class="numeric">Cant.</span>
          <span class="numeric">P. Unit</span>
          <span class="numeric">Importe</span>
        </div>
        ${detailRows}
      </section>

      <div class="divider"></div>

      <section class="section">
        <div class="summary-row">
          <span>Cant. productos</span>
          <strong>${itemCount}</strong>
        </div>
        <div class="summary-row">
          <span>Subtotal</span>
          <strong>${this.formatCurrency(subtotal)}</strong>
        </div>
        <div class="summary-row">
          <span>IGV</span>
          <strong>${this.formatCurrency(igv)}</strong>
        </div>
        <div class="summary-row total">
          <span>Total</span>
          <strong>${this.formatCurrency(total)}</strong>
        </div>
      </section>

      <div class="divider"></div>

      <footer class="footer">
        <div>${boleta.impresa ? 'REIMPRESION' : 'PRIMERA IMPRESION'}</div>
        <div class="muted">Documento generado desde el sistema web.</div>
      </footer>
    </main>
  </body>
</html>`;
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value || 0));
  }

  private boletaItemCount(boleta: BoletaDTO): number {
    return (boleta.pedido?.detalles ?? []).reduce((sum, detail) => sum + Number(detail.cantidad ?? 0), 0);
  }

  private buildPrintableDetailRows(boleta: BoletaDTO): string {
    const details = boleta.pedido?.detalles ?? [];
    if (!details.length) {
      return `
        <div class="item-row">
          <span>No hay detalle disponible para este pedido.</span>
          <span></span>
          <span></span>
          <span></span>
        </div>`;
    }

    return details
      .map((detail) => {
        const productName = detail.producto?.nombre || `Producto #${detail.producto?.idProducto ?? '-'}`;
        const code = detail.producto?.codigoBarras ? `Codigo: ${detail.producto.codigoBarras}` : '';
        const quantity = Number(detail.cantidad ?? 0);
        const unitPrice = Number(detail.precioUnitario ?? 0);
        const rowSubtotal = Number(detail.subtotal ?? quantity * unitPrice);

        return `
        <div class="item-row">
          <div>
            <span class="item-name">${this.escapeHtml(productName)}</span>
            ${code ? `<span class="item-code">${this.escapeHtml(code)}</span>` : ''}
          </div>
          <span class="numeric">${quantity}</span>
          <span class="numeric">${this.formatCurrency(unitPrice)}</span>
          <span class="numeric">${this.formatCurrency(rowSubtotal)}</span>
        </div>`;
      })
      .join('');
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

  private escapeHtml(value: unknown): string {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }
}
