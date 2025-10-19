/**
 * Tipos para productos de supermercados
 */

export type Store = 'disco' | 'tienda-inglesa' | 'tata';

export interface BaseProduct {
  name: string | null;
  brand: string | null;
  price: string | null;
  priceNumeric: number | null;
  description: string | null;
  imageUrl: string | null;
  link: string | null;
  store: Store;                    // Supermercado de origen
  storeName: string;               // Nombre legible del supermercado
}

export interface DiscoProduct extends BaseProduct {}

export interface TiendaInglesaProduct extends BaseProduct {
  availability: string | null;
}

export interface TataProduct extends BaseProduct {
  availability: string | null;
}

export type Product = DiscoProduct | TiendaInglesaProduct | TataProduct;

export interface SearchResponse<T = Product> {
  success: boolean;
  store?: Store;                   // Opcional cuando es búsqueda combinada
  storeName?: string;              // Opcional cuando es búsqueda combinada
  searchTerm: string;
  count: number;
  products: T[];
  timestamp: string;
  stores?: {                       // Información por supermercado (cuando es combinado)
    disco: {
      count: number;
      success: boolean;
    };
    tiendaInglesa: {
      count: number;
      success: boolean;
    };
    tata: {
      count: number;
      success: boolean;
    };
  };
}

export interface SearchError {
  success: false;
  error: string;
  message: string;
  details?: string;
}

