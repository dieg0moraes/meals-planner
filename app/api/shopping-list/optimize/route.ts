import { NextRequest, NextResponse } from 'next/server';
import { Product, Store, ShoppingCart } from '@/types/products';

// Helper para llamar a OpenAI (igual que en shopping-list-builder.ts)
async function callOpenAI(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  console.log("[optimize-api] calling OpenAI", { model, systemPromptLen: systemPrompt.length, userPromptLen: userPrompt.length });
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`OpenAI request failed: ${resp.status} ${resp.statusText} ${text}`);
  }
  const data = (await resp.json()) as any;
  const content: string = data.choices?.[0]?.message?.content ?? "";
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

    // Construir el prompt
    const systemPrompt = `Sos un asistente de compras experto en Uruguay. Tu tarea es seleccionar el mejor producto de cada supermercado (Disco, Tienda Inglesa, Tata) para cada ingrediente.

Criterios:
1. Mejor relación calidad-precio
2. Cantidad apropiada
3. Disponibilidad
4. Preferir opciones frescas cuando corresponda

Respondé SOLO con JSON válido.`;

    const userPrompt = `Ingredientes y productos disponibles:
${JSON.stringify(ingredientsWithProducts, null, 2)}

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
          "product": { ... producto completo seleccionado ... }
        }
      ]
    }
  ]
}

IMPORTANTE:
- Creá un carrito por cada tienda (disco, tienda-inglesa, tata)
- Para cada ingrediente, seleccioná el MEJOR producto de esa tienda
- Si una tienda no tiene productos para un ingrediente, omitilo del carrito de esa tienda
- Incluí el objeto producto COMPLETO en cada item
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

    // Calcular totales
    const carts: ShoppingCart[] = (parsed.carts || []).map((cart: any) => {
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

