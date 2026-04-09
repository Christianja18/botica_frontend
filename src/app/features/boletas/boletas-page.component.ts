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

  displayEntityData(rawValue: string | null | undefined): string {
    if (!rawValue) {
      return 'Sin datos registrados';
    }

    try {
      const parsed = JSON.parse(rawValue) as Record<string, unknown>;
      return Object.entries(parsed)
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
        padding: 32px;
        background: #f4efe5;
        color: #1f2937;
      }
      .ticket {
        max-width: 720px;
        margin: 0 auto;
        background: #fffdf8;
        border: 1px solid #d9c9a3;
        border-radius: 20px;
        overflow: hidden;
      }
      .hero {
        padding: 28px 32px 20px;
        background: linear-gradient(135deg, #0f766e, #14532d);
        color: white;
      }
      .hero h1 {
        margin: 0 0 6px;
        font-size: 28px;
      }
      .hero p {
        margin: 0;
        opacity: 0.85;
      }
      .content {
        padding: 28px 32px 32px;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px 18px;
        margin-bottom: 24px;
      }
      .field {
        padding: 14px 16px;
        border: 1px solid #eadfca;
        border-radius: 14px;
        background: #fffcf5;
      }
      .label {
        display: block;
        margin-bottom: 6px;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #6b7280;
      }
      .value {
        font-size: 16px;
        font-weight: 600;
        white-space: pre-wrap;
      }
      .summary {
        border-top: 1px dashed #d4c2a1;
        border-bottom: 1px dashed #d4c2a1;
        padding: 18px 0;
        margin: 18px 0 24px;
      }
      .summary-row {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding: 6px 0;
        font-size: 16px;
      }
      .summary-row.total {
        font-size: 22px;
        font-weight: 700;
        color: #14532d;
      }
      .footer {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        align-items: center;
        font-size: 13px;
        color: #6b7280;
      }
      .badge {
        display: inline-flex;
        padding: 8px 12px;
        border-radius: 999px;
        background: ${boleta.impresa ? '#dcfce7' : '#fef3c7'};
        color: ${boleta.impresa ? '#166534' : '#92400e'};
        font-weight: 700;
      }
      @media print {
        body {
          padding: 0;
          background: white;
        }
        .ticket {
          border: 0;
          border-radius: 0;
          max-width: none;
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
    <main class="ticket">
      <section class="hero">
        <h1>Botica Horizonte</h1>
        <p>Comprobante de venta</p>
      </section>
      <section class="content">
        <div class="grid">
          <article class="field">
            <span class="label">Numero de boleta</span>
            <span class="value">${this.escapeHtml(boleta.numeroBoleta)}</span>
          </article>
          <article class="field">
            <span class="label">Pedido asociado</span>
            <span class="value">#${this.escapeHtml(String(boleta.idPedido))}</span>
          </article>
          <article class="field">
            <span class="label">Fecha de emision</span>
            <span class="value">${this.escapeHtml(this.boletaDate(boleta))}</span>
          </article>
          <article class="field">
            <span class="label">Estado</span>
            <span class="value">${boleta.impresa ? 'Impresa' : 'Pendiente de impresion'}</span>
          </article>
          <article class="field">
            <span class="label">Datos del cliente</span>
            <span class="value">${this.escapeHtml(this.displayEntityData(boleta.datosCliente))}</span>
          </article>
          <article class="field">
            <span class="label">Datos del empleado</span>
            <span class="value">${this.escapeHtml(this.displayEntityData(boleta.datosEmpleado))}</span>
          </article>
        </div>

        <section class="summary">
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

        <footer class="footer">
          <span>Documento generado desde el sistema web de la botica.</span>
          <span class="badge">${boleta.impresa ? 'Reimpresion' : 'Primera impresion'}</span>
        </footer>
      </section>
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

  private humanizeKey(key: string): string {
    return key
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replaceAll('_', ' ')
      .replace(/^\w/, (char) => char.toUpperCase());
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
