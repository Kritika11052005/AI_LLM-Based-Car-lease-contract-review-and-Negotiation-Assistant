// frontend/app/api/negotiation/threads/route.ts
/**
 * Get User's Negotiation Threads (Chat History) - SSR
 * GET /api/negotiation/threads
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
    
    // Fetch all negotiation threads for this user
    const threads = await prisma.negotiationThread.findMany({
      where: {
        userId: user.id,
      },
      include: {
        contract: {
          include: {
            vehicle: true,
          },
        },
        messages: {
          orderBy: {
            sentAt: 'desc',
          },
          take: 1, // Get last message for preview
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    // Format for frontend
    const formattedThreads = threads.map((thread) => ({
      id: thread.id,
      contractId: thread.contractId,
      title: thread.subject || (
        thread.contract?.vehicle 
          ? `${thread.contract.vehicle.year} ${thread.contract.vehicle.make} ${thread.contract.vehicle.model}`
          : `Contract ${thread.contractId?.slice(0, 8)}`
      ),
      lastMessage: thread.messages[0]?.body?.substring(0, 100) || "Analysis complete",
      timestamp: thread.createdAt.toISOString(),
    }));
    
    return NextResponse.json(formattedThreads);
    
  } catch (error) {
    console.error("Fetch threads error:", error);
    return NextResponse.json(
      { error: "Failed to fetch chat history" },
      { status: 500 }
    );
  }
}