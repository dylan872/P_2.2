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
  Upload,
  History,
  BarChart3,
  LogOut,
  Menu,
  X,
  User,
  Building2,
  Crown,
  Wallet,
} from "lucide-react"

const navItems = [
  { href: "/dashboard/upload", label: "Upload Claims", icon: Upload },
  { href: "/dashboard/history", label: "Claims History", icon: History },
  { href: "/dashboard/wallet", label: "My Wallet", icon: Wallet },
  { href: "/dashboard/stats", label: "Statistics", icon: BarChart3 },
  { href: "/dashboard/profile", label: "My Profile", icon: User },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [userInfo, setUserInfo] = useState<{ memberId: string; type: string } | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const stored = sessionStorage.getItem("claimsGuardUser")
    if (stored) {
      setUserInfo(JSON.parse(stored))
    } else {
      router.push("/")
    }
  }, [router])

  const handleSignOut = () => {
    sessionStorage.removeItem("claimsGuardUser")
    router.push("/")
  }

  const getUserTypeIcon = () => {
    switch (userInfo?.type) {
      case "admin":
        return <Crown className="w-4 h-4" />
      case "hospital":
        return <Building2 className="w-4 h-4" />
      default:
        return <User className="w-4 h-4" />
    }
  }

  const getUserTypeBadge = () => {
    switch (userInfo?.type) {
      case "admin":
        return <Badge variant="default">Admin</Badge>
      case "hospital":
        return <Badge variant="secondary">Hospital</Badge>
      default:
        return <Badge variant="outline">Member</Badge>
    }
  }

  if (!userInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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
            <Link href="/dashboard/upload" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground hidden sm:inline">
                Claims Guard
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
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
              {/* User info */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted">
                {getUserTypeIcon()}
                <span className="text-sm font-medium text-foreground">
                  {userInfo.memberId}
                </span>
                {getUserTypeBadge()}
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
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted mb-4">
                  {getUserTypeIcon()}
                  <span className="text-sm font-medium text-foreground">
                    {userInfo.memberId}
                  </span>
                  {getUserTypeBadge()}
                </div>

                {navItems.map((item) => {
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
              <span>Claims Guard - Healthcare Claims Processing</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Secure and encrypted claim submissions
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
