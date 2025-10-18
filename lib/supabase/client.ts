import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr"

let client: ReturnType<typeof createSupabaseBrowserClient> | null = null

export function createBrowserClient() {
  if (client) return client

  client = createSupabaseBrowserClient(
    process.env.SUPABASE_SUPABASE_NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_NEXT_PUBLIC_SUPABASE_ANON_KEY_ANON_KEY!,
  )

  return client
}

// Keep the old function for backwards compatibility
export function getSupabaseBrowserClient() {
  return createBrowserClient()
}
