// frontend/app/api/negotiation/threads/[threadId]/messages/route.ts
/**
 * Get Messages for a Specific Thread - SSR
 * GET /api/negotiation/threads/{threadId}/messages
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
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
    const { threadId } = await params;
    
    // Fetch thread (verify ownership)
    const thread = await prisma.negotiationThread.findUnique({
      where: { 
        id: threadId,
        userId: user.id, // Security: only see own threads
      },
      include: {
        messages: {
          orderBy: {
            sentAt: 'asc',
          },
        },
        contract: {
          include: {
            sla: true,
            vehicle: true,
          },
        },
      },
    });
    
    if (!thread) {
      return NextResponse.json(
        { error: "Thread not found" },
        { status: 404 }
      );
    }
    
    // Format messages
    const formattedMessages = thread.messages.map((msg) => ({
      id: msg.id,
      type: msg.senderRole === "user" ? "user" : "text",
      content: msg.body,
      timestamp: msg.sentAt.toISOString(),
    }));
    
    return NextResponse.json({
      threadId: thread.id,
      contractId: thread.contractId,
      messages: formattedMessages,
      contract: thread.contract,
    });
    
  } catch (error) {
    console.error("Fetch messages error:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}