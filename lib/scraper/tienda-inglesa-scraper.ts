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
      console.log(`[TiendaInglesaScraper] 🔍 Scrapeando: ${url}`);
      console.log(`[TiendaInglesaScraper] 📝 Término de búsqueda: "${searchTerm}"`);
      
      const response = await this.axiosInstance.get(url);
      console.log(`[TiendaInglesaScraper] ✅ Respuesta HTTP: ${response.status}`);
      console.log(`[TiendaInglesaScraper] 📦 Tamaño de respuesta: ${response.data.length} bytes`);
      
      const $ = cheerio.load(response.data);
      const products = this._extractProducts($, searchTerm);
      
      console.log(`[TiendaInglesaScraper] ✨ Se encontraron ${products.length} productos`);
      
      // Log de resumen de productos
      if (products.length > 0) {
        console.log(`[TiendaInglesaScraper] 📊 Resumen de productos:`);
        products.forEach((p, idx) => {
          console.log(`  ${idx + 1}. ${p.name} - ${p.price || 'sin precio'} - ${p.brand || 'sin marca'}`);
        });
      } else {
        console.warn(`[TiendaInglesaScraper] ⚠️ No se encontraron productos para "${searchTerm}"`);
        // Guardar HTML para análisis si no hay productos
        const bodyText = $('body').text().substring(0, 500);
        console.log(`[TiendaInglesaScraper] 📄 Muestra del contenido HTML: ${bodyText}`);
      }
      
      return products;

    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          console.error(`[TiendaInglesaScraper] ❌ Error HTTP: ${error.response.status} - ${error.response.statusText}`);
          console.error(`[TiendaInglesaScraper] 📄 URL que falló: ${url}`);
        } else if (error.request) {
          console.error(`[TiendaInglesaScraper] 🌐 Error de red: No se pudo conectar al servidor`);
        } else {
          console.error(`[TiendaInglesaScraper] ⚠️ Error: ${error.message}`);
        }
      } else {
        console.error(`[TiendaInglesaScraper] 💥 Error inesperado:`, error);
      }
      return [];
    }
  }

  /**
   * Extrae la información de los productos del HTML.
   */
  private _extractProducts($: any, searchTerm: string): TiendaInglesaProduct[] {
    const products: TiendaInglesaProduct[] = [];

    console.log(`[TiendaInglesaScraper] 🔎 Buscando contenedores de productos...`);

    // Buscar contenedores de productos en Tienda Inglesa
    const productSelectors = [
      '.card-product-container',   // Selector específico de Tienda Inglesa (contenedor principal)
      'div.card-product-container',
      '[class*="card-product-container"]',
      '[class*="card-product"]',
      '.card-product',
      'div[class*="card-product"]',
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
    let selectorUsed: string | null = null;
    
    for (const selector of productSelectors) {
      try {
        const elements = $(selector);
        if (elements.length > 0) {
          productContainers = elements;
          selectorUsed = selector;
          console.log(`[TiendaInglesaScraper] ✅ Usando selector: "${selector}" (${elements.length} elementos)`);
          break;
        }
      } catch (e) {
        console.log(`[TiendaInglesaScraper] ⚠️ Error con selector "${selector}":`, e);
        continue;
      }
    }

    // Si no encontramos contenedores específicos, buscar por estructura común
    if (!productContainers || productContainers.length === 0) {
      console.log(`[TiendaInglesaScraper] 🔄 Selectores específicos no funcionaron, intentando búsqueda genérica...`);
      
      // Buscar divs o li que contengan información de productos
      productContainers = $('div, li, article').filter((i: any, el: any) => {
        const $el = $(el);
        const className = $el.attr('class') || '';
        const hasProductClass = /product|item|card/i.test(className);
        const hasImage = $el.find('img').length > 0;
        const hasPrice = $el.text().includes('$') || $el.find('[class*="price"]').length > 0;
        
        return hasProductClass && hasImage && hasPrice;
      });
      
      console.log(`[TiendaInglesaScraper] 🔍 Búsqueda genérica encontró ${productContainers.length} elementos`);
      selectorUsed = 'búsqueda genérica';
    }

    if (!productContainers || productContainers.length === 0) {
      console.warn(`[TiendaInglesaScraper] ❌ No se encontraron contenedores de productos`);
      // Log de clases disponibles en la página
      const allClasses = new Set<string>();
      $('[class]').each((_: any, el: any) => {
        const classes = $(el).attr('class')?.split(' ') || [];
        classes.forEach((c: string) => allClasses.add(c));
      });
      console.log(`[TiendaInglesaScraper] 📋 Clases CSS disponibles (primeras 20):`, Array.from(allClasses).slice(0, 20));
    }

    let successCount = 0;
    let failedCount = 0;

    productContainers.each((index: number, container: any) => {
      const productData = this._extractProductData($, container, index);
      if (productData && productData.name) {
        products.push(productData);
        successCount++;
      } else {
        failedCount++;
      }
    });

    console.log(`[TiendaInglesaScraper] 📈 Extracción completada: ${successCount} exitosos, ${failedCount} fallidos`);
    
    return products;
  }

  /**
   * Extrae los datos de un contenedor de producto individual.
   */
  private _extractProductData($: any, container: any, index: number): TiendaInglesaProduct | null {
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

      console.log(`[TiendaInglesaScraper] 🔍 Extrayendo producto #${index + 1}...`);

      // Extraer nombre del producto
      const nameSelectors = [
        'span.card-product-name',   // Selector específico de Tienda Inglesa (span dentro de card-product-name-and-price)
        '.card-product-name',
        '[class*="card-product-name"]',
        '[class*="product-name"]',
        '[class*="productName"]',
        '.product-title',
        '.title',
        'h2', 'h3', 'h4',
        '[class*="name"]',
        'a[title]',
        '.description'
      ];

      let nameSelectorUsed: string | null = null;
      for (const selector of nameSelectors) {
        const nameElem = $container.find(selector).first();
        if (nameElem.length) {
          const text = this.cleanText(nameElem.text());
          const title = this.cleanText(nameElem.attr('title'));
          product.name = text || title || null;
          if (product.name && product.name.length > 3) {
            nameSelectorUsed = selector;
            break;
          }
        }
      }

      // Si no encontramos nombre, buscar en atributos alt de imágenes
      if (!product.name) {
        const imgAlt = $container.find('img').first().attr('alt');
        if (imgAlt && imgAlt.trim().length > 3) {
          product.name = this.cleanText(imgAlt);
          nameSelectorUsed = 'img[alt]';
        }
      }

      if (product.name) {
        console.log(`[TiendaInglesaScraper]   ✅ Nombre encontrado con "${nameSelectorUsed}": "${product.name}"`);
      } else {
        console.warn(`[TiendaInglesaScraper]   ⚠️ No se pudo extraer el nombre del producto #${index + 1}`);
        // Log del HTML del contenedor para debugging
        const containerHtml = $container.html()?.substring(0, 200);
        console.log(`[TiendaInglesaScraper]   📄 HTML del contenedor: ${containerHtml}...`);
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
        '.card-product-price-containner .ProductPrice',  // Selector más específico de Tienda Inglesa
        '.card-product-price .ProductPrice',             // Selector completo de Tienda Inglesa
        'span.ProductPrice',                             // Elemento del precio
        '.ProductPrice',
        '[class*="ProductPrice"]',
      ];

      let priceSelectorUsed: string | null = null;
      for (const selector of priceSelectors) {
        const priceElem = $container.find(selector).first();
        console.log(`[TiendaInglesaScraper]   🔍 Price element: ${priceElem.length}`);
        if (priceElem.length) {
          const priceText = this.cleanText(priceElem.text());
          console.log(`[TiendaInglesaScraper]   🔍 Intentando selector "${selector}": "${priceText}"`);
          
          if (priceText && priceText.length > 0) {
            // Verificar que el texto realmente parezca un precio
            // Debe tener $ O ser solo números con formato de precio (ej: 44,20)
            const hasDollarSign = priceText.includes('$');
            const looksLikePrice = /^\s*\d{1,3}(?:\.\d{3})*,\d{2}\s*$/.test(priceText); // Solo números con formato: 44,20 o 1.234,56
            
            if (!hasDollarSign && !looksLikePrice) {
              console.log(`[TiendaInglesaScraper]   ⏭️ Saltando, no parece un precio: "${priceText}"`);
              continue;
            }
            
            // Extraer valor numérico del precio (formato uruguayo: $ 44,20 o $ 1.234,56)
            let priceMatch = priceText.match(/\$?\s*(\d{1,3}(?:\.\d{3})*,\d{2})/); // Formato con miles: 1.234,56
            if (!priceMatch) {
              priceMatch = priceText.match(/\$?\s*(\d+,\d{2})/); // Formato simple: 44,20
            }
            if (!priceMatch) {
              priceMatch = priceText.match(/\$\s*(\d+(?:\.\d+)?)/); // Con $ y punto decimal: $ 44.20
            }
            
            if (priceMatch) {
              product.price = priceText;
              priceSelectorUsed = selector;
              
              try {
                // Convertir formato uruguayo a formato US
                let numericString = priceMatch[1];
                // Si tiene puntos de miles y coma decimal (ej: 1.234,56)
                if (numericString.includes('.') && numericString.includes(',')) {
                  numericString = numericString.replace(/\./g, '').replace(',', '.');
                } 
                // Si solo tiene coma decimal (ej: 44,20)
                else if (numericString.includes(',')) {
                  numericString = numericString.replace(',', '.');
                }
                
                product.priceNumeric = parseFloat(numericString);
                console.log(`[TiendaInglesaScraper]   ✅ Precio parseado: "${priceText}" -> ${product.priceNumeric}`);
              } catch (e) {
                console.warn(`[TiendaInglesaScraper]   ⚠️ Error parseando precio numérico: "${priceText}" - ${e}`);
              }
              break;
            } else {
              console.log(`[TiendaInglesaScraper]   ⏭️ No se encontró patrón de precio válido en: "${priceText}"`);
            }
          }
        }
      }

      // Si no encontramos precio con selectores específicos, buscar en todo el texto
      if (!product.price) {
        console.log(`[TiendaInglesaScraper]   🔄 Buscando precio en texto completo...`);
        const containerText = this.cleanText($container.text());
        if (containerText) {
          const priceMatch = containerText.match(/\$\s*(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})/);
          if (priceMatch) {
            product.price = this.cleanText(priceMatch[0]);
            priceSelectorUsed = 'texto completo';
            try {
              let numericString = priceMatch[1];
              if (numericString.includes('.') && numericString.includes(',')) {
                numericString = numericString.replace(/\./g, '').replace(',', '.');
              } else if (numericString.includes(',')) {
                numericString = numericString.replace(',', '.');
              }
              product.priceNumeric = parseFloat(numericString);
              console.log(`[TiendaInglesaScraper]   ✅ Precio encontrado en texto completo: "${product.price}" -> ${product.priceNumeric}`);
            } catch (e) {
              console.warn(`[TiendaInglesaScraper]   ⚠️ Error en texto completo: ${e}`);
            }
          }
        }
      }

      if (product.price) {
        console.log(`[TiendaInglesaScraper]   💰 Precio encontrado con "${priceSelectorUsed}": "${product.price}" (${product.priceNumeric})`);
      } else {
        console.warn(`[TiendaInglesaScraper]   ⚠️ No se pudo extraer el precio del producto #${index + 1}`);
      }

      // Extraer disponibilidad
      const availabilitySelectors = [
        '.wTxtTooltip',              // Selector específico de Tienda Inglesa
        'span.wTxtTooltip',
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

      // Buscar texto "Disponibles" en el contenedor si no se encontró
      if (!product.availability) {
        const containerText = this.cleanText($container.text());
        if (containerText?.includes('Disponibles')) {
          // Intentar extraer el número de disponibles
          const match = containerText.match(/(\d+)\s+Disponibles/i);
          product.availability = match ? match[0] : 'Disponibles';
        }
      }

      // Extraer imagen
      // Primero buscar selectores específicos de Tienda Inglesa
      const imgSelectors = [
        'img.card-product-img',
        'img.lazyloaded',
        'img[class*="card-product-img"]',
        'img'
      ];

      let imgElem: any = null;
      for (const selector of imgSelectors) {
        const elem = $container.find(selector).first();
        if (elem.length) {
          imgElem = elem;
          break;
        }
      }

      if (imgElem && imgElem.length) {
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
      const linkSelectors = [
        '.card-product-name-and-price a[href]',  // Selector específico de Tienda Inglesa
        '.card-product-name a[href]',
        'a[href*="/supermercado/"]',             // Links que apuntan a productos
        'a[href]'
      ];

      let linkElem: any = null;
      for (const selector of linkSelectors) {
        const elem = $container.find(selector).first();
        if (elem.length && elem.attr('href')) {
          linkElem = elem;
          break;
        }
      }

      if (linkElem && linkElem.length) {
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

      // Log final del producto extraído
      if (product.name) {
        console.log(`[TiendaInglesaScraper]   ✨ Producto #${index + 1} extraído exitosamente`);
        console.log(`[TiendaInglesaScraper]   📦 Resumen: {
        nombre: "${product.name}",
        precio: "${product.price || 'N/A'}",
        marca: "${product.brand || 'N/A'}",
        disponibilidad: "${product.availability || 'N/A'}",
        imagen: ${product.imageUrl ? 'Sí' : 'No'},
        link: ${product.link ? 'Sí' : 'No'}
      }`);
      } else {
        console.warn(`[TiendaInglesaScraper]   ❌ Producto #${index + 1} sin nombre válido, se descartará`);
      }

      return product;

    } catch (error) {
      console.error(`[TiendaInglesaScraper] 💥 Error extrayendo datos del producto #${index + 1}:`, error);
      return null;
    }
  }
}

