import { ResourcePageConfig } from '../../shared/resource-crud/resource-page.types';

export const categoriasPageConfig: ResourcePageConfig = {
  key: 'categorias',
  idKey: 'idCategoria',
  title: 'Categorias',
  description: 'Estructura el catalogo de la botica por familia comercial o terapeutica.',
  createLabel: 'categoria',
  emptyState: 'Todavia no hay categorias creadas.',
  searchableFields: ['nombre', 'descripcion'],
  columns: [
    { key: 'nombre', label: 'Nombre' },
    { key: 'descripcion', label: 'Descripcion' },
  ],
  fields: [
    { key: 'nombre', label: 'Nombre', type: 'text', required: true, maxLength: 100 },
    { key: 'descripcion', label: 'Descripcion', type: 'textarea', maxLength: 500 },
  ],
};
