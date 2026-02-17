// app/(dashboard)/dashboard/contracts/page.tsx
// SERVER COMPONENT — fetches only the logged-in user's contracts

import { redirect } from "next/navigation";
import { getCurrentUserServer } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ContractsClient } from "./ContractClient";

export default async function ContractsPage() {
  // ── Auth check ─────────────────────────────────────────────────────────────
  const user = await getCurrentUserServer();
  if (!user) redirect("/login");

  // ── Fetch only THIS user's contracts ──────────────────────────────────────
  const contracts = await prisma.contract.findMany({
    where:   { userId: user.id },        // ← scoped to logged-in user
    orderBy: { createdAt: "desc" },
    include: {
      vehicle: {
        select: { vin: true, year: true, make: true, model: true, trim: true },
      },
      files: {
        select:  { fileName: true, mimeType: true },
        take:    1,
        orderBy: { uploadedAt: "asc" },
      },
    },
  });

  // ── Serialise Decimal/Date for Client Component ────────────────────────────
  const serialised = contracts.map((c) => ({
    id:            c.id,
    contractType:  c.contractType,
    docStatus:     c.docStatus,
    fairnessScore: c.fairnessScore != null ? Number(c.fairnessScore) : null,
    redFlagLevel:  c.redFlagLevel,
    createdAt:     c.createdAt.toISOString(),
    vehicle: c.vehicle
      ? { vin: c.vehicle.vin, year: c.vehicle.year, make: c.vehicle.make, model: c.vehicle.model, trim: c.vehicle.trim }
      : null,
    fileName: c.files?.[0]?.fileName ?? null,
  }));

  return <ContractsClient contracts={serialised} />;
}