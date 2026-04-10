import { BoletaDTO } from './models';

export function buildPrintableBoletaDocument(boleta: BoletaDTO, context: {
  total: number;
  subtotal: number;
  igv: number;
  issueDate: string;
  clientSummary: string;
  userSummary: string;
}): string {
  const detailRows = buildPrintableDetailRows(boleta);
  const itemCount = boletaItemCount(boleta);
  const pedidoNumber = boleta.pedido?.idPedido ?? boleta.idPedido ?? '-';

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>Boleta ${escapeHtml(boleta.numeroBoleta)}</title>
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
        <p class="doc-number">${escapeHtml(boleta.numeroBoleta)}</p>
      </section>

      <div class="divider"></div>

      <section class="section">
        <div class="meta-row">
          <span class="meta-label">Fecha emision</span>
          <span class="meta-value">${escapeHtml(context.issueDate)}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Pedido venta</span>
          <span class="meta-value">${escapeHtml(String(pedidoNumber))}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Cliente</span>
          <span class="meta-value">${escapeHtml(context.clientSummary)}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Responsable</span>
          <span class="meta-value">${escapeHtml(context.userSummary)}</span>
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
          <strong>${formatCurrency(context.subtotal)}</strong>
        </div>
        <div class="summary-row">
          <span>IGV</span>
          <strong>${formatCurrency(context.igv)}</strong>
        </div>
        <div class="summary-row total">
          <span>Total</span>
          <strong>${formatCurrency(context.total)}</strong>
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

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

export function boletaItemCount(boleta: BoletaDTO): number {
  return (boleta.pedido?.detalles ?? []).reduce((sum, detail) => sum + Number(detail.cantidad ?? 0), 0);
}

export function buildPrintableDetailRows(boleta: BoletaDTO): string {
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
          <span class="item-name">${escapeHtml(productName)}</span>
          ${code ? `<span class="item-code">${escapeHtml(code)}</span>` : ''}
        </div>
        <span class="numeric">${quantity}</span>
        <span class="numeric">${formatCurrency(unitPrice)}</span>
        <span class="numeric">${formatCurrency(rowSubtotal)}</span>
      </div>`;
    })
    .join('');
}

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
