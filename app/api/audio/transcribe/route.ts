import { NextRequest, NextResponse } from "next/server"
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

const MAX_BYTES = 10 * 1024 * 1024 // 10MB

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: auth } = await supabase.auth.getUser()
    if (!auth?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const form = await req.formData()
    const file = form.get("file") as File | null
    if (!file) return NextResponse.json({ error: "file is required" }, { status: 400 })
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "file too large" }, { status: 413 })

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) return NextResponse.json({ error: "OPENAI_API_KEY not set" }, { status: 500 })

    const body = new FormData()
    body.append("file", file)
    body.append("model", process.env.OPENAI_TRANSCRIBE_MODEL || "whisper-1")
    // Spanish hint improves accuracy but is optional
    body.append("language", "es")

    const resp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body,
    })

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "")
      return NextResponse.json({ error: `OpenAI error: ${resp.status} ${errText}` }, { status: 502 })
    }

    const data = (await resp.json()) as { text?: string }
    return NextResponse.json({ text: data.text ?? "" })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Transcription failed" }, { status: 500 })
  }
}


