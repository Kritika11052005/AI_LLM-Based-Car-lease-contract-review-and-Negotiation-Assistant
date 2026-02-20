/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/downloadContractReport.ts
// Requires: npm install jspdf
import type { Contract } from "@/types/contract";
import { formatCurrency } from "@/lib/utils";
import jsPDF from "jspdf";

export function downloadContractReport(contract: Contract) {
  const sla     = contract.sla;
  const vehicle = contract.vehicle;
  const now     = new Date().toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  const vehicleName =
    vehicle?.year && vehicle?.make && vehicle?.model
      ? `${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.trim ? " " + vehicle.trim : ""}`
      : vehicle?.vin
      ? `VIN: ${vehicle.vin}`
      : "Unknown Vehicle";

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const W = 210;   // A4 width mm
  const margin = 18;
  const contentW = W - margin * 2;
  let y = 0;

  // ── helpers ──────────────────────────────────────────────────────────────────
  /** jsPDF built-in fonts lack ₹ — replace with Rs. */
  const sanitize = (s: string) => s.replace(/₹/g, "Rs.");

  const hex = (h: string) => {
    const n = parseInt(h.replace("#", ""), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as [number, number, number];
  };

  const setColor = (color: string, type: "fill" | "text" | "draw" = "text") => {
    const [r, g, b] = hex(color);
    if (type === "fill")  doc.setFillColor(r, g, b);
    if (type === "text")  doc.setTextColor(r, g, b);
    if (type === "draw")  doc.setDrawColor(r, g, b);
  };

  const addPage = () => {
    doc.addPage();
    setColor("#0b1220", "fill");
    doc.rect(0, 0, W, 297, "F");
    y = margin;
  };

  const checkPage = (needed = 10) => {
    if (y + needed > 280) addPage();
  };

  /**
   * Wraps long text into multiple lines capped at maxWidth,
   * returns the total height consumed (lines × lineHeight).
   * Does NOT move `y` — caller is responsible.
   */
  const drawWrappedRow = (
    label: string,
    value: string,
    rowY: number,
    shade: boolean,
  ): number => {
    const labelW   = contentW * 0.42;          // 42 % for label
    const valueW   = contentW * 0.55;          // 55 % for value
    const lineH    = 5.5;
    const padV     = 3;                        // top/bottom padding inside row

    // Split value into wrapped lines
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    const lines = doc.splitTextToSize(sanitize(value), valueW) as string[];
    const rowH  = Math.max(lines.length * lineH + padV * 2, 7);

    if (shade) {
      setColor("#0f172a", "fill");
      doc.rect(margin - 2, rowY - padV - 1, contentW + 4, rowH, "F");
    }

    // Label — vertically centred
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    setColor("#64748b", "text");
    doc.text(sanitize(label), margin, rowY + (rowH - padV * 2) / 2 - 1);

    // Value lines — right-aligned, stacked
    doc.setFont("helvetica", "bold");
    setColor("#e2e8f0", "text");
    lines.forEach((line, li) => {
      doc.text(line, margin + contentW, rowY + li * lineH, { align: "right" });
    });

    return rowH;
  };

  // ── HEADER BAND ──────────────────────────────────────────────────────────────
  setColor("#0f172a", "fill");
  doc.rect(0, 0, W, 44, "F");

  // Top accent stripe
  setColor("#6366f1", "fill");
  doc.rect(0, 0, W, 1.2, "F");

  // Label
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  setColor("#818cf8", "text");
  doc.text("CONTRACT ANALYSIS REPORT", margin, 10);

  // Vehicle name
  doc.setFontSize(17);
  doc.setFont("helvetica", "bold");
  setColor("#f8fafc", "text");
  doc.text(vehicleName, margin, 21, { maxWidth: contentW - 32 });

  // Sub info
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  setColor("#64748b", "text");
  doc.text(
    `${contract.contractType ?? "Lease"}   ·   ${contract.docStatus ?? "Processing"}   ·   Generated ${now}`,
    margin, 30,
  );

  // ── Fairness score badge (top-right) ─────────────────────────────────────────
  const score = (contract as any).fairnessScore as number | null;
  if (score != null) {
    const scoreHex   = score >= 80 ? "#34d399" : score >= 60 ? "#fbbf24" : "#f87171";
    const scoreLabel = score >= 80 ? "Excellent" : score >= 60 ? "Fair"   : "Poor";

    setColor("#1e293b", "fill");
    doc.roundedRect(W - margin - 26, 7, 26, 26, 3, 3, "F");

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    setColor(scoreHex, "text");
    doc.text(`${score}`, W - margin - 13, 20, { align: "center" });

    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.text(scoreLabel, W - margin - 13, 27, { align: "center" });

    doc.setFontSize(5.5);
    doc.setFont("helvetica", "normal");
    setColor("#64748b", "text");
    doc.text("Fairness Score", W - margin - 13, 31, { align: "center" });
  }

  y = 50;

  // ── KEY METRICS BAR ──────────────────────────────────────────────────────────
  if (sla) {
    const metrics: Array<{ label: string; value: string; color: string }> = [];

    if (sla.monthlyPayment)
      metrics.push({ label: "Monthly Payment", value: formatCurrency(Number(sla.monthlyPayment)), color: "#34d399" });
    if (sla.aprPercent)
      metrics.push({ label: "APR", value: `${Number(sla.aprPercent).toFixed(2)}%`, color: "#60a5fa" });
    if (sla.termMonths)
      metrics.push({ label: "Term", value: `${sla.termMonths} months`, color: "#c084fc" });
    if (sla.mileageAllowanceYr)
      metrics.push({ label: "Annual Mileage", value: `${sla.mileageAllowanceYr.toLocaleString()} km`, color: "#fb923c" });

    if (metrics.length) {
      setColor("#0f172a", "fill");
      doc.rect(0, y - 4, W, 22, "F");

      const colW = contentW / metrics.length;
      metrics.forEach((m, i) => {
        const mx = margin + i * colW;
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        setColor(m.color, "text");
        doc.text(sanitize(m.value), mx, y + 7);

        doc.setFontSize(6.5);
        doc.setFont("helvetica", "normal");
        setColor("#64748b", "text");
        doc.text(m.label, mx, y + 13);
      });

      y += 24;
    }
  }

  // Content background
  setColor("#0b1220", "fill");
  doc.rect(0, y - 4, W, 300, "F");

  // ── SECTION HELPER ───────────────────────────────────────────────────────────
  const drawSection = (
    title: string,
    rows: Array<[string, string | null | undefined]>,
  ) => {
    const validRows = rows.filter(([, v]) => v != null && v !== "" && v !== "N/A");
    if (!validRows.length) return;

    checkPage(16);

    y += 6;
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    setColor("#818cf8", "text");
    doc.text(title.toUpperCase(), margin, y);

    setColor("#312e81", "draw");
    doc.setLineWidth(0.3);
    doc.line(margin, y + 1.5, margin + contentW, y + 1.5);
    y += 7;

    validRows.forEach(([label, value], i) => {
      // Pre-calculate height to check if we need a new page
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      const lines = doc.splitTextToSize(sanitize(String(value)), contentW * 0.55) as string[];
      const needed = Math.max(lines.length * 5.5 + 6, 10);
      checkPage(needed);

      const rowH = drawWrappedRow(label, String(value), y, i % 2 === 0);
      y += rowH;
    });

    y += 3;
  };

  // ── SECTIONS ─────────────────────────────────────────────────────────────────
  drawSection("Payment Details", [
    ["MSRP",                  sla?.msrp              ? formatCurrency(Number(sla.msrp))              : null],
    ["Cap Cost",              sla?.capCost            ? formatCurrency(Number(sla.capCost))            : null],
    ["Cap Cost Reduction",    sla?.capCostReduction   ? formatCurrency(Number(sla.capCostReduction))   : null],
    ["Down Payment",          sla?.downPayment        ? formatCurrency(Number(sla.downPayment))        : null],
    ["Monthly Payment",       sla?.monthlyPayment     ? formatCurrency(Number(sla.monthlyPayment))     : null],
    ["Fees Total",            sla?.feesTotal          ? formatCurrency(Number(sla.feesTotal))          : null],
    ["Residual Value",        sla?.residualValue      ? formatCurrency(Number(sla.residualValue))      : null],
    ["Residual % of MSRP",    sla?.residualPercentMsrp ? `${Number(sla.residualPercentMsrp).toFixed(1)}%` : null],
    ["Purchase Option",       sla?.purchaseOptionPrice ? formatCurrency(Number(sla.purchaseOptionPrice)) : null],
    ["APR",                   sla?.aprPercent         ? `${Number(sla.aprPercent).toFixed(2)}%`       : null],
    ["Money Factor",          sla?.moneyFactor        ? Number(sla.moneyFactor).toFixed(5)            : null],
    ["Term",                  sla?.termMonths         ? `${sla.termMonths} months`                     : null],
    ["Dealer Price",          sla?.dealerPrice        ? formatCurrency(Number(sla.dealerPrice))        : null],
  ]);

  drawSection("Mileage & Fees", [
    ["Annual Mileage",        sla?.mileageAllowanceYr  ? `${sla.mileageAllowanceYr.toLocaleString()} km` : null],
    ["Overage Fee",           sla?.mileageOverageFee   ? `${Number(sla.mileageOverageFee).toFixed(2)}/km` : null],
    ["Early Termination Fee", sla?.earlyTerminationFee ? formatCurrency(Number(sla.earlyTerminationFee)) : null],
    ["Disposition Fee",       sla?.dispositionFee      ? formatCurrency(Number(sla.dispositionFee))      : null],
  ]);

  drawSection("Obligations & Coverage", [
    ["Insurance",   sla?.insuranceRequirements ?? null],
    ["Maintenance", sla?.maintenanceResp        ?? null],
    ["Warranty",    sla?.warrantySummary         ?? null],
    ["Late Fee",    sla?.lateFeePolicy           ?? null],
  ]);

  drawSection("Vehicle Information", [
    ["Make",           vehicle?.make],
    ["Model",          vehicle?.model],
    ["Year",           vehicle?.year?.toString()],
    ["Trim",           vehicle?.trim],
    ["VIN",            vehicle?.vin],
    ["Body Type",      (vehicle as any)?.bodyClass],
    ["Engine",         (vehicle as any)?.engine],
    ["Drivetrain",     (vehicle as any)?.drivetrain],
    ["Fuel Type",      (vehicle as any)?.fuelType],
    ["Exterior Color", (vehicle as any)?.colorExt],
    ["Interior Color", (vehicle as any)?.colorInt],
    ["Odometer",       (vehicle as any)?.odometerMiles
      ? `${Number((vehicle as any).odometerMiles).toLocaleString()} miles`
      : null],
  ]);

  // ── FOOTER on every page ─────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    setColor("#0f172a", "fill");
    doc.rect(0, 287, W, 10, "F");

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    setColor("#334155", "text");
    doc.text(`LeaseLens  ·  ${now}  ·  Contract ID: ${contract.id}`, margin, 293);
    doc.text(`${p} / ${pageCount}`, W - margin, 293, { align: "right" });
  }

  // ── SAVE ─────────────────────────────────────────────────────────────────────
  const filename = `contract-report-${vehicleName.replace(/\s+/g, "-").toLowerCase()}.pdf`;
  doc.save(filename);
}