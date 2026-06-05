"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Wallet, TrendingUp, ArrowUpRight, Loader2, FileText } from "lucide-react"
import { formatKSH } from "@/lib/claim-schema"

interface WalletData {
  wallet_id: number
  member_id: number
  balance: number
  created_at: string
  updated_at: string
}

interface WalletTransaction {
  transaction_id: number
  wallet_id: number
  amount: number
  transaction_type: "CREDIT" | "DEBIT"
  description: string
  related_claim_id: number | null
  created_at: string
}

interface PendingClaim {
  id: string
  claim_number: string
  total_billed: number
  status: string
  service_date: string
}

interface WalletBalanceData {
  wallet: WalletData
  transactions: WalletTransaction[]
  pendingClaims: PendingClaim[]
  pendingReimbursement: number
  currentBalance: number
  projectedBalance: number
}

interface WalletBalanceProps {
  memberId: string
  showPendingClaims?: boolean
  className?: string
}

export function WalletBalance({ memberId, showPendingClaims = true, className = "" }: WalletBalanceProps) {
  const [data, setData] = useState<WalletBalanceData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchWallet = async () => {
    try {
      const res = await fetch(`/api/members/${memberId}/wallet`)
      if (res.ok) {
        const json = await res.json()
        if (json.success) {
          setData(json.data)
        }
      }
    } catch (err) {
      console.error("Failed to fetch wallet:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!memberId) return
    fetchWallet()
  }, [memberId])

  if (loading) {
    return (
      <Card className={`bg-slate-900 border-slate-800 ${className}`}>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-slate-800 rounded w-1/3" />
            <div className="h-10 bg-slate-800 rounded w-1/2" />
            <div className="h-4 bg-slate-800 rounded w-2/3" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  const { wallet, transactions, pendingClaims, pendingReimbursement, currentBalance, projectedBalance } = data

  return (
    <Card className={`bg-slate-900 border-slate-800 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center gap-2 text-lg">
          <Wallet className="w-5 h-5 text-emerald-500" />
          My Reimbursement Wallet
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-emerald-400">
            KSh {currentBalance.toLocaleString()}
          </span>
          <span className="text-xs text-slate-400">available balance</span>
        </div>

        {pendingReimbursement > 0 && (
          <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
            <div className="flex items-center gap-1 text-xs text-blue-400 mb-1">
              <FileText className="w-3 h-3" />
              <span className="font-medium">Pending Claims ({pendingClaims.length})</span>
            </div>
            <p className="text-xs text-slate-400">
              Estimated reimbursement: <span className="text-blue-400 font-medium">KSh {pendingReimbursement.toLocaleString()}</span>
            </p>
            <div className="flex items-center gap-1 mt-2 text-sm">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <span className="text-slate-400">Projected balance:</span>
              <span className="font-bold text-emerald-400">KSh {projectedBalance.toLocaleString()}</span>
            </div>
          </div>
        )}

        {showPendingClaims && pendingClaims.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Pending Claims</p>
            {pendingClaims.map((claim) => (
              <div key={claim.id} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                <div className="flex items-center gap-2">
                  <ArrowUpRight className="w-4 h-4 text-blue-400" />
                  <div>
                    <p className="text-sm text-slate-200 truncate max-w-[200px]">{claim.claim_number}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(claim.service_date).toLocaleDateString("en-KE", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-blue-400">
                  +KSh {formatKSH(calculatePendingReimbursement(claim.total_billed))}
                </span>
              </div>
            ))}
          </div>
        )}

        {transactions.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Recent Transactions</p>
            {transactions.slice(0, 5).map((tx) => (
              <div key={tx.transaction_id} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                <div className="flex items-center gap-2">
                  {tx.transaction_type === "CREDIT" ? (
                    <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <ArrowUpRight className="w-4 h-4 text-red-400" />
                  )}
                  <div>
                    <p className="text-sm text-slate-200 truncate max-w-[200px]">{tx.description}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(tx.created_at).toLocaleDateString("en-KE", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                </div>
                <span className={`text-sm font-semibold ${tx.transaction_type === "CREDIT" ? "text-emerald-400" : "text-red-400"}`}>
                  {tx.transaction_type === "CREDIT" ? "+" : "-"}KSh {tx.amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}

        {(!transactions || transactions.length === 0) && currentBalance === 0 && pendingReimbursement === 0 && (
          <p className="text-sm text-slate-500 text-center py-4">
            No transactions yet. When your claims are approved, reimbursements will appear here.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function calculatePendingReimbursement(claimedAmount: number): number {
  const deductible = 20000
  const coveragePercentage = 0.8
  const coPayment = 2000
  const afterDeductible = Math.max(0, claimedAmount - deductible)
  const afterCoverage = afterDeductible * coveragePercentage
  return Math.max(0, afterCoverage - coPayment)
}
