"use client"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar"
import { LayoutDashboard, Calendar, ShoppingCart, LogOut } from "lucide-react"
import Link from "next/link"
import { createBrowserClient } from "@/lib/supabase/client"
import { useAuth } from "@/components/auth-provider"

const menuItems = [
  {
    title: "Dashboard",
    url: "/mi-cuenta/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Comidas",
    url: "/mi-cuenta/comidas",
    icon: Calendar,
  },
  {
    title: "Lista de compras",
    url: "/mi-cuenta/compras",
    icon: ShoppingCart,
  },
]

export function AppSidebar() {
  const { user } = useAuth()
  async function handleLogout() {
    try {
      const supabase = createBrowserClient()
      await supabase.auth.signOut()
      // Let middleware or client nav handle redirect, or soft reload
      window.location.href = "/"
    } catch (e) {
      console.error("logout error", e)
    }
  }
  return (
    <Sidebar>
      <SidebarHeader className="border-b px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center">
            <span className="text-white font-bold text-lg">M</span>
          </div>
          <div>
            <h2 className="font-semibold text-lg leading-none">ShoppingPlanner</h2>
            <p className="text-xs text-muted-foreground">AI-Powered</p>
          </div>
        </div>
        {user ? (
          <div className="mt-3">
            <div className="text-sm font-medium truncate">{user.name || "Usuario"}</div>
            <div className="text-xs text-muted-foreground truncate">{user.email || ""}</div>
          </div>
        ) : null}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Secciones</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <div className="mt-auto p-4">
          <button
            onClick={handleLogout}
            className="w-full inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-foreground/5"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </SidebarContent>
    </Sidebar>
  )
}
