import { NextRequest, NextResponse } from 'next/server';
import { Product, Store, ShoppingCart } from '@/types/products';
import { ChatOpenAI } from '@langchain/openai';

// Helper para llamar a OpenAI con LangSmith tracing
async function callOpenAI(systemPrompt: string, userPrompt: string): Promise<string> {
  const modelName = "gpt-4.1";
  const model = new ChatOpenAI({
    model: modelName,
    temperature: 0,
  });

  console.log("[optimize-api] calling OpenAI with LangSmith tracing", { 
    model: modelName, 
    systemPromptLen: systemPrompt.length, 
    userPromptLen: userPrompt.length 
  });

  const response = await model.invoke(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    {
      metadata: {
        endpoint: "shopping-list-optimize",
        operation: "cart-selection",
      },
      tags: ["shopping", "optimization", "cart-builder"],
    }
  );

  const content = response.content as string;
  console.log("[optimize-api] OpenAI content", { length: content.length });
  return content;
}

function tryParseJson<T>(text: string): T {
  // Extraer JSON de posibles code blocks
  const fenced = text.match(/```(?:json)?\n([\s\S]*?)\n```/i);
  const candidate = fenced ? fenced[1] : text;
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");
  const jsonSlice = firstBrace >= 0 && lastBrace > firstBrace ? candidate.slice(firstBrace, lastBrace + 1) : candidate;
  try {
    return JSON.parse(jsonSlice) as T;
  } catch (e) {
    console.error("[optimize-api] JSON parse error", { snippet: jsonSlice.slice(0, 240) }, e);
    throw e;
  }
}

/**
 * Enriquece los productos seleccionados por el LLM con los datos completos
 * (imágenes, links, descripciones) de los datos originales.
 */
function enrichCartsWithCompleteProducts(carts: any[], ingredientsWithProducts: any[]): any[] {
  return carts.map((cart: any) => ({
    ...cart,
    items: cart.items.map((item: any) => {
      // Buscar el ingrediente en los datos originales
      const ingredientData = ingredientsWithProducts.find(
        (ing: any) => ing.ingredient === item.ingredient
      );

      if (ingredientData && ingredientData.products) {
        // Buscar el producto completo que coincida con el seleccionado por el LLM
        const fullProduct = ingredientData.products.find((p: Product) => 
          p.name === item.product.name && 
          p.store === item.product.store
        );

        if (fullProduct) {
          console.log(`[optimize-api] 🔗 Recuperando producto completo: "${fullProduct.name}" de ${fullProduct.storeName}`);
          return {
            ...item,
            product: fullProduct // Reemplazar con el producto completo
          };
        }
      }

      console.warn(`[optimize-api] ⚠️ No se encontró producto completo para "${item.product.name}"`);
      return item; // Devolver tal cual si no se encuentra
    })
  }));
}

/**
 * Estima precios para productos de Tienda Inglesa que no tienen precio.
 * Toma el precio más barato de otros supermercados y le suma un random entre 10 y 20.
 */
function fixTiendaInglesaPrices(carts: any[], ingredientsWithProducts: any[]): any[] {
  // Encontrar el carrito de Tienda Inglesa
  const tiendaInglesaCart = carts.find(cart => cart.store === 'tienda-inglesa');
  
  if (!tiendaInglesaCart || !tiendaInglesaCart.items) {
    console.log('[optimize-api] No hay carrito de Tienda Inglesa');
    return carts;
  }

  console.log(`[optimize-api] 🔧 Procesando precios de Tienda Inglesa...`);
  
  // Procesar cada item de Tienda Inglesa
  tiendaInglesaCart.items.forEach((item: any) => {
    const product = item.product;
    
    // Si el producto no tiene precio o es 0
    if (!product.priceNumeric || product.priceNumeric === 0) {
      console.log(`[optimize-api] 💰 Producto sin precio: "${product.name}"`);
      
      // Buscar los productos de este ingrediente en los datos originales
      const ingredientData = ingredientsWithProducts.find(
        (ing: any) => ing.ingredient === item.ingredient
      );
      
      if (ingredientData && ingredientData.products) {
        // Obtener precios de otros supermercados (no Tienda Inglesa)
        const otherPrices = ingredientData.products
          .filter((p: Product) => 
            p.store !== 'tienda-inglesa' && 
            p.priceNumeric !== null && 
            p.priceNumeric > 0
          )
          .map((p: Product) => p.priceNumeric as number);
        
        if (otherPrices.length > 0) {
          // Encontrar el precio más barato
          const cheapestPrice = Math.min(...otherPrices);
          
          // Sumar un random entre 10 y 20
          const randomExtra = Math.floor(Math.random() * 21) + 20; // 10 a 20 inclusive
          const estimatedPrice = cheapestPrice + randomExtra;
          
          // Actualizar el producto
          product.priceNumeric = Math.round(estimatedPrice * 100) / 100;
          product.price = `$ ${product.priceNumeric.toFixed(2).replace('.', ',')}`;
          
          console.log(`[optimize-api] ✅ Precio estimado para "${product.name}": $${product.priceNumeric} (basado en $${cheapestPrice} + $${randomExtra})`);
        } else {
          console.warn(`[optimize-api] ⚠️ No se encontraron precios de otros supermercados para "${item.ingredient}"`);
        }
      }
    }
  });
  
  return carts;
}

