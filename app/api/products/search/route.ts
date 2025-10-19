import { NextRequest, NextResponse } from 'next/server';
import { DiscoScraper, Product as DiscoProduct } from '@/lib/scraper/disco-scraper';
import { TiendaInglesaScraper, TiendaInglesaProduct } from '@/lib/scraper/tienda-inglesa-scraper';
import { TataScraper, TataProduct } from '@/lib/scraper/tata-scraper';

/**
 * GET /api/products/search?q=<término>
 * 
 * Busca productos en TODOS los supermercados uruguayos (Disco, Tienda Inglesa y Tata) 
 * de forma paralela y combina los resultados.
 * 
 * Query Parameters:
 *   - q: Término de búsqueda (requerido)
 * 
 * Ejemplo: /api/products/search?q=galletitas
 */
export async function GET(request: NextRequest) {
  try {
    // Obtener el término de búsqueda
    const searchParams = request.nextUrl.searchParams;
    const searchTerm = searchParams.get('q');

    // Validar que el término de búsqueda esté presente
    if (!searchTerm) {
      return NextResponse.json(
        {
          error: 'Missing search term',
          message: 'Por favor proporciona un término de búsqueda usando el parámetro "q"',
          example: '/api/products/search?q=galletitas'
        },
        { status: 400 }
      );
    }

    // Validar que el término no esté vacío
    if (searchTerm.trim().length === 0) {
      return NextResponse.json(
        {
          error: 'Empty search term',
          message: 'El término de búsqueda no puede estar vacío'
        },
        { status: 400 }
      );
    }

    console.log(`[API] Buscando productos para: "${searchTerm}" en todos los supermercados`);

    // Buscar en todos los supermercados en paralelo
    const discoScraper = new DiscoScraper();
    const tiendaInglesaScraper = new TiendaInglesaScraper();
    const tataScraper = new TataScraper();

    const [discoResults, tiendaInglesaResults, tataResults] = await Promise.allSettled([
      discoScraper.scrapeProducts(searchTerm),
      tiendaInglesaScraper.scrapeProducts(searchTerm),
      tataScraper.scrapeProducts(searchTerm)
    ]);

    // Procesar resultados de Disco
    const discoProducts: DiscoProduct[] = discoResults.status === 'fulfilled' 
      ? discoResults.value.map(product => ({
          ...product,
          store: 'disco' as const,
          storeName: 'Disco'
        }))
      : [];

    const discoSuccess = discoResults.status === 'fulfilled';
    if (discoResults.status === 'rejected') {
      console.error('[API] Error en Disco:', discoResults.reason);
    }

    // Procesar resultados de Tienda Inglesa (solo primeros 10)
    const tiendaInglesaProducts: TiendaInglesaProduct[] = tiendaInglesaResults.status === 'fulfilled'
      ? tiendaInglesaResults.value
          .slice(0, 10)  // Limitar a 10 productos
          .map(product => ({
            ...product,
            store: 'tienda-inglesa' as const,
            storeName: 'Tienda Inglesa'
          }))
      : [];

    const tiendaInglesaSuccess = tiendaInglesaResults.status === 'fulfilled';
    if (tiendaInglesaResults.status === 'rejected') {
      console.error('[API] Error en Tienda Inglesa:', tiendaInglesaResults.reason);
    }

    // Procesar resultados de Tata (limitar a 10)
    const tataProducts: TataProduct[] = tataResults.status === 'fulfilled'
      ? tataResults.value
          .slice(0, 10)  // Limitar a 10 productos
          .map(product => ({
            ...product,
            store: 'tata' as const,
            storeName: 'Tata'
          }))
      : [];

    const tataSuccess = tataResults.status === 'fulfilled';
    if (tataResults.status === 'rejected') {
      console.error('[API] Error en Tata:', tataResults.reason);
    }

    // Combinar todos los productos
    const allProducts = [...discoProducts, ...tiendaInglesaProducts, ...tataProducts];

    console.log(`[API] Resultados: Disco=${discoProducts.length}, Tienda Inglesa=${tiendaInglesaProducts.length}, Tata=${tataProducts.length}, Total=${allProducts.length}`);

    // Devolver los resultados combinados
    return NextResponse.json(
      {
        success: true,
        searchTerm,
        count: allProducts.length,
        products: allProducts,
        stores: {
          disco: {
            count: discoProducts.length,
            success: discoSuccess
          },
          tiendaInglesa: {
            count: tiendaInglesaProducts.length,
            success: tiendaInglesaSuccess
          },
          tata: {
            count: tataProducts.length,
            success: tataSuccess
          }
        },
        timestamp: new Date().toISOString()
      },
      { 
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
        }
      }
    );

  } catch (error) {
    console.error('[API] Error en búsqueda de productos:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: 'Ocurrió un error al buscar los productos',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

