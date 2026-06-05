"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Wallet, TrendingUp, ArrowUpRight, ArrowDownRight, FileText, Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatKSH } from "@/lib/claim-schema"
import { useAuth } from "@/hooks/use-auth"

interface Transaction {
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

interface WalletData {
  wallet_id: number
  member_id: number
  balance: number
  created_at: string
  updated_at: string
}

export default function WalletPage() {
  const { user } = useAuth()
  const [wallet, setWallet] = useState<WalletData | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [pendingClaims, setPendingClaims] = useState<PendingClaim[]>([])
  const [pendingReimbursement, setPendingReimbursement] = useState(0)
  const [projectedBalance, setProjectedBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchWallet = async () => {
    if (!user?.id) return
    try {
      const res = await fetch(`/api/members/${user.id}/wallet`)
      if (res.ok) {
        const json = await res.json()
        if (json.success) {
          setWallet(json.data.wallet)
          setTransactions(json.data.transactions || [])
          setPendingClaims(json.data.pendingClaims || [])
          setPendingReimbursement(json.data.pendingReimbursement || 0)
          setProjectedBalance(json.data.projectedBalance || 0)
        }
      }
    } catch (err) {
      console.error("Failed to fetch wallet:", err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchWallet()
  }, [user?.id])

  const handleRefresh = () => {
    setRefreshing(true)
    setLoading(true)
    fetchWallet()
  }

  const calculateReimbursement = (claimedAmount: number): number => {
    const deductible = 20000
    const coveragePercentage = 0.8
    const coPayment = 2000
    const afterDeductible = Math.max(0, claimedAmount - deductible)
    const afterCoverage = afterDeductible * coveragePercentage
    return Math.max(0, afterCoverage - coPayment)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading your wallet...</p>
        </div>
      </div>
    )
  }

  const currentBalance = wallet?.balance || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Wallet className="w-8 h-8 text-emerald-500" />
            My Wallet
          </h1>
          <p className="text-muted-foreground mt-1">
            Your reimbursement balance and transaction history
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Balance</p>
                <p className="text-2xl font-bold text-emerald-600">
                  KSh {currentBalance.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Available for withdrawal
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {pendingReimbursement > 0 && (
          <Card className="border-blue-500/20 bg-blue-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600">Pending Reimbursement</p>
                  <p className="text-2xl font-bold text-blue-600">
                    KSh {pendingReimbursement.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {pendingClaims.length} claim{pendingClaims.length !== 1 ? "s" : ""} awaiting approval
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {pendingReimbursement > 0 && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Projected Balance</p>
                  <p className="text-2xl font-bold text-foreground">
                    KSh {projectedBalance.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    After pending claims are approved
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* How it works */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <p className="text-sm font-medium text-foreground mb-2">How reimbursements are calculated</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            When your claim is approved, reimbursement is calculated as: <span className="font-medium text-foreground">Total Billed − KSh 20,000 deductible × 80% coverage − KSh 2,000 copay</span>.
            The result is credited to your wallet automatically. Pending claims show an estimate above; actual amount may vary based on the approved amount.
          </p>
        </CardContent>
      </Card>

      {/* Pending Claims Detail */}
      {pendingClaims.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="w-5 h-5 text-blue-500" />
              Pending Claims ({pendingClaims.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingClaims.map((claim) => (
                <div
                  key={claim.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <ArrowUpRight className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{claim.claim_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(claim.service_date).toLocaleDateString("en-KE", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Billed</p>
                    <p className="font-semibold text-foreground">KSh {formatKSH(claim.total_billed)}</p>
                    <p className="text-xs text-blue-600">
                      Est. reimbursement: +KSh {formatKSH(calculateReimbursement(claim.total_billed))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ArrowDownRight className="w-5 h-5 text-emerald-500" />
            Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length > 0 ? (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div
                  key={tx.transaction_id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      tx.transaction_type === "CREDIT"
                        ? "bg-emerald-500/10"
                        : "bg-red-500/10"
                    }`}>
                      {tx.transaction_type === "CREDIT" ? (
                        <ArrowDownRight className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <ArrowUpRight className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.created_at).toLocaleDateString("en-KE", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                  <span className={`text-lg font-bold ${
                    tx.transaction_type === "CREDIT" ? "text-emerald-600" : "text-red-500"
                  }`}>
                    {tx.transaction_type === "CREDIT" ? "+" : "-"}KSh {formatKSH(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Wallet className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No transactions yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                When your claims are approved, reimbursements will appear here
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
