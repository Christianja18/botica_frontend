export interface BoletaDTO {
  idBoleta?: number;
  numeroBoleta: string;
  idPedido: number;
  fechaEmision?: string | null;
  total?: number | null;
  igv?: number | null;
  totalConIgv?: number | null;
  datosCliente?: string | null;
  datosEmpleado?: string | null;
  impresa: boolean;
}
