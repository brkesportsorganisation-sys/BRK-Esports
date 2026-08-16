import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { userId, amount } = await request.json();

    if (!userId || !amount || amount <= 0) {
      return NextResponse.json({ message: 'Invalid payload.' }, { status: 400 });
    }

    // Attempt to update the user in the Prisma database
    // We increment the coinBalance by the specified amount
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        coinBalance: {
          increment: amount
        }
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Coins claimed successfully',
      newBalance: updatedUser.coinBalance
    });
  } catch (error: any) {
    console.error('[POST /api/ads/claim]', error?.message);
    
    // Check if the error is related to Prisma finding the user
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'User not found in database.' }, { status: 404 });
    }
    
    return NextResponse.json({ message: 'Failed to claim coins.' }, { status: 500 });
  }
}
