import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('avatar') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        error: 'Invalid file type. Please upload an image (JPEG, PNG, GIF, or WebP).',
      }, { status: 400 });
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({
        error: 'File too large. Please upload an image smaller than 5MB.',
      }, { status: 400 });
    }

    // Create upload directory if it doesn't exist
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'avatars');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const fileName = `${session.user.id}_${timestamp}.${extension}`;
    const filePath = join(uploadDir, fileName);
    const publicPath = `/uploads/avatars/${fileName}`;

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Deactivate old avatar files for this user
    await prisma.fileUpload.updateMany({
      where: {
        userId: session.user.id,
        category: 'avatar',
        isActive: true,
      },
      data: { isActive: false },
    });

    // Save file record to database
    const fileRecord = await prisma.fileUpload.create({
      data: {
        userId: session.user.id,
        fileName,
        originalName: file.name,
        fileType: file.type,
        fileSize: file.size,
        filePath: publicPath,
        category: 'avatar',
        isActive: true,
      },
    });

    // Update user's image field
    await prisma.user.update({
      where: { id: session.user.id },
      data: { image: publicPath },
    });

    // Log the avatar change
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'avatar_upload',
        description: 'User uploaded new avatar',
        metadata: JSON.stringify({
          fileName,
          originalName: file.name,
          fileSize: file.size,
          fileType: file.type,
        }),
      },
    });

    return NextResponse.json({ 
      avatarUrl: publicPath,
      message: 'Avatar uploaded successfully',
      fileId: fileRecord.id,
    });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    return NextResponse.json(
      { error: 'Failed to upload avatar' },
      { status: 500 }
    );
  }
}
