import type React from "react"
import type { Metadata } from "next"

import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { AuthProvider } from "@/components/auth-provider"
import { EntitiesProvider } from "@/components/entities-provider"
import { ApplicationProvider } from "@/components/application-provider"
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server"

import { Geist, Geist_Mono, Source_Serif_4, Geist as V0_Font_Geist, Geist_Mono as V0_Font_Geist_Mono, Source_Serif_4 as V0_Font_Source_Serif_4 } from 'next/font/google'

// Initialize fonts
const _geist = V0_Font_Geist({ subsets: ['latin'], weight: ["100","200","300","400","500","600","700","800","900"] })
const _geistMono = V0_Font_Geist_Mono({ subsets: ['latin'], weight: ["100","200","300","400","500","600","700","800","900"] })
const _sourceSerif_4 = V0_Font_Source_Serif_4({ subsets: ['latin'], weight: ["200","300","400","500","600","700","800","900"] })

const geistSans = Geist({ subsets: ["latin"] })
const geistMono = Geist_Mono({ subsets: ["latin"] })
const sourceSerif = Source_Serif_4({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Carritoo - AI-Powered Weekly Shopping List Generator",
  description: "Generate your weekly shopping list with AI assistance",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.auth.getUser()
  const hasSession = !!data?.user
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        <ApplicationProvider>
          <AuthProvider>
            <EntitiesProvider>
            {hasSession ? (
              <SidebarProvider>
                <AppSidebar />
                <main className="flex-1 flex flex-col w-full">
                  <div className="border-b px-4 py-3 flex items-center">
                    <SidebarTrigger />
                  </div>
                  <div className="flex-1 overflow-auto">{children}</div>
                </main>
              </SidebarProvider>
            ) : (
              <main className="flex-1 flex flex-col w-full">
                <div className="flex-1 overflow-auto">{children}</div>
              </main>
            )}
            </EntitiesProvider>
          </AuthProvider>
        </ApplicationProvider>
        <Analytics />
      </body>
    </html>
  )
}
