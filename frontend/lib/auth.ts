// frontend/lib/auth.ts
/**
 * Next.js SSR Authentication
 * Handles login/signup directly with Prisma (no backend auth API)
 */

import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { prisma } from './prisma';


// JWT Configuration
const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET_KEY || "your-secret-key-change-in-production"
);
const TOKEN_EXPIRY = "7d"; // 7 days

// ============================================
// TYPES
// ============================================

export interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
}

// ============================================
// JWT FUNCTIONS
// ============================================

/**
 * Create JWT token
 */
export async function createToken(userId: string, email: string): Promise<string> {
  return await new SignJWT({ userId, email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(SECRET_KEY);
}

/**
 * Verify JWT token
 */
export async function verifyToken(token: string): Promise<{ userId: string; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return {
      userId: payload.userId as string,
      email: payload.email as string,
    };
  } catch {
    return null;
  }
}

/**
 * Get current user from request cookies
 */
export async function getCurrentUser(request: NextRequest): Promise<User | null> {
  const token = request.cookies.get("access_token")?.value;
  
  if (!token) {
    return null;
  }
  
  const payload = await verifyToken(token);
  
  if (!payload) {
    return null;
  }
  
  // Get user from database
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
    },
  });
  
  return user as unknown as User | null;
}

/**
 * Get current user from server component (using cookies())
 */
export async function getCurrentUserServer(): Promise<User | null> {
  const cookieStore = cookies();
  const token = (await cookieStore).get("access_token")?.value;
  
  if (!token) {
    return null;
  }
  
  const payload = await verifyToken(token);
  
  if (!payload) {
    return null;
  }
  
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
    },
  });
  
  return user;
}

// ============================================
// AUTH ACTIONS (Server Actions)
// ============================================

/**
 * Register new user
 */
export async function registerUser(
  email: string,
  password: string,
  name?: string
): Promise<AuthResult> {
  try {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    
    if (existingUser) {
      return {
        success: false,
        error: "Email already registered",
      };
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: name || null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });
    
    // Create token
    const token = await createToken(user.id, user.email);
    
    // Set cookie
    const cookieStore = cookies();
    (await cookieStore).set("access_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });
    
    return {
      success: true,
      user,
    };
  } catch (error) {
    console.error("Register error:", error);
    return {
      success: false,
      error: "Registration failed",
    };
  }
}

/**
 * Login user
 */
export async function loginUser(
  email: string,
  password: string
): Promise<AuthResult> {
  try {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });
    
    if (!user) {
      return {
        success: false,
        error: "Invalid email or password",
      };
    }
    
    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash);
    
    if (!isValid) {
      return {
        success: false,
        error: "Invalid email or password",
      };
    }
    
    // Create token
    const token = await createToken(user.id, user.email);
    
    // Set cookie
    const cookieStore = cookies();
    (await cookieStore).set("access_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });
    
    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
    };
  } catch (error) {
    console.error("Login error:", error);
    return {
      success: false,
      error: "Login failed",
    };
  }
}

/**
 * Logout user
 */
export async function logoutUser(): Promise<void> {
  const cookieStore = cookies();
  (await cookieStore).delete("access_token");
}

/**
 * Require authentication (use in server components/actions)
 */
export async function requireAuth(): Promise<User> {
  const user = await getCurrentUserServer();
  
  if (!user) {
    throw new Error("Unauthorized");
  }
  
  return user;
}