/**
 * POST /api/shopping-list/optimize
 * 
 * Recibe una lista de ingredientes con sus productos encontrados
 * y usa OpenAI para seleccionar los mejores de cada tienda
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ingredientsWithProducts } = body;

    if (!ingredientsWithProducts || !Array.isArray(ingredientsWithProducts)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request',
          message: 'Se requiere un array de ingredientes con sus productos'
        },
        { status: 400 }
      );
    }

    console.log(`[optimize-api] Optimizando selección para ${ingredientsWithProducts.length} ingredientes`);

    // Filtrar solo las propiedades esenciales para el LLM (reducir tamaño del prompt)
    const essentialData = ingredientsWithProducts.map((item: any) => ({
      ingredient: item.ingredient,
      quantity: item.quantity,
      unit: item.unit,
      products: item.products.map((p: any) => ({
        name: p.name,
        brand: p.brand,
        price: p.price,
        store: p.store,
      }))
    }));

    console.log(`[optimize-api] Datos reducidos de ${JSON.stringify(ingredientsWithProducts).length} a ${JSON.stringify(essentialData).length} caracteres`);

    // Construir el prompt
    const systemPrompt = `Sos un asistente de compras experto en Uruguay. Tu tarea es seleccionar el mejor producto de cada supermercado (Disco, Tienda Inglesa, Tata) para cada ingrediente.

Criterios:
1. Mejor relación calidad-precio
2. Cantidad apropiada
3. Disponibilidad
4. Preferir opciones frescas cuando corresponda

Respondé SOLO con JSON válido.`;

    const userPrompt = `Ingredientes y productos disponibles:
${JSON.stringify(essentialData, null, 2)}

Devolvé un JSON con este formato exacto:
{
  "carts": [
    {
      "store": "disco",
      "storeName": "Disco",
      "items": [
        {
          "ingredient": "nombre del ingrediente original",
          "quantity": cantidad_solicitada,
          "unit": "unidad",
          "product": {
            "name": "nombre del producto",
            "store": "disco"
          }
        }
      ]
    }
  ]
}

IMPORTANTE:
- Creá un carrito por cada tienda (disco, tienda-inglesa, tata)
- Para cada ingrediente, seleccioná el MEJOR producto de esa tienda
- Si una tienda no tiene productos para un ingrediente, omitilo del carrito de esa tienda
- En product, solo incluí "name" y "store" (los demás datos los recuperaremos después)
- Solo incluí carritos que tengan al menos 1 item`;

    const content = await callOpenAI(systemPrompt, userPrompt);
    
    let parsed: any;
    try {
      parsed = tryParseJson<any>(content);
    } catch (e) {
      console.error('[optimize-api] Error parseando respuesta del LLM:', e);
      return NextResponse.json(
        {
          success: false,
          error: 'Parse error',
          message: 'Error al procesar la respuesta del LLM'
        },
        { status: 500 }
      );
    }

    // Recuperar productos completos (con imágenes, links, etc.)
    const cartsWithCompleteProducts = enrichCartsWithCompleteProducts(parsed.carts || [], ingredientsWithProducts);

    // Procesar precios de Tienda Inglesa que faltan
    const cartsWithFixedPrices = fixTiendaInglesaPrices(cartsWithCompleteProducts, ingredientsWithProducts);

    // Calcular totales
    const carts: ShoppingCart[] = cartsWithFixedPrices.map((cart: any) => {
      const total = cart.items.reduce((sum: number, item: any) => {
        return sum + (item.product?.priceNumeric || 0);
      }, 0);
      
      return {
        ...cart,
        total: Math.round(total * 100) / 100
      };
    });

    return NextResponse.json({
      success: true,
      carts,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[optimize-api] Error:', error);

    
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: 'Ocurrió un error al optimizar la selección de productos',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

