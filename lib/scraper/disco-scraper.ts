import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';

export interface Product {
  name: string | null;
  brand: string | null;
  price: string | null;
  priceNumeric: number | null;
  description: string | null;
  imageUrl: string | null;
  link: string | null;
}

/**
 * Scrapper para el sitio web de Disco Uruguay.
 * Extrae información de productos según el término de búsqueda.
 */
export class DiscoScraper {
  private baseUrl: string;
  private axiosInstance: AxiosInstance;

  constructor() {
    this.baseUrl = 'https://www.disco.com.uy';
    this.axiosInstance = axios.create({
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 30000
    });
  }

  /**
   * Extrae productos de la página de Disco según el término de búsqueda.
   * 
   * @param searchTerm - Término de búsqueda (ej: 'galletitas', 'leche', 'cereales')
   * @returns Lista de productos encontrados
   */
  async scrapeProducts(searchTerm: string): Promise<Product[]> {
    const encodedSearchTerm = encodeURIComponent(searchTerm);
    const url = `${this.baseUrl}/${encodedSearchTerm}/s?_q=${encodedSearchTerm}`;

    try {
      console.log(`[DiscoScraper] Scrapeando: ${url}`);
      const response = await this.axiosInstance.get(url);
      
      const $ = cheerio.load(response.data);
      const products = this._extractProducts($);
      
      console.log(`[DiscoScraper] Se encontraron ${products.length} productos`);
      return products;

    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          console.error(`[DiscoScraper] Error HTTP: ${error.response.status} - ${error.response.statusText}`);
        } else if (error.request) {
          console.error(`[DiscoScraper] Error de red: No se pudo conectar al servidor`);
        } else {
          console.error(`[DiscoScraper] Error: ${error.message}`);
        }
      } else {
        console.error(`[DiscoScraper] Error inesperado:`, error);
      }
      return [];
    }
  }

  /**
   * Extrae la información de los productos del HTML.
   */
  private _extractProducts($: cheerio.CheerioAPI): Product[] {
    const products: Product[] = [];

    // Buscar diferentes patrones de contenedores de productos (VTEX optimizado)
    const productSelectors = [
      '.vtex-product-summary-2-x-container',
      '.vtex-product-summary-2-x-element',
      '[class*="vtex-product-summary"]',
      'article[class*="product" i]',
      'div[class*="product-card" i]',
      'div[class*="product-item" i]',
      'div[class*="item-product" i]',
      'div[data-testid*="product" i]',
      '[class*="product"][class*="item"]',
      '[class*="card"][class*="product"]'
    ];

    let productContainers = $();
    for (const selector of productSelectors) {
      try {
        const elements = $(selector);
        if (elements.length > 0) {
          productContainers = elements;
          console.log(`[DiscoScraper] Usando selector: ${selector} (${elements.length} elementos)`);
          break;
        }
      } catch (e) {
        continue;
      }
    }

    // Si no encontramos contenedores específicos, buscar por estructura común
    if (productContainers.length === 0) {
      productContainers = $('div').filter((i, el) => {
        const className = $(el).attr('class') || '';
        return /product|item|card/i.test(className);
      });
    }

    productContainers.each((index, container) => {
      const productData = this._extractProductData($, container);
      if (productData && productData.name) {
        products.push(productData);
      }
    });

    return products;
  }

  /**
   * Extrae los datos de un contenedor de producto individual.
   */
  private _extractProductData($: cheerio.CheerioAPI, container: cheerio.Element): Product | null {
    try {
      const $container = $(container);
      const product: Product = {
        name: null,
        brand: null,
        price: null,
        priceNumeric: null,
        description: null,
        imageUrl: null,
        link: null
      };

      // Extraer nombre del producto (VTEX específico)
      const nameSelectors = [
        '.vtex-product-summary-2-x-productNameContainer',
        '[class*="productName"]',
        'h2', 'h3', 'h4',
        '[class*="name" i]',
        '[class*="title" i]',
        'a[title]'
      ];

      for (const selector of nameSelectors) {
        const nameElem = $container.find(selector).first();
        if (nameElem.length) {
          product.name = nameElem.text().trim() || nameElem.attr('title')?.trim() || null;
          if (product.name) break;
        }
      }

      // Extraer marca (VTEX específico)
      const brandSelectors = [
        '.vtex-product-summary-2-x-productBrandName',
        '[class*="productBrandName"]',
        '[class*="brand" i]',
        '[class*="marca" i]'
      ];
      
      for (const selector of brandSelectors) {
        const brandElem = $container.find(selector).first();
        if (brandElem.length) {
          product.brand = brandElem.text().trim() || null;
          if (product.brand) break;
        }
      }

      // Extraer precio (VTEX específico)
      const priceSelectors = [
        '.vtex-product-price-1-x-sellingPrice',
        '.vtex-product-price-1-x-currencyContainer',
        '[class*="sellingPrice"]',
        '[class*="price" i]',
        '[class*="precio" i]'
      ];

      for (const selector of priceSelectors) {
        const priceElem = $container.find(selector).first();
        if (priceElem.length) {
          const priceText = priceElem.text().trim();
          if (priceText) {
            product.price = priceText;
            
            // Extraer valor numérico del precio
            const priceMatch = priceText.match(/\$?\s*(\d+(?:[.,]\d+)*)/);
            if (priceMatch) {
              try {
                product.priceNumeric = parseFloat(
                  priceMatch[1].replace(/\./g, '').replace(',', '.')
                );
              } catch (e) {
                // Ignorar error de conversión
              }
            }
            break;
          }
        }
      }

      // Extraer imagen
      const imgElem = $container.find('img').first();
      if (imgElem.length) {
        let imgSrc = imgElem.attr('src') || 
                    imgElem.attr('data-src') || 
                    imgElem.attr('data-lazy-src');
        
        if (imgSrc) {
          if (imgSrc.startsWith('//')) {
            product.imageUrl = 'https:' + imgSrc;
          } else if (imgSrc.startsWith('/')) {
            product.imageUrl = this.baseUrl + imgSrc;
          } else {
            product.imageUrl = imgSrc;
          }
        }
      }

      // Extraer enlace
      const linkElem = $container.find('a[href]').first();
      if (linkElem.length) {
        let href = linkElem.attr('href');
        if (href) {
          if (href.startsWith('//')) {
            product.link = 'https:' + href;
          } else if (href.startsWith('/')) {
            product.link = this.baseUrl + href;
          } else {
            product.link = href;
          }
        }
      }

      // Extraer descripción adicional
      const descElem = $container.find('[class*="description" i], [class*="desc" i]').first();
      if (descElem.length) {
        product.description = descElem.text().trim() || null;
      }

      return product;

    } catch (error) {
      console.error(`[DiscoScraper] Error extrayendo datos del producto:`, error);
      return null;
    }
  }
}

