"use client"

import { usePathname } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useEntities } from "@/components/entities-provider"
import { useApplication } from "@/components/application-provider"
import { Bot, Minus, Mic, Square } from "lucide-react"

export default function MiCuentaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      <div className="mx-auto w-full max-w-6xl p-6">
        {children}
      </div>
      <FloatingAgentChat />
    </div>
  )
}

function FloatingAgentChat() {
  const pathname = usePathname()
  const { profile } = useEntities()
  const { setLoading } = useApplication()
  const [messages, setMessages] = useState<{ role: "user" | "agent" | "system"; text: string; at: number }[]>([])
  const [input, setInput] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])

  const sendText = useCallback(async (rawText: string) => {
    const text = (rawText || "").trim()
    if (!text) return
    setMessages((m) => [...m, { role: "user", text, at: Date.now() }])
    try {
      setLoading(true)
      const userId = profile?.id ?? profile?.authUserId
      // Decide endpoint based on path
      const endpoint = pathname?.includes("compras")
        ? "/api/shopping-list/step"
        : "/api/planner/step"
      const body = { userId, query: text }
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Request failed")
      const msg = json.message || (endpoint.includes("shopping") ? "Lista actualizada." : "Plan actualizado.")
      setMessages((m) => [...m, { role: "agent", text: msg, at: Date.now() }])
    } catch (err: any) {
      setMessages((m) => [...m, { role: "system", text: err.message || "Error", at: Date.now() }])
    } finally {
      setLoading(false)
    }
  }, [pathname, profile?.authUserId, profile?.id, setLoading])

  const handleStartRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4"
      const rec = new MediaRecorder(stream, { mimeType })
      chunksRef.current = []
      rec.ondataavailable = (e) => { if (e.data && e.data.size) chunksRef.current.push(e.data) }
      rec.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        chunksRef.current = []
        if (blob.size === 0) return
        const form = new FormData()
        form.append("file", blob, mimeType === "audio/webm" ? "note.webm" : "note.mp4")
        try {
          setLoading(true)
          const res = await fetch("/api/audio/transcribe", { method: "POST", body: form })
          const json = await res.json()
          if (!res.ok) throw new Error(json.error || "Transcription failed")
          const text = (json.text || "").trim()
          if (text) {
            await sendText(text)
          }
        } catch (e) {
          setMessages((m) => [...m, { role: "system", text: (e as Error).message || "Error de transcripción", at: Date.now() }])
        } finally {
          setLoading(false)
        }
      }
      mediaRecorderRef.current = rec
      rec.start()
      setIsRecording(true)
    } catch (e) {
      setMessages((m) => [...m, { role: "system", text: "No se pudo acceder al micrófono", at: Date.now() }])
    }
  }, [sendText, setLoading])

  const handleStopRecording = useCallback(() => {
    const rec = mediaRecorderRef.current
    if (rec && rec.state === "recording") {
      rec.stop()
      rec.stream.getTracks().forEach((t) => t.stop())
    }
    setIsRecording(false)
  }, [])

  const handleSendFromInput = useCallback(async () => {
    const t = input.trim()
    if (!t) return
    setInput("")
    await sendText(t)
  }, [input, sendText])

  // Hide floating chat on dashboard
  if (pathname?.startsWith("/mi-cuenta/dashboard")) {
    return null
  }

  if (!isOpen) {
    return (
      <button
        aria-label="Abrir chat de asistente"
        className="fixed bottom-6 right-6 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
        onClick={() => setIsOpen(true)}
      >
        <Bot className="h-6 w-6" />
      </button>
    )
  }

  return (
    <Card className="fixed bottom-6 right-6 z-40 w-[340px] p-4 shadow-xl">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-semibold">Asistente</div>
        <div className="flex items-center gap-1">
          <Button size="icon-sm" variant="ghost" aria-label="Minimizar" onClick={() => setIsOpen(false)}>
            <Minus className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="min-h-[120px] max-h-[220px] overflow-y-auto rounded-md border p-2 text-sm">
        {messages.length === 0 ? (
          <p className="text-muted-foreground">La conversación se reinicia al recargar.</p>
        ) : (
          <ul className="space-y-2">
            {messages.map((m, i) => {
              const isUser = m.role === "user"
              return (
                <li key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  {isUser ? (
                    <div className={`bg-primary text-primary-foreground max-w-[85%] rounded-xl px-3 py-2`}>{m.text}</div>
                  ) : (
                    <div className="flex max-w-[85%] items-start gap-2">
                      <div className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-primary">
                        <Bot className="h-4 w-4" />
                      </div>
                      <div className="bg-muted text-foreground rounded-xl px-3 py-2">{m.text}</div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <input
          aria-label="Mensaje a asistente"
          placeholder="Escribí tu mensaje..."
          className="flex-1 rounded-md border px-2 py-1 text-sm"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              handleSendFromInput()
            }
          }}
        />
        <Button size="sm" variant={isRecording ? "destructive" : "secondary"} aria-label={isRecording ? "Detener grabación" : "Grabar audio"} onClick={isRecording ? handleStopRecording : handleStartRecording}>
          {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>
        <Button size="sm" onClick={handleSendFromInput}>Enviar</Button>
      </div>
    </Card>
  )
}


