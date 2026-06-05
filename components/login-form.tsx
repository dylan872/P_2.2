"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, Eye, EyeOff, IdCard, CreditCard } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"

export function LoginForm() {
  const router = useRouter()
  const [memberNumber, setMemberNumber] = useState("")
  const [nationalId, setNationalId] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    
    if (!memberNumber || !nationalId) {
      setError("Please enter both Member ID and National ID")
      return
    }

    setIsLoading(true)
    
    try {
      // Call local API route for member login
      const response = await fetch("/api/auth/member-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberNumber, nationalId }),
      })
      
      const data = await response.json()
      
      if (data.success && data.data) {
        // Store auth data in session storage
        sessionStorage.setItem(
          "claimsGuardUser",
          JSON.stringify({
            id: data.data.member.id,
            memberId: data.data.member.memberNumber,
            nationalId: data.data.member.nationalId,
            fullName: data.data.member.fullName,
            dateOfBirth: data.data.member.dateOfBirth,
            gender: data.data.member.gender,
            phoneNumber: data.data.member.phoneNumber,
            address: data.data.member.address,
            insurerType: data.data.member.insurerType,
            policyNumber: data.data.member.policyNumber,
            coverStatus: data.data.member.coverStatus,
            coverExpiry: data.data.member.coverExpiry,
            profilePicture: data.data.member.profilePicture,
            type: data.data.member.role || "user",
          })
        )
        
        // Navigate to the appropriate dashboard based on role
        if (data.data.member.role === "admin") {
          router.push("/admin")
        } else {
          router.push("/dashboard")
        }
      } else {
        setError(data.message || "Login failed. Please check your credentials.")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4">
            <Shield className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground">Claims Guard</h1>
          <p className="text-muted-foreground mt-2">Healthcare Claims Processing Portal</p>
        </div>

        {/* Login Card */}
        <Card className="border-0 shadow-xl shadow-primary/5">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl text-center">Member Sign In</CardTitle>
            <CardDescription className="text-center">
              Enter your Member ID and National ID to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Member ID Field */}
              <div className="space-y-2">
                <Label htmlFor="memberNumber" className="text-sm font-medium">
                  Healthcare Member ID
                </Label>
                <div className="relative">
                  <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="memberNumber"
                    type="text"
                    placeholder="e.g. SHA-2024-001234"
                    value={memberNumber}
                    onChange={(e) => setMemberNumber(e.target.value)}
                    className="pl-10 h-11 bg-input border-border focus:border-primary focus:ring-primary"
                    autoComplete="username"
                  />
                </div>
              </div>

              {/* National ID Field (Password) */}
              <div className="space-y-2">
                <Label htmlFor="nationalId" className="text-sm font-medium">
                  National ID Number
                </Label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="nationalId"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your National ID"
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    className="pl-10 pr-10 h-11 bg-input border-border focus:border-primary focus:ring-primary"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? "Hide ID" : "Show ID"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your National ID is used to verify your identity
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
                  {error}
                </div>
              )}

              {/* Sign In Button */}
              <Button
                type="submit"
                className="w-full h-11 text-base font-medium"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Verifying...
                  </span>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            {/* Help Text */}
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Need help accessing your account?
              </p>
              <a
                href="#"
                className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
              >
                Contact Support
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Shield className="h-3 w-3" />
          <span>Your information is protected with 256-bit encryption</span>
        </div>
      </div>
    </div>
  )
}
