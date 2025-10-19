import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';

export interface TiendaInglesaProduct {
  name: string | null;
  brand: string | null;
  price: string | null;
  priceNumeric: number | null;
  description: string | null;
  imageUrl: string | null;
  link: string | null;
  availability: string | null;
}

/**
 * Scrapper para el sitio web de Tienda Inglesa Uruguay.
 * Extrae información de productos según el término de búsqueda.
 */
export class TiendaInglesaScraper {
  private baseUrl: string;
  private searchUrl: string;
  private axiosInstance: AxiosInstance;

  constructor() {
    this.baseUrl = 'https://www.tiendainglesa.com.uy';
    this.searchUrl = `${this.baseUrl}/supermercado/busqueda`;
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
   * Limpia el texto eliminando saltos de línea, tabs y espacios múltiples.
   */
  private cleanText(text: string | null | undefined): string | null {
    if (!text) return null;
    
    return text
      .replace(/[\n\r\t]/g, ' ')      // Reemplazar saltos de línea y tabs con espacio
      .replace(/\s+/g, ' ')            // Reemplazar múltiples espacios con uno solo
      .trim();                         // Eliminar espacios al inicio y final
  }

  /**
   * Extrae productos de la página de Tienda Inglesa según el término de búsqueda.
   * 
   * @param searchTerm - Término de búsqueda (ej: 'manteca', 'leche', 'pan integral')
   * @returns Lista de productos encontrados
   */
  async scrapeProducts(searchTerm: string): Promise<TiendaInglesaProduct[]> {
    // Formatear el término de búsqueda: reemplazar espacios con +
    const formattedTerm = searchTerm.trim().replace(/\s+/g, '+');
    
    // URL format: /supermercado/busqueda?0,0,termino,0
    const url = `${this.searchUrl}?0,0,${formattedTerm},0`;

    try {
      console.log(`[TiendaInglesaScraper] Scrapeando: ${url}`);
      const response = await this.axiosInstance.get(url);
      
      const $ = cheerio.load(response.data);
      const products = this._extractProducts($);
      
      console.log(`[TiendaInglesaScraper] Se encontraron ${products.length} productos`);
      return products;

    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          console.error(`[TiendaInglesaScraper] Error HTTP: ${error.response.status} - ${error.response.statusText}`);
        } else if (error.request) {
          console.error(`[TiendaInglesaScraper] Error de red: No se pudo conectar al servidor`);
        } else {
          console.error(`[TiendaInglesaScraper] Error: ${error.message}`);
        }
      } else {
        console.error(`[TiendaInglesaScraper] Error inesperado:`, error);
      }
      return [];
    }
  }

  /**
   * Extrae la información de los productos del HTML.
   */
  private _extractProducts($: any): TiendaInglesaProduct[] {
    const products: TiendaInglesaProduct[] = [];

    // Buscar contenedores de productos en Tienda Inglesa
    const productSelectors = [
      '.product-item',
      '.producto',
      '[class*="product"]',
      'article[class*="product"]',
      'div[class*="product-card"]',
      'li[class*="product"]',
      '.item-product',
      '[data-product]'
    ];

    let productContainers: any = null;
    for (const selector of productSelectors) {
      try {
        const elements = $(selector);
        if (elements.length > 0) {
          productContainers = elements;
          console.log(`[TiendaInglesaScraper] Usando selector: ${selector} (${elements.length} elementos)`);
          break;
        }
      } catch (e) {
        continue;
      }
    }

    // Si no encontramos contenedores específicos, buscar por estructura común
    if (!productContainers || productContainers.length === 0) {
      // Buscar divs o li que contengan información de productos
      productContainers = $('div, li, article').filter((i: any, el: any) => {
        const $el = $(el);
        const className = $el.attr('class') || '';
        const hasProductClass = /product|item|card/i.test(className);
        const hasImage = $el.find('img').length > 0;
        const hasPrice = $el.text().includes('$') || $el.find('[class*="price"]').length > 0;
        
        return hasProductClass && hasImage && hasPrice;
      });
      
      console.log(`[TiendaInglesaScraper] Búsqueda genérica encontró ${productContainers.length} elementos`);
    }

    productContainers.each((index: number, container: any) => {
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
  private _extractProductData($: any, container: any): TiendaInglesaProduct | null {
    try {
      const $container = $(container);
      const product: TiendaInglesaProduct = {
        name: null,
        brand: null,
        price: null,
        priceNumeric: null,
        description: null,
        imageUrl: null,
        link: null,
        availability: null
      };

      // Extraer nombre del producto
      const nameSelectors = [
        '[class*="product-name"]',
        '[class*="productName"]',
        '.product-title',
        '.title',
        'h2', 'h3', 'h4',
        '[class*="name"]',
        'a[title]',
        '.description'
      ];

      for (const selector of nameSelectors) {
        const nameElem = $container.find(selector).first();
        if (nameElem.length) {
          const text = this.cleanText(nameElem.text());
          const title = this.cleanText(nameElem.attr('title'));
          product.name = text || title || null;
          if (product.name && product.name.length > 3) break;
        }
      }

      // Si no encontramos nombre, buscar en atributos alt de imágenes
      if (!product.name) {
        const imgAlt = $container.find('img').first().attr('alt');
        if (imgAlt && imgAlt.trim().length > 3) {
          product.name = this.cleanText(imgAlt);
        }
      }

      // Extraer marca
      const brandSelectors = [
        '[class*="brand"]',
        '[class*="marca"]',
        '.manufacturer',
        '[data-brand]'
      ];
      
      for (const selector of brandSelectors) {
        const brandElem = $container.find(selector).first();
        if (brandElem.length) {
          product.brand = this.cleanText(brandElem.text());
          if (product.brand) break;
        }
      }

      // Extraer precio
      const priceSelectors = [
        '[class*="price"]',
        '[class*="precio"]',
        '.value',
        '[data-price]',
        '.cost',
        '.amount'
      ];

      for (const selector of priceSelectors) {
        const priceElem = $container.find(selector).first();
        if (priceElem.length) {
          const priceText = this.cleanText(priceElem.text());
          if (priceText && priceText.includes('$')) {
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

      // Si no encontramos precio con selectores específicos, buscar en todo el texto
      if (!product.price) {
        const containerText = this.cleanText($container.text());
        if (containerText) {
          const priceMatch = containerText.match(/\$\s*(\d+(?:[.,]\d+)*)/);
          if (priceMatch) {
            product.price = this.cleanText(priceMatch[0]);
            try {
              product.priceNumeric = parseFloat(
                priceMatch[1].replace(/\./g, '').replace(',', '.')
              );
            } catch (e) {
              // Ignorar
            }
          }
        }
      }

      // Extraer disponibilidad
      const availabilitySelectors = [
        '[class*="stock"]',
        '[class*="availability"]',
        '[class*="disponib"]',
        '.status'
      ];

      for (const selector of availabilitySelectors) {
        const availElem = $container.find(selector).first();
        if (availElem.length) {
          product.availability = this.cleanText(availElem.text());
          if (product.availability) break;
        }
      }

      // Buscar texto "Disponibles" en el contenedor
      if (!product.availability) {
        const containerText = this.cleanText($container.text());
        if (containerText?.includes('Disponibles')) {
          product.availability = 'Disponibles';
        }
      }

      // Extraer imagen
      const imgElem = $container.find('img').first();
      if (imgElem.length) {
        let imgSrc = imgElem.attr('src') || 
                    imgElem.attr('data-src') || 
                    imgElem.attr('data-lazy-src') ||
                    imgElem.attr('data-original');
        
        if (imgSrc) {
          if (imgSrc.startsWith('//')) {
            product.imageUrl = 'https:' + imgSrc;
          } else if (imgSrc.startsWith('/')) {
            product.imageUrl = this.baseUrl + imgSrc;
          } else if (!imgSrc.startsWith('http')) {
            product.imageUrl = this.baseUrl + '/' + imgSrc;
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
          } else if (!href.startsWith('http')) {
            product.link = this.baseUrl + '/' + href;
          } else {
            product.link = href;
          }
        }
      }

      // Extraer descripción adicional
      const descSelectors = [
        '[class*="description"]',
        '[class*="desc"]',
        '.details',
        '.info'
      ];

      for (const selector of descSelectors) {
        const descElem = $container.find(selector).first();
        if (descElem.length) {
          const desc = this.cleanText(descElem.text());
          if (desc && desc !== product.name) {
            product.description = desc;
            break;
          }
        }
      }

      return product;

    } catch (error) {
      console.error(`[TiendaInglesaScraper] Error extrayendo datos del producto:`, error);
      return null;
    }
  }
}

