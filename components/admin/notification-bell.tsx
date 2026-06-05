"use client"

import { useState, useEffect } from "react"
import { Bell, FileWarning, Clock, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatDistanceToNow } from "date-fns"

interface Notification {
  id: string
  claimNumber: string
  memberName: string
  fraudScore: number
  fraudLabel: string
  totalBilled: number
  createdAt: string
  viewed: boolean
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchNotifications = async () => {
    try {
      const response = await fetch("/api/admin/notifications")
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setNotifications(data.data)
        }
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error)
    } finally {
      setLoading(false)
    }
  }

  const markAsViewed = async (notificationId: string) => {
    try {
      await fetch(`/api/admin/notifications/${notificationId}/view`, {
        method: "POST",
      })
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, viewed: true } : n
        )
      )
    } catch (error) {
      console.error("Failed to mark notification as viewed:", error)
    }
  }

  const markAllAsViewed = async () => {
    try {
      await fetch("/api/admin/notifications/view-all", {
        method: "POST",
      })
      setNotifications((prev) => prev.map((n) => ({ ...n, viewed: true })))
    } catch (error) {
      console.error("Failed to mark all as viewed:", error)
    }
  }

  const unviewedCount = notifications.filter((n) => !n.viewed).length

  const getFraudLabelColor = (label: string) => {
    switch (label) {
      case "FRAUDULENT":
        return "bg-red-500/10 text-red-500 border-red-500/20"
      case "SUSPICIOUS":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20"
      default:
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unviewedCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
              {unviewedCount > 9 ? "9+" : unviewedCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-semibold text-foreground">Recent Claims</h3>
            {unviewedCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unviewedCount} new
              </Badge>
            )}
          </div>
          {unviewedCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsViewed}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-96">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                No recent claims to review
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-muted/50 transition-colors cursor-pointer ${
                    !notification.viewed ? "bg-primary/5" : ""
                  }`}
                  onClick={() => {
                    if (!notification.viewed) {
                      markAsViewed(notification.id)
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        notification.fraudLabel === "FRAUDULENT"
                          ? "bg-red-500/10"
                          : notification.fraudLabel === "SUSPICIOUS"
                          ? "bg-amber-500/10"
                          : "bg-emerald-500/10"
                      }`}
                    >
                      <FileWarning
                        className={`w-4 h-4 ${
                          notification.fraudLabel === "FRAUDULENT"
                            ? "text-red-500"
                            : notification.fraudLabel === "SUSPICIOUS"
                            ? "text-amber-500"
                            : "text-emerald-500"
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm text-foreground truncate">
                          {notification.claimNumber}
                        </span>
                        {!notification.viewed && (
                          <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {notification.memberName}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge
                          variant="outline"
                          className={`text-xs ${getFraudLabelColor(
                            notification.fraudLabel
                          )}`}
                        >
                          {notification.fraudLabel} ({notification.fraudScore}%)
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          KSh {notification.totalBilled.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <div className="px-4 py-3 border-t border-border">
            <Button
              variant="ghost"
              className="w-full text-sm"
              onClick={() => {
                setIsOpen(false)
                window.location.href = "/admin/claims"
              }}
            >
              View all claims
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
