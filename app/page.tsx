import Link from "next/link"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server"

export default async function Home() {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.auth.getUser()
  if (data?.user) {
    redirect("/mi-cuenta/dashboard")
  }
  return (
    <div className="min-h-[calc(100vh-56px)] w-full bg-black text-white">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-green-600/20 via-green-500/10 to-transparent" />
        <div className="mx-auto max-w-4xl px-6 py-16 md:py-20 min-h-[70vh] flex flex-col items-center justify-center text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight tracking-tight">
            Planificá tus comidas. Comprá mejor. Ahorrá más.
          </h1>
          <p className="mt-4 text-lg text-neutral-300 max-w-2xl">
            Un asistente con IA que convierte tu plan semanal en una lista de compras clara y optimizada para tu hogar.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild className="bg-green-600 hover:bg-green-500 text-black font-semibold px-6 py-6 rounded-xl">
              <Link href="/login">Comenzar gratis</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Key features with subtle scroll effect */}
      <section className="relative">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              { title: "Onboarding simple", desc: "Contanos tu hogar, restricciones y gustos. Construimos tu perfil en minutos." },
              { title: "Plan semanal inteligente", desc: "Propuestas variadas y ajustables con tu feedback." },
              { title: "Lista optimizada", desc: "Unificamos ingredientes a unidades de compra reales para ahorrar." },
            ].map((f, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-neutral-900/40 p-6 backdrop-blur-sm hover:border-green-600/40 transition-colors">
                <h3 className="text-xl font-semibold text-white">{f.title}</h3>
                <p className="mt-2 text-neutral-300">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative border-t border-white/10">
        <div className="mx-auto max-w-5xl px-6 py-16 text-center">
          <h2 className="text-3xl md:text-4xl font-bold">Listo para ordenar tus compras</h2>
          <p className="mt-3 text-neutral-300">Probá el flujo completo: perfil → plan → lista.</p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Button asChild className="bg-green-600 hover:bg-green-500 text-black font-semibold px-6 py-6 rounded-xl">
              <Link href="/login">Crear cuenta</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-neutral-400">
          <div>© {new Date().getFullYear()} Picanthon Labs</div>
          <div className="flex items-center gap-4">
            <a className="hover:text-white" href="#">Términos</a>
            <a className="hover:text-white" href="#">Privacidad</a>
            <a className="hover:text-white" href="mailto:hola@picanthon.com">Contacto</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
