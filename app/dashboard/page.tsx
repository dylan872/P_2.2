"use client"

import { useRef } from "react"
import { useAuth } from "@/hooks/use-auth"
import { DashboardStats } from "./dashboard-stats"
import { RecentClaims, RecentClaimsHandle } from "./recent-claims"
import { UploadForm } from "./upload-form"
import { WalletCard, WalletCardHandle } from "./wallet-card"

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const recentClaimsRef = useRef<RecentClaimsHandle | null>(null)
  const walletCardRef = useRef<WalletCardHandle | null>(null)

  const handleClaimUploaded = () => {
    console.log("[v0] Claim uploaded, refreshing data...")
    recentClaimsRef.current?.refresh()
    walletCardRef.current?.refresh()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        Loading dashboard...
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500">
        Please sign in to view your dashboard.
      </div>
    )
  }

  return (
    <main className="p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400">Welcome back, {user.fullName}</p>
      </div>

      <section>
        <h2 className="text-xl font-semibold text-white mb-4">Claims Summary</h2>
        <DashboardStats />
      </section>

      <section className="bg-slate-900 rounded-lg p-6 border border-slate-800">
        <h2 className="text-xl font-semibold text-white mb-4">Upload New Claim</h2>
        <UploadForm onClaimUploaded={handleClaimUploaded} />
      </section>

      <section>
        <h2 className="text-xl font-semibold text-white mb-4">Recent Claims</h2>
        <RecentClaims ref={recentClaimsRef} />
      </section>

      <section>
        <h2 className="text-xl font-semibold text-white mb-4">My Wallet</h2>
        <WalletCard ref={walletCardRef} />
      </section>
    </main>
  )
}
