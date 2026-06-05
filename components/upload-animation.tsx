"use client"

import { motion, AnimatePresence } from "framer-motion"
import { FileText, Upload, CheckCircle, Loader2, Sparkles } from "lucide-react"

interface UploadAnimationProps {
  stage: "idle" | "uploading" | "processing" | "complete"
  progress?: number
  fileName?: string
}

export function UploadAnimation({ stage, progress = 0, fileName }: UploadAnimationProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <AnimatePresence mode="wait">
        {stage === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex flex-col items-center gap-4"
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="relative"
            >
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload className="w-10 h-10 text-primary" />
              </div>
              <motion.div
                className="absolute -top-2 -right-2"
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Sparkles className="w-6 h-6 text-accent" />
              </motion.div>
            </motion.div>
            <p className="text-muted-foreground text-center">
              Drop your claim documents here
            </p>
          </motion.div>
        )}

        {stage === "uploading" && (
          <motion.div
            key="uploading"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex flex-col items-center gap-6"
          >
            <div className="relative">
              {/* Outer pulsing ring */}
              <motion.div
                className="absolute inset-0 rounded-full bg-primary/20"
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              
              {/* File icon bouncing */}
              <motion.div
                className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center relative z-10"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity }}
                >
                  <FileText className="w-10 h-10 text-primary" />
                </motion.div>
              </motion.div>

              {/* Orbiting particles */}
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="absolute w-3 h-3 rounded-full bg-accent"
                  style={{ top: "50%", left: "50%" }}
                  animate={{
                    x: [0, 50 * Math.cos((i * 2 * Math.PI) / 3), 0],
                    y: [0, 50 * Math.sin((i * 2 * Math.PI) / 3), 0],
                    opacity: [1, 0.5, 1],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                />
              ))}
            </div>

            {/* Progress bar */}
            <div className="w-48">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <p className="text-sm text-muted-foreground text-center mt-2">
                Uploading... {progress}%
              </p>
            </div>

            {fileName && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-foreground font-medium truncate max-w-xs"
              >
                {fileName}
              </motion.p>
            )}
          </motion.div>
        )}

        {stage === "processing" && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex flex-col items-center gap-6"
          >
            <div className="relative">
              {/* Scanning effect */}
              <motion.div
                className="absolute inset-0 w-24 h-24 rounded-full border-4 border-primary/30"
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />
              <motion.div
                className="absolute inset-0 w-24 h-24 rounded-full border-4 border-transparent border-t-primary"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
              </div>
            </div>

            {/* Processing text with dots */}
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Extracting data</span>
              <motion.span
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                .
              </motion.span>
              <motion.span
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
              >
                .
              </motion.span>
              <motion.span
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
              >
                .
              </motion.span>
            </div>

            {/* Fake data extraction animation */}
            <div className="flex gap-2">
              {["Member ID", "Provider", "Amount"].map((label, i) => (
                <motion.div
                  key={label}
                  className="px-3 py-1 bg-muted rounded-full text-xs text-muted-foreground"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.3 }}
                >
                  {label}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {stage === "complete" && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex flex-col items-center gap-4"
          >
            {/* Success burst */}
            <div className="relative">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ duration: 0.5 }}
                className="w-24 h-24 rounded-full bg-green-500/10 flex items-center justify-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                >
                  <CheckCircle className="w-12 h-12 text-green-500" />
                </motion.div>
              </motion.div>

              {/* Confetti particles */}
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 rounded-full"
                  style={{
                    top: "50%",
                    left: "50%",
                    backgroundColor: ["#10b981", "#3b82f6", "#f59e0b", "#ef4444"][i % 4],
                  }}
                  initial={{ x: 0, y: 0, opacity: 1 }}
                  animate={{
                    x: Math.cos((i * Math.PI) / 4) * 60,
                    y: Math.sin((i * Math.PI) / 4) * 60,
                    opacity: 0,
                  }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                />
              ))}
            </div>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-green-600 dark:text-green-400 font-medium"
            >
              Upload Complete!
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
