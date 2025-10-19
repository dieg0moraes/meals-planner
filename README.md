# Carritoo - Planificador Inteligente de Comidas

Una aplicación web B2C desarrollada durante un hackathon que ayuda a personas en Latinoamérica a planificar sus compras semanales del supermercado de manera inteligente y personalizada.

## Qué es Carritoo

Carritoo es un asistente culinario impulsado por IA que transforma la forma en que planificas tus comidas y compras. La mayoría de las personas compran de forma improvisada, lo que resulta en sobregasto, desperdicio de alimentos y falta de ingredientes esenciales. Carritoo resuelve este problema mediante un flujo simple de tres pasos:

1. **Onboarding conversacional** - Captura tu perfil mediante voz e IA
2. **Plan semanal inteligente** - Genera comidas personalizadas 
3. **Lista de compras optimizada** - Convierte tu plan en una lista de compras eficiente

## Flujo de Usuario

### 1. Landing Page (/)

**Qué hace:**
- Presenta la propuesta de valor de la aplicación
- Muestra las características principales
- Permite el acceso mediante autenticación con Google

**Resolución técnica:**
- Componente server-side de Next.js
- Detecta si el usuario ya tiene sesión y redirige automáticamente a `/mi-cuenta/dashboard`
- Integración con Supabase Auth para login con Google


---

### 2. Login (/login)

**Qué hace:**
- Página de autenticación con Google
- Crea la sesión del usuario en Supabase

**Resolución técnica:**
- Utiliza Supabase Auth con OAuth de Google
- Gestión de sesión mediante cookies seguras
- Redirección automática al dashboard tras login exitoso


---

### 3. Dashboard (/mi-cuenta/dashboard)

**Qué hace:**
- Primera pantalla después del login
- Muestra el progreso de configuración del perfil
- Permite iniciar el onboarding mediante chat de voz
- Visualiza información del hogar, preferencias alimentarias, restricciones dietéticas y objetivos
- Permite resetear el perfil completamente

**Funcionalidades:**
- **Onboarding con IA**: Widget de conversación por voz (ElevenLabs ConvAI) que captura:
  - Nombre del usuario
  - Miembros del hogar (personas y mascotas)
  - Restricciones dietéticas
  - Alimentos favoritos y que no te gustan
  - Objetivos (ahorrar dinero, más proteína, etc.)

- **Progreso de configuración**: Barra de progreso que muestra 5 pasos:
  1. Perfil de usuario creado
  2. Miembros del hogar agregados
  3. Restricciones dietéticas establecidas
  4. Preferencias de comida agregadas
  5. Objetivos configurados

- **Visualización del perfil**:
  - Cards con avatares para cada miembro del hogar
  - Badges para preferencias alimentarias (favoritos en verde, no me gusta en rojo)
  - Restricciones dietéticas con indicador naranja
  - Objetivos del usuario

**Resolución técnica:**
- **Suscripciones en tiempo real**: Utiliza Supabase Realtime para escuchar cambios en la tabla `profiles`
- **Widget de voz**: Integración con ElevenLabs ConvAI que envía el `authUserId` como variable dinámica
- **Componente memoizado**: El widget se renderiza con `memo()` para evitar re-renders innecesarios
- **Estado local optimista**: Actualiza la UI inmediatamente al recibir cambios del servidor
- **API de onboarding**: Endpoint `/api/onboarding/ingest` que recibe el audio transcrito y lo procesa con OpenAI
- **Structured Outputs**: Usa OpenAI con Zod schema para extraer datos estructurados de la conversación

**Flujo de onboarding:**
1. Usuario habla con el widget de voz
2. ElevenLabs transcribe y envía el texto al servidor
3. OpenAI (GPT-4) extrae información estructurada usando Zod schema
4. Se valida y parsea la respuesta
5. Se hace upsert en la tabla `profiles` de Supabase
6. El componente recibe la actualización en tiempo real
7. La UI se actualiza automáticamente mostrando el progreso

