import { NextResponse } from 'next/server';
import db from '@/lib/db.server';

export async function DELETE() {
  try {
    // Delete all chat rooms from the database
    const deletedCount = await db('chat_rooms').del();
    
    return NextResponse.json({ 
      success: true, 
      message: `Successfully deleted ${deletedCount} chat rooms` 
    }, { status: 200 });
  } catch (error) {
    console.error('Error deleting chat rooms:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error' 
    }, { status: 500 });
  }
}
