import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { RegisterData } from "@/types/auth";

export async function POST(request: NextRequest) {
  try {
    const body: RegisterData = await request.json();
    const { name, email, password, role } = body;

    // Validate input
    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "User already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        hashedPassword,
        role,
      },
    });

    // Create profile based on role
    if (role === "AGENT") {
      await prisma.agent.create({
        data: {
          userId: user.id,
          employeeId: `EMP${Date.now()}`, // Generate a temporary employee ID
          department: "General",
          hireDate: new Date(),
        },
      });
    } else if (role === "TEAM_LEADER") {
      await prisma.teamLeader.create({
        data: {
          userId: user.id,
          teamName: "Team 1",
        },
      });
    } else if (role === "MANAGER") {
      await prisma.manager.create({
        data: {
          userId: user.id,
          department: "General",
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: "User created successfully",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}