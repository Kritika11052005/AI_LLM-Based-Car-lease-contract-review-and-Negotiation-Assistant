/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/auth/account/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { cookies } from "next/headers";

export async function DELETE(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getCurrentUser(request);
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Delete user and all related data (cascade delete)
    // Prisma will handle cascade deletes based on your schema relationships
    await prisma.user.delete({
      where: { id: user.id },
    });

    // Clear authentication cookie
    const cookieStore = await cookies();
    cookieStore.delete("access_token");

    return NextResponse.json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    console.error("Delete account error:", error);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}