"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Scale,
  AlertTriangle,
  Shield,
  Gavel,
  FileText,
  Users,
  Building2,
  Lock,
  BookOpen,
  ExternalLink,
} from "lucide-react"

const legalSections = [
  {
    title: "Anti-Corruption and Economic Crimes Act (ACECA)",
    icon: Gavel,
    description: "Cap 65 of the Laws of Kenya",
    provisions: [
      {
        section: "Section 2",
        title: "Definition of Economic Crime",
        content: "Healthcare fraud falls under economic crimes as it involves deliberate misrepresentation to obtain financial benefits from insurance schemes or government healthcare programs.",
      },
      {
        section: "Section 45",
        title: "Fraudulent Acquisition of Public Property",
        content: "Submitting false claims to NHIF/SHA constitutes fraudulent acquisition of public funds, punishable by imprisonment of up to 10 years or a fine up to KSh 1,000,000, or both.",
      },
      {
        section: "Section 46",
        title: "False Claims and Statements",
        content: "Any person who makes a false statement or claim to obtain benefits from a public body commits an offense punishable by imprisonment.",
      },
    ],
  },
  {
    title: "Penal Code (Cap 63)",
    icon: Scale,
    description: "Criminal Offenses Related to Fraud",
    provisions: [
      {
        section: "Section 313",
        title: "Obtaining by False Pretences",
        content: "Any person who by false pretence obtains anything capable of being stolen is guilty of a felony and liable to imprisonment for three years.",
      },
      {
        section: "Section 316",
        title: "Conspiracy to Defraud",
        content: "Conspiracy between healthcare providers and patients to submit false claims is punishable by imprisonment for up to seven years.",
      },
      {
        section: "Section 349",
        title: "Forgery",
        content: "Creating or altering medical documents to support fraudulent claims constitutes forgery, punishable by imprisonment for up to seven years.",
      },
    ],
  },
  {
    title: "Health Act, 2017",
    icon: Shield,
    description: "Healthcare-Specific Regulations",
    provisions: [
      {
        section: "Section 6",
        title: "Healthcare Provider Obligations",
        content: "Healthcare providers must maintain accurate records and submit truthful claims. Violation may result in deregistration and criminal prosecution.",
      },
      {
        section: "Section 74",
        title: "Offenses and Penalties",
        content: "Any person who contravenes provisions of this Act commits an offense and is liable on conviction to a fine not exceeding KSh 5,000,000 or imprisonment for a term not exceeding 3 years, or both.",
      },
    ],
  },
  {
    title: "NHIF Act (Cap 255) / SHA Regulations",
    icon: FileText,
    description: "Social Health Insurance Framework",
    provisions: [
      {
        section: "Section 20",
        title: "False Claims",
        content: "Submitting false or inflated claims to NHIF/SHA is an offense punishable by a fine of up to KSh 500,000 or imprisonment of up to 3 years.",
      },
      {
        section: "Section 21",
        title: "Provider Fraud",
        content: "Healthcare facilities found guilty of systematic fraud may be deregistered, fined, and their directors personally held liable.",
      },
      {
        section: "Regulation 15",
        title: "Beneficiary Fraud",
        content: "Members who collude with providers or submit claims for services not received face suspension of benefits and criminal prosecution.",
      },
    ],
  },
]

const commonFraudTypes = [
  {
    title: "Billing for Services Not Rendered",
    description: "Charging for medical services, procedures, or tests that were never performed",
    penalty: "Up to 7 years imprisonment",
    icon: FileText,
  },
  {
    title: "Upcoding",
    description: "Billing for more expensive services than those actually provided",
    penalty: "Up to 5 years imprisonment + fine",
    icon: AlertTriangle,
  },
  {
    title: "Duplicate Billing",
    description: "Submitting multiple claims for the same service",
    penalty: "Up to 3 years imprisonment",
    icon: FileText,
  },
  {
    title: "Unbundling",
    description: "Billing separately for services that should be billed together at a lower cost",
    penalty: "Fine up to KSh 1,000,000",
    icon: AlertTriangle,
  },
  {
    title: "Ghost Patients",
    description: "Submitting claims for non-existent patients",
    penalty: "Up to 10 years imprisonment",
    icon: Users,
  },
  {
    title: "Provider Kickbacks",
    description: "Receiving payments for patient referrals or unnecessary services",
    penalty: "Up to 7 years imprisonment",
    icon: Building2,
  },
]

