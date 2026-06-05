"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Wallet, Search, ArrowRight } from "lucide-react"
import Link from "next/link"

interface WalletRow {
  wallet_id: number
  member_id: number
  balance: number
  created_at: string
  updated_at: string
  member_name: string
  member_number: string
}

export default function AdminWalletsPage() {
  const [wallets, setWallets] = useState<WalletRow[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("balance_desc")

  useEffect(() => {
    fetchWallets()
  }, [sortBy])

  const fetchWallets = async () => {
    try {
      const params = new URLSearchParams()
      if (sortBy) params.append("sort", sortBy)
      const response = await fetch(`/api/admin/wallets?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setWallets(data.data)
        }
      }
    } catch (error) {
      console.error("Failed to fetch wallets:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredWallets = wallets.filter((w) =>
    w.member_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.member_number.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-muted-foreground">Loading wallets...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Wallet className="w-8 h-8 text-emerald-500" />
          Member Wallets
        </h1>
        <p className="text-muted-foreground mt-1">
          Reimbursement wallet balances for all insured members
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by member name or number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="balance_desc">Highest Balance</SelectItem>
                <SelectItem value="balance_asc">Lowest Balance</SelectItem>
                <SelectItem value="name_asc">Name A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {filteredWallets.map((wallet, index) => (
          <motion.div
            key={wallet.wallet_id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
          >
            <Card className="hover:border-primary/30 transition-colors">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <Wallet className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{wallet.member_name}</p>
                      <p className="text-sm text-muted-foreground">{wallet.member_number}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-lg font-bold text-emerald-600">
                        KSh {wallet.balance.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Updated {new Date(wallet.updated_at).toLocaleDateString("en-KE")}
                      </p>
                    </div>
                    <Link href={`/admin/wallets/${wallet.member_id}`}>
                      <Button variant="outline" size="sm" className="gap-1">
                        Details <ArrowRight className="w-3 h-3" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
        {filteredWallets.length === 0 && (
          <div className="text-center py-12">
            <Wallet className="w-12 h-12 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-muted-foreground">No wallets found</p>
          </div>
        )}
      </div>
    </div>
  )
}
