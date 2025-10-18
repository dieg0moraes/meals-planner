import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr"

let client: ReturnType<typeof createSupabaseBrowserClient> | null = null

export function createBrowserClient() {
  if (client) return client

  const supabaseUrl = process.env.SUPABASE_NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_SUPABASE_URL
  const supabaseAnonKey = proSUPABASE_NEXT_PUBLIC_SUPABASE_ANON_KEY_ANON_KEY || process.env.SUPABASE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[v0] Supabase environment variables not found")
    throw new Error("Supabase URL and Anon Key are required")
  }

  client = createSupabaseBrowserClient(supabaseUrl, supabaseAnonKey)

  return client
}

export function getSupabaseBrowserClient() {
  return createBrowserClient()
}
