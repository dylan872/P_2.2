import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Wallet, TrendingUp, ArrowUpRight, ArrowDownRight, FileText, Loader2 } from "lucide-react"
import { formatKSH } from "@/lib/claim-schema"

export interface WalletCardHandle {
  refresh: () => void
}

interface WalletData {
  wallet_id: number
  member_id: number
  balance: number
  created_at: string
  updated_at: string
}

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

interface WalletApiResponse {
  success: boolean
  data: {
    wallet: WalletData
    transactions: Transaction[]
    pendingClaims: PendingClaim[]
    pendingReimbursement: number
    currentBalance: number
    projectedBalance: number
  }
}

export const WalletCard = forwardRef<WalletCardHandle, {}>((_, ref) => {
  const { user } = useAuth()
  const [wallet, setWallet] = useState<WalletData | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [pendingClaims, setPendingClaims] = useState<PendingClaim[]>([])
  const [pendingReimbursement, setPendingReimbursement] = useState(0)
  const [projectedBalance, setProjectedBalance] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchWallet = useCallback(async () => {
    if (!user?.id) return
    try {
      const res = await fetch(`/api/dashboard/wallet?memberId=${user.id}`)
      if (res.ok) {
        const json: WalletApiResponse = await res.json()
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
    }
  }, [user?.id])

  useImperativeHandle(ref, () => ({ refresh: fetchWallet }), [fetchWallet])

  useEffect(() => {
    if (!user?.id) return
    fetchWallet()
  }, [user?.id, fetchWallet])

  useEffect(() => {
    const interval = setInterval(() => {
      if (user?.id) {
        fetchWallet()
      }
    }, 10000)
    return () => clearInterval(interval)
  }, [user?.id, fetchWallet])

  if (loading) {
    return (
      <Card className="bg-slate-900 border-slate-800">
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

  const currentBalance = wallet?.balance || 0

  const calculateReimbursement = (claimedAmount: number): number => {
    const deductible = 20000
    const coveragePercentage = 0.8
    const coPayment = 2000
    const afterDeductible = Math.max(0, claimedAmount - deductible)
    const afterCoverage = afterDeductible * coveragePercentage
    return Math.max(0, afterCoverage - coPayment)
  }

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center gap-2 text-lg">
          <Wallet className="w-5 h-5 text-emerald-500" />
          My Reimbursement Wallet
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-3xl font-bold text-emerald-400">
            KSh {currentBalance.toLocaleString()}
          </span>
          <span className="text-xs text-slate-400">available balance</span>
        </div>

        {pendingReimbursement > 0 && (
          <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 mb-4">
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

        {pendingClaims.length > 0 && (
          <div className="space-y-2 mb-4">
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
                  +KSh {calculateReimbursement(claim.total_billed).toLocaleString()}
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
                    <ArrowDownRight className="w-4 h-4 text-emerald-500" />
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

        {(!transactions || transactions.length === 0) && (wallet?.balance || 0) === 0 && pendingReimbursement === 0 && (
          <p className="text-sm text-slate-500 text-center py-4">
            No transactions yet. When your claims are approved, reimbursements will appear here.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
)