export default function CompliancePage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Legal Compliance Framework</h1>
        <p className="text-muted-foreground mt-1">
          Healthcare fraud laws and penalties under Kenyan legislation
        </p>
      </div>

      {/* Warning Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="border-red-500/30 bg-linear-to-r from-red-500/5 to-amber-500/5">
          <CardContent className="py-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-lg">Important Legal Notice</h3>
                <p className="text-muted-foreground mt-1">
                  Healthcare fraud is a serious criminal offense in Kenya. Both healthcare providers and
                  beneficiaries who engage in fraudulent activities face severe penalties including
                  imprisonment, heavy fines, and permanent disqualification from healthcare programs.
                  All flagged claims must be thoroughly investigated before action is taken.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Common Fraud Types */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-destructive" />
              Common Healthcare Fraud Types
            </CardTitle>
            <CardDescription>
              Types of fraud detected by the Claims Guard system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {commonFraudTypes.map((fraud, index) => (
                <div
                  key={index}
                  className="p-4 rounded-lg border border-border hover:border-destructive/30 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <fraud.icon className="w-5 h-5 text-destructive" />
                    <h4 className="font-semibold text-foreground">{fraud.title}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{fraud.description}</p>
                  <Badge variant="destructive" className="text-xs">
                    Penalty: {fraud.penalty}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Legal Sections */}
      <div className="space-y-6">
        {legalSections.map((section, sectionIndex) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + sectionIndex * 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <section.icon className="w-5 h-5 text-primary" />
                  {section.title}
                </CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {section.provisions.map((provision, provisionIndex) => (
                    <div key={provisionIndex}>
                      {provisionIndex > 0 && <Separator className="mb-6" />}
                      <div className="flex items-start gap-4">
                        <Badge variant="outline" className="shrink-0 mt-1">
                          {provision.section}
                        </Badge>
                        <div>
                          <h4 className="font-semibold text-foreground mb-1">
                            {provision.title}
                          </h4>
                          <p className="text-muted-foreground text-sm">
                            {provision.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Reporting Obligations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Administrator Reporting Obligations
            </CardTitle>
            <CardDescription>
              Legal requirements for reporting suspected fraud
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-semibold text-foreground mb-2">Mandatory Reporting</h4>
                <p className="text-sm text-muted-foreground">
                  Under Section 47 of ACECA, any person who becomes aware of corruption or economic
                  crime in the course of their duties MUST report to the Ethics and Anti-Corruption
                  Commission (EACC) or face criminal liability.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-semibold text-foreground mb-2">Evidence Preservation</h4>
                <p className="text-sm text-muted-foreground">
                  All evidence of suspected fraud must be preserved for a minimum of 7 years.
                  Tampering with or destroying evidence is a criminal offense under Section 117
                  of the Penal Code.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-semibold text-foreground mb-2">Whistleblower Protection</h4>
                <p className="text-sm text-muted-foreground">
                  The Whistleblower Protection Act, 2017 protects persons who report suspected
                  fraud from retaliation. Administrators are encouraged to report without fear.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-semibold text-foreground mb-2">Due Process</h4>
                <p className="text-sm text-muted-foreground">
                  Before rejecting claims or taking action against providers/members, proper
                  investigation must be conducted. False accusations may result in defamation
                  liability.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Contact Information */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <Card className="border-primary/30">
          <CardContent className="py-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-foreground">Report Suspected Fraud</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Contact the relevant authorities for serious fraud cases
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Badge variant="outline" className="gap-1 py-2">
                  <ExternalLink className="w-3 h-3" />
                  EACC Hotline: 0800-723-233
                </Badge>
                <Badge variant="outline" className="gap-1 py-2">
                  <ExternalLink className="w-3 h-3" />
                  SHA Fraud Unit: 0800-720-250
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