**Archivo:** [app/mi-cuenta/dashboard/page.tsx](app/mi-cuenta/dashboard/page.tsx)

**APIs relacionadas:**
- [app/api/onboarding/ingest/route.ts](app/api/onboarding/ingest/route.ts) - Procesa la conversación y extrae datos
- [app/api/onboarding/reset/route.ts](app/api/onboarding/reset/route.ts) - Resetea el perfil

---

### 4. Plan de Comidas (/mi-cuenta/comidas)

**Qué hace:**
- Muestra el plan semanal de 10 comidas generado por IA
- Permite expandir cada comida para ver ingredientes detallados
- Genera automáticamente el plan inicial si está vacío
- Permite editar y ajustar las comidas mediante chat conversacional

**Funcionalidades:**
- **Vista de lista**: Muestra todas las comidas numeradas con contador de ingredientes
- **Acordeones expandibles**: Cada comida se puede expandir para ver:
  - Nombre del ingrediente
  - Cantidad y unidad
  - Badge "Opcional" para toppings, especias y salsas
  - Notas adicionales

- **Generación automática**: Si el usuario entra a la página sin comidas, se dispara automáticamente `/api/planner/kickoff`
- **Chat interactivo**: El usuario puede modificar el plan mediante conversación (a través del widget flotante)

**Resolución técnica:**
- **LangGraph JS**: Motor del agente conversacional que maneja el flujo del planificador
- **Suscripción en tiempo real**: Escucha cambios en la tabla `weekly_meals` de Supabase
- **Kickoff automático**: Hook que detecta lista vacía y llama al endpoint de inicialización
- **Loading global**: Usa el contexto de aplicación para mostrar overlay durante la generación
- **Animaciones**: Flash effect cuando la lista se actualiza (hook `useFlashOnChange`)

**Flujo del agente planificador (LangGraph):**
1. **Estado inicial**: Verifica si hay un plan existente en `weekly_meals`
2. **Generación inicial**: Si está vacío, genera 10 comidas con GPT-4o usando Structured Outputs
3. **Iteración conversacional**:
   - Usuario: "Cambiá la comida 3 por algo con pollo"
   - Agente: Analiza el contexto, regenera la lista completa con el cambio
   - Persiste en la base de datos
4. **Validación**: Usa Zod schema para asegurar estructura correcta de las comidas
5. **Persistencia**: Upsert en `weekly_meals` con campos:
   - `meals`: Array de objetos Meal con ingredientes
   - `target_meals_count`: Número objetivo de comidas
   - `summary`: Resumen generado del plan




---

### 5. Lista de Compras (/mi-cuenta/compras)

**Qué hace:**
- Convierte el plan de comidas en una lista de compras consolidada
- Agrupa y unifica ingredientes similares
- Permite marcar items como comprados
- Busca productos reales en supermercados y optimiza el carrito de compras

**Funcionalidades:**
- **Lista consolidada**: Ingredientes agrupados con cantidades totales
- **Checkboxes interactivos**: Marca items como comprados (persiste en DB)
- **Generación automática**: Si hay comidas pero no hay lista, genera automáticamente
- **Búsqueda de productos**: Botón "Buscar Productos" que:
  1. Busca cada ingrediente en APIs de supermercados
  2. Usa IA para optimizar la selección de productos
  3. Genera carritos por supermercado con totales
- **Modal de carritos**: Muestra opciones de supermercados con:
  - Lista de productos con precios
  - Total por supermercado
  - Enlaces para comprar

**Resolución técnica:**
- **Generación de lista**: Endpoint `/api/shopping-list/kickoff` que:
  - Lee el plan de comidas del usuario
  - Consolida ingredientes (suma cantidades de ingredientes repetidos)
  - Normaliza unidades de medida
  - Persiste en tabla `shopping_lists`

- **Búsqueda de productos**:
  - Endpoint `/api/products/search` - Scraping de supermercados (ej: Tienda Inglesa, Disco, Devoto)
  - Cheerio para parsear HTML de tiendas online
  - Caché de resultados para optimizar rendimiento

