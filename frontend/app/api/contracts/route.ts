// frontend/app/api/contracts/route.ts
/**
 * List All Contracts - SSR with Prisma
 * GET /api/contracts
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getCurrentUser(request);
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Fetch all contracts for this user
    const contracts = await prisma.contract.findMany({
      where: {
        userId: user.id,
      },
      include: {
        sla: true,
        vehicle: true,
        dealer: true,
        lender: true,
        files: {
          take: 1, // Just get first file for preview
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    return NextResponse.json(contracts);
    
  } catch (error) {
    console.error("List contracts error:", error);
    return NextResponse.json(
      { error: "Failed to fetch contracts" },
      { status: 500 }
    );
  }
}