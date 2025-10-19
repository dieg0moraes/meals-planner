import axios, { AxiosInstance } from 'axios';

export interface TataProduct {
  name: string | null;
  brand: string | null;
  price: string | null;
  priceNumeric: number | null;
  description: string | null;
  imageUrl: string | null;
  link: string | null;
  availability: string | null;
  store: 'tata';
  storeName: 'Tata';
}

interface TataAPIProduct {
  id: string;
  slug: string;
  name: string;
  brand?: {
    name: string;
    brandName: string;
  };
  image?: Array<{
    url: string;
    alternateName: string;
  }>;
  offers?: {
    lowPrice: number;
    offers: Array<{
      availability: string;
      price: number;
      listPrice: number;
    }>;
  };
}

interface TataAPIResponse {
  data?: {
    search?: {
      suggestions?: {
        products?: TataAPIProduct[];
      };
    };
  };
}

/**
 * Scrapper para el sitio web de Tata Uruguay.
 * Extrae información de productos desde su API JSON según el término de búsqueda.
 */
export class TataScraper {
  private baseUrl: string;
  private axiosInstance: AxiosInstance;

  constructor() {
    this.baseUrl = 'https://www.tata.com.uy';
    
    this.axiosInstance = axios.create({
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        'Content-Type': 'application/json',
      },
      timeout: 30000
    });
  }

  /**
   * Construye la URL de búsqueda para la API GraphQL de Tata.
   * 
   * URL format:
   * /api/graphql?operationName=SearchSuggestionsQuery&variables={encodedJSON}
   * 
   * Variables JSON:
   * {
   *   "term": "coca",
   *   "selectedFacets": [
   *     {"key": "channel", "value": "{\"salesChannel\":\"4\",\"regionId\":\"U1cjdGF0YXV5bW9udGV2aWRlbw==\"}"},
   *     {"key": "locale", "value": "es-UY"}
   *   ]
   * }
   */
  private buildSearchUrl(searchTerm: string): string {
    // Construir el objeto de variables GraphQL
    const variables = {
      term: searchTerm,
      selectedFacets: [
        {
          key: "channel",
          value: JSON.stringify({
            salesChannel: "4",
            regionId: "U1cjdGF0YXV5bW9udGV2aWRlbw=="
          })
        },
        {
          key: "locale",
          value: "es-UY"
        }
      ]
    };

    // Convertir a JSON y encodear para URL
    const encodedVariables = encodeURIComponent(JSON.stringify(variables));
    
    // Construir la URL completa
    return `${this.baseUrl}/api/graphql?operationName=SearchSuggestionsQuery&variables=${encodedVariables}`;
  }

  /**
   * Extrae productos de la API de Tata según el término de búsqueda.
   * 
   * @param searchTerm - Término de búsqueda (ej: 'coca', 'leche', 'pan')
   * @returns Lista de productos encontrados
   */
  async scrapeProducts(searchTerm: string): Promise<TataProduct[]> {
    const url = this.buildSearchUrl(searchTerm);

    try {
      console.log(`[TataScraper] Consultando API: ${url}`);
      const response = await this.axiosInstance.get<TataAPIResponse>(url);
      
      const products = this._extractProducts(response.data);
      
      console.log(`[TataScraper] Se encontraron ${products.length} productos`);
      return products;

    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          console.error(`[TataScraper] Error HTTP: ${error.response.status} - ${error.response.statusText}`);
        } else if (error.request) {
          console.error(`[TataScraper] Error de red: No se pudo conectar al servidor`);
        } else {
          console.error(`[TataScraper] Error: ${error.message}`);
        }
      } else {
        console.error(`[TataScraper] Error inesperado:`, error);
      }
      return [];
    }
  }

  /**
   * Extrae productos del JSON de respuesta de la API.
   */
  private _extractProducts(data: TataAPIResponse): TataProduct[] {
    const products: TataProduct[] = [];

    // Navegar a la estructura data.search.suggestions.products
    const apiProducts = data?.data?.search?.suggestions?.products;

    if (!apiProducts || !Array.isArray(apiProducts)) {
      console.warn('[TataScraper] No se encontraron productos en la respuesta de la API');
      return products;
    }

    for (const apiProduct of apiProducts) {
      const product = this._parseProduct(apiProduct);
      if (product) {
        products.push(product);
      }
    }

    return products;
  }

  /**
   * Parsea un producto individual del JSON de la API.
   */
  private _parseProduct(apiProduct: TataAPIProduct): TataProduct | null {
    try {
      // Extraer nombre
      const name = apiProduct.name || null;

      // Extraer marca
      const brand = apiProduct.brand?.name || apiProduct.brand?.brandName || null;

      // Extraer precio
      let price: string | null = null;
      let priceNumeric: number | null = null;
      
      if (apiProduct.offers?.lowPrice) {
        priceNumeric = apiProduct.offers.lowPrice;
        price = `$ ${priceNumeric}`;
      } else if (apiProduct.offers?.offers?.[0]?.price) {
        priceNumeric = apiProduct.offers.offers[0].price;
        price = `$ ${priceNumeric}`;
      }

      // Extraer imagen (primera imagen disponible)
      const imageUrl = apiProduct.image?.[0]?.url || null;

      // Construir link al producto
      const link = apiProduct.slug 
        ? `${this.baseUrl}/${apiProduct.slug}/p`
        : null;

      // Extraer disponibilidad
      let availability: string | null = null;
      if (apiProduct.offers?.offers?.[0]?.availability) {
        const availabilityUrl = apiProduct.offers.offers[0].availability;
        // Convertir schema.org URL a texto legible
        availability = availabilityUrl.includes('InStock') ? 'Disponible' : 'No disponible';
      }

      return {
        name,
        brand,
        price,
        priceNumeric,
        description: null, // Tata no incluye descripción en suggestions
        imageUrl,
        link,
        availability,
        store: 'tata',
        storeName: 'Tata'
      };

    } catch (error) {
      console.error(`[TataScraper] Error parseando producto:`, error);
      return null;
    }
  }
}

