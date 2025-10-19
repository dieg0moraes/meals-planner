import { Store, SearchResponse, SearchError, Product } from '@/types/products';

/**
 * Cliente para la API de búsqueda de productos.
 * Facilita las llamadas a /api/products/search desde el frontend.
 */
export class ProductsClient {
  private baseUrl: string;

  constructor(baseUrl: string = '/api/products/search') {
    this.baseUrl = baseUrl;
  }

  /**
   * Busca productos en TODOS los supermercados.
   * La API automáticamente busca en Disco y Tienda Inglesa en paralelo.
   * 
   * @param searchTerm - Término de búsqueda
   * @returns Respuesta con productos de todos los supermercados combinados
   */
  async search(searchTerm: string): Promise<SearchResponse | SearchError> {
    try {
      const params = new URLSearchParams({
        q: searchTerm
      });

      const response = await fetch(`${this.baseUrl}?${params}`);
      const data = await response.json();

      if (!response.ok) {
        return data as SearchError;
      }

      return data as SearchResponse;
    } catch (error) {
      return {
        success: false,
        error: 'Network error',
        message: 'No se pudo conectar con el servidor',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Verifica si una respuesta es exitosa.
   */
  static isSuccess(response: SearchResponse | SearchError): response is SearchResponse {
    return response.success === true;
  }

  /**
   * Filtra productos por precio máximo.
   */
  static filterByMaxPrice(products: Product[], maxPrice: number): Product[] {
    return products.filter(p => 
      p.priceNumeric !== null && p.priceNumeric <= maxPrice
    );
  }

  /**
   * Filtra productos por marca.
   */
  static filterByBrand(products: Product[], brand: string): Product[] {
    return products.filter(p => 
      p.brand?.toLowerCase().includes(brand.toLowerCase())
    );
  }

  /**
   * Filtra productos por supermercado.
   */
  static filterByStore(products: Product[], store: Store): Product[] {
    return products.filter(p => p.store === store);
  }

  /**
   * Agrupa productos por supermercado.
   */
  static groupByStore(products: Product[]): Record<Store, Product[]> {
    return {
      'disco': products.filter(p => p.store === 'disco'),
      'tienda-inglesa': products.filter(p => p.store === 'tienda-inglesa'),
      'tata': products.filter(p => p.store === 'tata')
    };
  }

  /**
   * Ordena productos por precio (menor a mayor).
   */
  static sortByPrice(products: Product[], ascending = true): Product[] {
    return [...products].sort((a, b) => {
      if (a.priceNumeric === null) return 1;
      if (b.priceNumeric === null) return -1;
      return ascending 
        ? a.priceNumeric - b.priceNumeric
        : b.priceNumeric - a.priceNumeric;
    });
  }

  /**
   * Encuentra el producto más barato.
   */
  static getCheapest(products: Product[]): Product | null {
    const sorted = this.sortByPrice(products, true);
    return sorted[0] || null;
  }

  /**
   * Compara precios entre supermercados.
   * 
   * @param products - Lista de productos (ya incluyen el campo store)
   * @returns Comparación de precios por supermercado
   */
  static compareStores(products: Product[]): {
    cheaperStore: Store | 'equal';
    discoAvgPrice: number;
    tiendaInglesaAvgPrice: number;
    tataAvgPrice: number;
    discoCount: number;
    tiendaInglesaCount: number;
    tataCount: number;
  } {
    const grouped = this.groupByStore(products);
    
    const discoAvg = this._calculateAveragePrice(grouped.disco);
    const tiendaInglesaAvg = this._calculateAveragePrice(grouped['tienda-inglesa']);
    const tataAvg = this._calculateAveragePrice(grouped.tata);

    // Encontrar el supermercado más barato
    const prices = [
      { store: 'disco' as Store, avg: discoAvg },
      { store: 'tienda-inglesa' as Store, avg: tiendaInglesaAvg },
      { store: 'tata' as Store, avg: tataAvg }
    ].filter(p => p.avg > 0);

    let cheaperStore: Store | 'equal' = 'equal';
    if (prices.length > 0) {
      prices.sort((a, b) => a.avg - b.avg);
      cheaperStore = prices[0].store;
    }

    return {
      cheaperStore,
      discoAvgPrice: discoAvg,
      tiendaInglesaAvgPrice: tiendaInglesaAvg,
      tataAvgPrice: tataAvg,
      discoCount: grouped.disco.length,
      tiendaInglesaCount: grouped['tienda-inglesa'].length,
      tataCount: grouped.tata.length
    };
  }

  private static _calculateAveragePrice(products: Product[]): number {
    const prices = products
      .map(p => p.priceNumeric)
      .filter((p): p is number => p !== null);

    if (prices.length === 0) return 0;

    return prices.reduce((sum, price) => sum + price, 0) / prices.length;
  }
}

// Exportar una instancia por defecto
export const productsClient = new ProductsClient();

