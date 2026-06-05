"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import {
  User,
  Phone,
  Calendar,
  Shield,
  Save,
  Camera,
  IdCard,
  CreditCard,
  Heart,
  CheckCircle,
  AlertCircle,
  Loader2,
  MapPin,
} from "lucide-react"
import { formatKSH } from "@/lib/claim-schema"
import { WalletBalance } from "@/components/wallet-balance"
import { membersApi, MemberProfile, MemberClaimStats } from "@/lib/api-client"

export default function ProfilePage() {
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Get user from session
  const [currentUser, setCurrentUser] = useState<{ memberId: string; type: string } | null>(null)
  const [profile, setProfile] = useState<MemberProfile | null>(null)
  const [stats, setStats] = useState<MemberClaimStats | null>(null)
  const [newProfilePicture, setNewProfilePicture] = useState<string | null>(null)

  useEffect(() => {
    const user = sessionStorage.getItem("claimsGuardUser")
    if (user) {
      const parsedUser = JSON.parse(user)
      setCurrentUser(parsedUser)
      loadProfile(parsedUser.memberId)
    } else {
      setIsLoading(false)
      setError("Please log in to view your profile")
    }
  }, [])

  const loadProfile = async (memberId: string) => {
    setIsLoading(true)
    setError(null)
    try {
      // Fetch profile from backend
      const response = await membersApi.getProfile(memberId)
      setProfile(response.data.profile)

      // Fetch stats from backend
      const statsData = await membersApi.getClaimStats(memberId)
      setStats(statsData)
    } catch (err) {
      setError("Failed to load profile. Please try again.")
      console.error("Profile load error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("Image size must be less than 5MB")
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        setNewProfilePicture(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSavePhoto = async () => {
    if (!newProfilePicture || !currentUser) return

    setIsSaving(true)
    setError(null)

    try {
      // Upload profile picture to backend
      await membersApi.updateProfilePicture(currentUser.memberId, newProfilePicture)

      // Update local state
      if (profile) {
        setProfile({ ...profile, profilePicture: newProfilePicture })
      }

      setNewProfilePicture(null)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    } catch (err) {
      setError("Failed to save profile picture. Please try again.")
      console.error("Save error:", err)
    } finally {
      setIsSaving(false)
    }
  }

  const cancelPhotoChange = () => {
    setNewProfilePicture(null)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-500/10 text-green-600 border-green-500/20"
      case "SUSPENDED":
        return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
      case "EXPIRED":
      case "INACTIVE":
        return "bg-red-500/10 text-red-600 border-red-500/20"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const m = today.getMonth() - birthDate.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  const daysUntilExpiry = (expiryDate: string | null) => {
    if (!expiryDate) return null
    const expiry = new Date(expiryDate)
    const today = new Date()
    const diff = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    )
  }

  if (error && !profile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Error Loading Profile</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => currentUser && loadProfile(currentUser.memberId)}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!profile) return null

  const expiryDays = daysUntilExpiry(profile.coverExpiry)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">My Profile</h1>
        <p className="text-muted-foreground mt-1">
          View your personal information and insurance details
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Card with Photo Edit */}
        <Card className="lg:col-span-1">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              {/* Avatar with edit option - Only editable field */}
              <div className="relative group">
                <Avatar className="w-28 h-28 border-4 border-background shadow-lg">
                  <AvatarImage src={newProfilePicture || profile.profilePicture || ""} />
                  <AvatarFallback className="text-2xl font-semibold bg-primary/10 text-primary">
                    {getInitials(profile.fullName)}
                  </AvatarFallback>
                </Avatar>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-2 bg-primary rounded-full shadow-lg cursor-pointer"
                >
                  <Camera className="w-4 h-4 text-primary-foreground" />
                </motion.button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>

              {/* Save/Cancel buttons for photo */}
              <AnimatePresence>
                {newProfilePicture && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex gap-2 mt-4"
                  >
                    <Button size="sm" variant="outline" onClick={cancelPhotoChange}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSavePhoto} disabled={isSaving}>
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-1" />
                      ) : saveSuccess ? (
                        <CheckCircle className="w-4 h-4 mr-1" />
                      ) : (
                        <Save className="w-4 h-4 mr-1" />
                      )}
                      {saveSuccess ? "Saved!" : "Save Photo"}
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>

              <h2 className="mt-4 text-xl font-semibold text-foreground">
                {profile.fullName}
              </h2>
              <p className="text-muted-foreground">{profile.memberNumber}</p>

              <Badge className={`mt-3 ${getStatusColor(profile.coverStatus)}`}>
                {profile.coverStatus === "ACTIVE" && <CheckCircle className="w-3 h-3 mr-1" />}
                {profile.coverStatus !== "ACTIVE" && <AlertCircle className="w-3 h-3 mr-1" />}
                {profile.coverStatus}
              </Badge>

              {expiryDays !== null && (
                <p className="text-sm text-muted-foreground mt-2">
                  {expiryDays > 0
                    ? `Cover expires in ${expiryDays} days`
                    : "Cover has expired"}
                </p>
              )}

              <Separator className="my-6" />

              {/* Quick Stats */}
              <div className="w-full space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Age</span>
                  <span className="font-medium">{calculateAge(profile.dateOfBirth)} years</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Gender</span>
                  <span className="font-medium">{profile.gender}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Insurer</span>
                  <span className="font-medium">{profile.insurerType}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Details Cards - Read Only */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information from ID Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="w-5 h-5 text-primary" />
                  Personal Information
                </CardTitle>
                <Badge variant="outline" className="text-xs">
                  <IdCard className="w-3 h-3 mr-1" />
                  From National ID
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Full Name
                </Label>
                <p className="font-medium">{profile.fullName}</p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Date of Birth
                </Label>
                <p className="font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  {new Date(profile.dateOfBirth).toLocaleDateString("en-KE", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Phone Number
                </Label>
                <p className="font-medium flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  {profile.phoneNumber || "Not provided"}
                </p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Gender
                </Label>
                <p className="font-medium">{profile.gender}</p>
              </div>

              {profile.address && (
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                    Address
                  </Label>
                  <p className="font-medium flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    {profile.address}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Identification */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <IdCard className="w-5 h-5 text-primary" />
                Identification Documents
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                  SHA Member Number
                </Label>
                <p className="font-medium flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-muted-foreground" />
                  {profile.memberNumber}
                </p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                  National ID Number
                </Label>
                <p className="font-medium flex items-center gap-2">
                  <IdCard className="w-4 h-4 text-muted-foreground" />
                  ****{profile.nationalId.slice(-4)}
                </p>
              </div>

              {profile.policyNumber && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                    Policy Number
                  </Label>
                  <p className="font-medium">{profile.policyNumber}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Insurance Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="w-5 h-5 text-primary" />
                Insurance Coverage
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Insurer Type
                </Label>
                <p className="font-medium">{profile.insurerType}</p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Cover Status
                </Label>
                <Badge className={getStatusColor(profile.coverStatus)}>
                  {profile.coverStatus}
                </Badge>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Cover Expiry Date
                </Label>
                <p className="font-medium">
                  {profile.coverExpiry
                    ? new Date(profile.coverExpiry).toLocaleDateString("en-KE", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : "N/A"}
                </p>
              </div>

              {expiryDays !== null && expiryDays > 0 && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                    Days Until Expiry
                  </Label>
                  <p
                    className={`font-medium ${expiryDays <= 30 ? "text-yellow-600" : "text-green-600"}`}
                  >
                    {expiryDays} days
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Claims Summary - Member sees only their own data */}
          {stats && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Heart className="w-5 h-5 text-primary" />
                  My Claims Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="bg-muted/50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-foreground">{stats.totalClaims}</p>
                    <p className="text-sm text-muted-foreground">Total Claims</p>
                  </div>
                  <div className="bg-green-500/10 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{stats.approvedClaims}</p>
                    <p className="text-sm text-muted-foreground">Approved</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-foreground">
                      {formatKSH(stats.totalClaimed)}
                    </p>
                    <p className="text-sm text-muted-foreground">Total Claimed</p>
                  </div>
                  <div className="bg-primary/10 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-primary">
                      {formatKSH(stats.totalApproved)}
                    </p>
                    <p className="text-sm text-muted-foreground">Total Approved</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Wallet Balance */}
          {profile && (
            <WalletBalance memberId={profile.id} />
          )}
        </div>
      </div>
    </div>
  )
}
