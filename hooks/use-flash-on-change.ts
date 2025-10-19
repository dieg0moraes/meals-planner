"use client"

import { useEffect, useRef, useState } from "react"

export function useFlashOnChange(signature: string, durationMs = 800) {
  const prevRef = useRef<string | undefined>(undefined)
  const [flash, setFlash] = useState(false)

  useEffect(() => {
    if (prevRef.current === undefined) {
      // first mount: capture baseline, no flash
      prevRef.current = signature
      return
    }
    if (prevRef.current !== signature) {
      prevRef.current = signature
      setFlash(true)
      const t = setTimeout(() => setFlash(false), durationMs)
      return () => clearTimeout(t)
    }
  }, [signature, durationMs])

  return flash
}


