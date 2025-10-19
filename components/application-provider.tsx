"use client"

import { createContext, useCallback, useContext, useMemo, useState } from "react"
import { Bot } from "lucide-react"

type ApplicationContextValue = {
  loading: boolean
  setLoading: (v: boolean) => void
}

const ApplicationContext = createContext<ApplicationContextValue>({ loading: false, setLoading: () => {} })

export function useApplication() {
  return useContext(ApplicationContext)
}

export function ApplicationProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoadingState] = useState(false)
  const setLoading = useCallback((v: boolean) => setLoadingState(v), [])
  const value = useMemo(() => ({ loading, setLoading }), [loading, setLoading])

  return (
    <ApplicationContext.Provider value={value}>
      {children}
      {loading ? <GlobalOverlay /> : null}
    </ApplicationContext.Provider>
  )
}

function GlobalOverlay() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20">
      <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-neutral-900/70 px-6 py-5 text-white shadow-xl">
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 rounded-full border-4 border-green-500/30 border-t-transparent animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Bot className="h-7 w-7 text-green-500" />
          </div>
        </div>
        <span className="text-sm">Procesando…</span>
      </div>
    </div>
  )
}

// Bot icon from lucide-react used for consistency with the floating chat


