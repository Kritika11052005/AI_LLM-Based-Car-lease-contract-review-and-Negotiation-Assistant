"use client";

import { ContractSLA } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatCurrency,
  formatPercentage,
  formatIndianCurrency,
  cn,
} from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  Calendar,
  TrendingUp,
  Gauge,
  AlertTriangle,
} from "lucide-react";

interface SLADisplayProps {
  sla?: ContractSLA | null;
  contractId: string;
}

export function SLADisplay({ sla, contractId }: SLADisplayProps) {
  if (!sla) {
    return (
      <Card className="p-12">
        <div className="text-center space-y-4">
          <AlertTriangle className="w-16 h-16 mx-auto text-yellow-500" />
          <h3 className="text-xl font-semibold">No SLA Data Available</h3>
          <p className="text-muted-foreground">
            Contract analysis is still in progress or failed.
          </p>
        </div>
      </Card>
    );
  }

  const sections = [
    {
      title: "Financial Terms",
      icon: DollarSign,
      fields: [
        { label: "APR", value: formatPercentage(sla.aprPercent) },
        { label: "Monthly Payment", value: formatCurrency(sla.monthlyPayment) },
        { label: "Down Payment", value: formatCurrency(sla.downPayment) },
        { label: "Residual Value", value: formatCurrency(sla.residualValue) },
        { label: "Purchase Option", value: formatCurrency(sla.purchaseOptionPrice) },
      ],
    },
    {
      title: "Lease Duration",
      icon: Calendar,
      fields: [
        { label: "Term", value: sla.termMonths ? `${sla.termMonths} months` : "N/A" },
        {
          label: "Annual Mileage",
          value: sla.mileageAllowanceYr ? `${sla.mileageAllowanceYr.toLocaleString()} km` : "N/A",
        },
        {
          label: "Overage Fee",
          value: sla.mileageOverageFee ? `₹${sla.mileageOverageFee}/km` : "N/A",
        },
      ],
    },
    {
      title: "Fees & Penalties",
      icon: TrendingUp,
      fields: [
        {
          label: "Early Termination",
          value: formatCurrency(sla.earlyTerminationFee),
        },
        { label: "Disposition Fee", value: formatCurrency(sla.dispositionFee) },
        { label: "Total Fees", value: formatCurrency(sla.feesTotal) },
      ],
    },
    {
      title: "Responsibilities",
      icon: Gauge,
      fields: [
        { label: "Maintenance", value: sla.maintenanceResp || "N/A", isText: true },
        { label: "Warranty", value: sla.warrantySummary || "N/A", isText: true },
        { label: "Late Fee Policy", value: sla.lateFeePolicy || "N/A", isText: true },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {sections.map((section) => {
        const Icon = section.icon;

        return (
          <Card key={section.title}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icon className="w-5 h-5 text-primary" />
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {section.fields.map((field) => (
                  <div
                    key={field.label}
                    className="flex justify-between items-start p-3 rounded-lg bg-muted/30 border border-border"
                  >
                    <span className="text-sm font-medium text-muted-foreground">
                      {field.label}
                    </span>
                    <span
                      className={cn(
                        "text-sm font-semibold text-right",
                        'isText' in field && field.isText && "max-w-[60%]"
                      )}
                    >
                      {field.value}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}