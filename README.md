## Meals Planner – Hackathon MVP

We are building a simple, B2C web app to help people in Latin America plan their weekly supermarket purchases. Today, most people buy ad‑hoc and end up overspending, wasting food, or missing essentials. Our MVP focuses on three steps:

1) Onboarding with voice + AI
- Capture household (personas y mascotas), restricciones, preferencias y objetivos (ahorrar dinero, más proteína, etc.)
- Persistimos un `UserProfile` en Supabase (campos flexibles vía JSON)

2) Plan semanal de 10 comidas
- Agente conversacional (LangGraph) propone, recibe feedback, mejora y finaliza una lista de 10 comidas (sin fijar día/hora)
- Guardamos el plan en `weekly_meals`

3) Lista de compras
- Convertimos el plan en una lista de ingredientes
- Soportamos ingredientes opcionales (salsas, toppings, especias) que el usuario elige

Tecnologías
- Next.js (App Router) + shadcn/ui
- Supabase (auth con Google, DB, RLS) – JSON para prototipado rápido
- OpenAI para extracción estructurada durante onboarding
- LangGraph JS para el flujo iterativo del plan

Rutas clave
- `/login`: Sign‑in con Google
- `/agents`: Playground con 2 chats (Onboarding y Planificador)
- API: `/api/onboarding/ingest` y `/api/planner/step`

Env necesarios (.env.local)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `OPENAI_API_KEY`

Migraciones
- Ver `migrations/0001_init.sql` y `0002_profiles_auth_unique.sql`

Estado actual
- Onboarding: parsing estructurado con Zod, upsert de `profiles` y flag `completed`. Usa nombre y userId de la sesión (Google)
- Planner Agent (LangGraph):
  - Pregunta por la cantidad de comidas si no está definida
  - Genera el plan inicial con Structured Outputs (lista completa de comidas con ingredientes opcionales/marcados)
  - Re‑escribe la lista completa ante instrucciones del usuario (p. ej. “cambiá la 3 por algo con pollo”)
  - Persiste en `weekly_meals` (`meals`, `target_meals_count`, `summary`)
- UI `/agents`:
  - Dos chats (Onboarding y Planificador) y vista en vivo del plan
  - Suscripción en tiempo real a `weekly_meals`

Objetivo demo
- Llegar a la lista de compras final desde una conversación breve: crear perfil → definir 10 comidas → generar lista.

Próximos pasos
- Ajustes finos de edición (agregar/eliminar también ajustando `target_meals_count`)
- Generación de lista de compras desde el plan + edición
- RLS/Policies limpias y seed minimal
