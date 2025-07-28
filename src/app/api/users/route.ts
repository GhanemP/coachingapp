import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';

import { getSession } from '@/lib/auth-server';
import { UserRole } from '@/lib/constants';
import logger from '@/lib/logger';
import { prisma } from '@/lib/prisma';

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users
 *     description: Retrieve a list of all users in the system. Requires admin privileges.
 *     tags:
 *       - Users
 *     security:
 *       - sessionAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 allOf:
 *                   - $ref: '#/components/schemas/User'
 *                   - type: object
 *                     properties:
 *                       hashedPassword:
 *                         type: string
 *                         writeOnly: true
 *             examples:
 *               success:
 *                 summary: Successful response
 *                 value:
 *                   - id: "123e4567-e89b-12d3-a456-426614174000"
 *                     name: "John Doe"
 *                     email: "john.doe@company.com"
 *                     role: "ADMIN"
 *                     createdAt: "2024-01-01T00:00:00.000Z"
 *                     updatedAt: "2024-01-01T00:00:00.000Z"
 *                   - id: "123e4567-e89b-12d3-a456-426614174001"
 *                     name: "Jane Smith"
 *                     email: "jane.smith@company.com"
 *                     role: "TEAM_LEADER"
 *                     createdAt: "2024-01-01T00:00:00.000Z"
 *                     updatedAt: "2024-01-01T00:00:00.000Z"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Failed to fetch users"
 *               message: "An internal server error occurred"
 *               statusCode: 500
 *               timestamp: "2024-01-01T00:00:00.000Z"
 */
export async function GET() {
  try {
    const session = await getSession();

    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    logger.error('Error fetching users:', error as Error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Create a new user
 *     description: Create a new user account. Requires admin privileges.
 *     tags:
 *       - Users
 *     security:
 *       - sessionAuth: []
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *               - role
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 description: Full name of the user
 *                 example: "John Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address (must be unique)
 *                 example: "john.doe@company.com"
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 description: Password for the user account
 *                 example: "SecurePassword123!"
 *               role:
 *                 type: string
 *                 enum: [ADMIN, MANAGER, TEAM_LEADER, AGENT]
 *                 description: Role assigned to the user
 *                 example: "TEAM_LEADER"
 *               employeeId:
 *                 type: string
 *                 description: Employee ID (optional)
 *                 example: "EMP001"
 *               department:
 *                 type: string
 *                 description: Department name (optional)
 *                 example: "Customer Service"
 *           examples:
 *             team_leader:
 *               summary: Create team leader
 *               value:
 *                 name: "John Doe"
 *                 email: "john.doe@company.com"
 *                 password: "SecurePassword123!"
 *                 role: "TEAM_LEADER"
 *                 employeeId: "TL001"
 *                 department: "Customer Service"
 *             agent:
 *               summary: Create agent
 *               value:
 *                 name: "Jane Smith"
 *                 email: "jane.smith@company.com"
 *                 password: "SecurePassword123!"
 *                 role: "AGENT"
 *                 employeeId: "AG001"
 *                 department: "Sales"
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/User'
 *                 - type: object
 *                   properties:
 *                     hashedPassword:
 *                       type: string
 *                       writeOnly: true
 *             example:
 *               id: "123e4567-e89b-12d3-a456-426614174000"
 *               name: "John Doe"
 *               email: "john.doe@company.com"
 *               role: "TEAM_LEADER"
 *               createdAt: "2024-01-01T00:00:00.000Z"
 *               updatedAt: "2024-01-01T00:00:00.000Z"
 *       400:
 *         description: Bad request - validation error or user already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               user_exists:
 *                 summary: User already exists
 *                 value:
 *                   error: "User with this email already exists"
 *                   message: "A user with the provided email address already exists"
 *                   statusCode: 400
 *                   timestamp: "2024-01-01T00:00:00.000Z"
 *               validation_error:
 *                 summary: Validation error
 *                 value:
 *                   error: "Validation Error"
 *                   message: "Invalid input data"
 *                   statusCode: 400
 *                   timestamp: "2024-01-01T00:00:00.000Z"
 *                   details:
 *                     email: "Invalid email format"
 *                     password: "Password must be at least 8 characters"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Failed to create user"
 *               message: "An internal server error occurred"
 *               statusCode: 500
 *               timestamp: "2024-01-01T00:00:00.000Z"
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, email, password, role } = body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    // Create new user
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        hashedPassword,
        role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    logger.error('Error creating user:', error as Error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
