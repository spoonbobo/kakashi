// /app/api/chat/create_room/route.ts
import { NextResponse } from 'next/server';
import db from '@/lib/db.server';

export async function POST() {
    try {
      // Using Knex builder style instead of raw SQL
      const [result] = await db('chat_rooms')
        .insert({})
        .returning('id');
      
      const sessionId = result.id;
      return NextResponse.json({ sessionId }, { status: 200 });
    } catch (error) {
      console.error('Error creating chat room:', error);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
  }