- **Optimización con IA**: Endpoint `/api/shopping-list/optimize`
  - Recibe ingredientes con productos disponibles
  - GPT-4o analiza y selecciona los mejores productos considerando:
    - Mejor relación precio/cantidad
    - Preferencias del usuario
    - Disponibilidad
  - Agrupa por supermercado
  - Calcula totales

- **Persistencia de estados**:
  - Checkbox marcado actualiza directamente en Supabase
  - UI optimista: deshabilita checkbox mientras guarda
  - Suscripción en tiempo real para sincronización multi-dispositivo

---

## Arquitectura Técnica

### Stack Tecnológico

**Frontend:**
- **Next.js 15** (App Router) - Framework React con SSR y RSC
- **React 19** - Librería de UI con server components
- **TypeScript** - Type safety
- **Tailwind CSS 4** - Styling con utility classes
- **shadcn/ui** - Componentes de UI (Radix UI + Tailwind)
- **Lucide React** - Iconos

**Backend:**
- **Next.js API Routes** - Endpoints serverless
- **Supabase** - Backend as a Service
  - Auth (OAuth con Google)
  - PostgreSQL Database
  - Realtime subscriptions
  - Row Level Security (RLS)

**IA/ML:**
- **OpenAI** - Structured Outputs para extracción de datos
- **LangChain/LangGraph JS/Langsmith** - Flujos conversacionales con estado
- **ElevenLabs ConvAI** - Widget de conversación por voz
- **Zod** - Validación de schemas y type safety

**Scraping:**
- **Cheerio** - Parsing de HTML (scraping de supermercados)

---


## Variables de Entorno

Archivo `.env.local` necesario:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...

# OpenAI
OPENAI_API_KEY=sk-xxx...

# LangSmith (opcional, para debugging de LangGraph)
LANGCHAIN_API_KEY=lsv2_xxx...
LANGCHAIN_TRACING_V2=true
LANGCHAIN_PROJECT=meals-planner
```

---

## Instalación y Desarrollo

### Requisitos:
- Node.js 18+
- npm o pnpm
- Cuenta de Supabase
- API key de OpenAI
- Cuenta de ElevenLabs para widget de voz

### Pasos:

1. **Clonar el repositorio:**
```bash
git clone <repo-url>
cd meals-planner
```

2. **Instalar dependencias:**
```bash
npm install
```

3. **Configurar variables de entorno:**
```bash
cp .env.example .env.local
# Editar .env.local con tus credenciales
```

4. **Conectarse a Supabase:**
JUST DO IT!

5. **Configurar OAuth de Google en Supabase:**
- Authentication → Providers → Google
- Configurar Client ID y Secret
- Agregar redirect URL

6. **Iniciar servidor de desarrollo:**
```bash
npm run dev
```

7. **Abrir en navegador:**
```
http://localhost:3000
```

---

## Flujo Completo de Uso

### Demo Path (Usuario nuevo):

1. **Landing** → Click "Comenzar gratis"
2. **Login** → Sign in con Google
3. **Dashboard** →
   - Chat con widget de voz: "Hola, soy Juan, vivo con mi novia Ana, somos vegetarianos, nos gusta la pasta y queremos ahorrar dinero"
   - Widget procesa y muestra progreso en tiempo real
   - Completa las 5 secciones del perfil
4. **Comidas** → Click "Ver Plan de Comidas"
   - Se genera automáticamente plan de comidas vegetarianas
   - Puede expandir para ver ingredientes
   - Puede chatear: "Cambiá la comida 5 por pizza casera"
5. **Compras** → Click en sidebar "Lista de Compras"
   - Se genera automáticamente lista consolidada
   - Puede marcar items como comprados
   - Click "Buscar Productos"
   - Modal muestra carritos por supermercado con precios
   - Selecciona mejor opción y va a comprar

### Tiempo total del flujo: ~5-7 minutos

---

## Licencia

MIT License - Ver archivo LICENSE para más detalles

---
