// frontend/app/api/contracts/[id]/route.ts
/**
 * Get Contract by ID - SSR with Prisma
 * GET /api/contracts/{id}
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get authenticated user
    const user = await getCurrentUser(request);
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Await params
    const { id: contractId } = await params;
    
    console.log("🔍 Looking for contract:", contractId);
    console.log("🔍 User ID:", user.id);
    
    // ✅ TEMPORARY FIX: Remove userId filter to debug
    const contract = await prisma.contract.findUnique({
      where: { 
        id: contractId,
        // TEMPORARILY COMMENTED OUT FOR DEBUGGING
        // userId: user.id
      },
      include: {
        sla: true,
        vehicle: true,
        dealer: true,
        lender: true,
        files: true,
      },
    });
    
    if (!contract) {
      console.log("❌ Contract not found in database");
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      );
    }
    
    console.log("✅ Contract found!");
    console.log("📝 Contract userId:", contract.userId);
    console.log("👤 Current user:", user.id);
    
    // Check if user owns this contract
    if (contract.userId !== user.id) {
      console.log("⚠️ User does not own this contract!");
      return NextResponse.json(
        { error: "You don't have access to this contract" },
        { status: 403 }
      );
    }
    
    // Format response to match frontend expectations
    return NextResponse.json(contract);
    
  } catch (error) {
    console.error("Get contract error:", error);
    return NextResponse.json(
      { error: "Failed to fetch contract" },
      { status: 500 }
    );
  }
}