import { NextResponse } from 'next/server';
import db from '@/lib/db.server';

export async function GET() {
  try {
    const result = await db.raw('select now() as current_time');
    return NextResponse.json({ time: result.rows[0].current_time });
  } catch (error) {
    console.error('Error connecting to database:', error);
    return NextResponse.json(
      { error: 'Database connection failed' },
      { status: 500 }
    );
  }
}