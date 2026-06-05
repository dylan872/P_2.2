"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { Badge } from "@/components/ui/badge"
import {
  Shield,
  LayoutDashboard,
  FileWarning,
  BarChart3,
  LogOut,
  Menu,
  X,
  Crown,
  Bell,
  Scale,
  Wallet,
  Users,
} from "lucide-react"
import { NotificationBell } from "@/components/admin/notification-bell"

const adminNavItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/claims", label: "Flagged Claims", icon: FileWarning },
  { href: "/admin/members", label: "Members", icon: Users },
  { href: "/admin/wallets", label: "Wallets", icon: Wallet },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin/compliance", label: "Legal Compliance", icon: Scale },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [userInfo, setUserInfo] = useState<{ memberId: string; fullName: string; type: string } | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const stored = sessionStorage.getItem("claimsGuardUser")
    if (stored) {
      const parsed = JSON.parse(stored)
      if (parsed.type !== "admin") {
        router.push("/dashboard/upload")
        return
      }
      setUserInfo(parsed)
    } else {
      router.push("/")
    }
  }, [router])

  const handleSignOut = () => {
    sessionStorage.removeItem("claimsGuardUser")
    router.push("/")
  }

  if (!userInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/admin" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-destructive flex items-center justify-center">
                <Shield className="w-5 h-5 text-destructive-foreground" />
              </div>
              <div className="hidden sm:block">
                <span className="text-xl font-bold text-foreground">Claims Guard</span>
                <Badge variant="destructive" className="ml-2 text-xs">Admin</Badge>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {adminNavItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      className={`gap-2 ${isActive ? "bg-secondary" : ""}`}
                    >
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </Button>
                  </Link>
                )
              })}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-3">
              {/* Notification Bell */}
              <NotificationBell />

              {/* User info */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/10 border border-destructive/20">
                <Crown className="w-4 h-4 text-destructive" />
                <span className="text-sm font-medium text-foreground">
                  {userInfo.fullName?.split(" ")[0] || "Admin"}
                </span>
              </div>

              <ThemeToggle />

              <Button
                variant="ghost"
                size="icon"
                onClick={handleSignOut}
                className="hidden md:flex"
              >
                <LogOut className="w-4 h-4" />
              </Button>

              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-border bg-card"
            >
              <nav className="container mx-auto px-4 py-4 space-y-2">
                {/* User info on mobile */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 mb-4">
                  <Crown className="w-4 h-4 text-destructive" />
                  <span className="text-sm font-medium text-foreground">
                    {userInfo.fullName || "Administrator"}
                  </span>
                  <Badge variant="destructive">Admin</Badge>
                </div>

                {adminNavItems.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Button
                        variant={isActive ? "secondary" : "ghost"}
                        className="w-full justify-start gap-2"
                      >
                        <item.icon className="w-4 h-4" />
                        {item.label}
                      </Button>
                    </Link>
                  )
                })}

                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                  onClick={handleSignOut}
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </Button>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 mt-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="w-4 h-4" />
              <span>Claims Guard Admin Portal - Fraud Detection System</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Compliant with Kenya Anti-Corruption and Economic Crimes Act
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
