import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(request: Request) {
    try {
        const { sessionId, message, role } = await request.json();
        
        if (role !== 'user' && role !== 'bot') {
            return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
        }

        await db('messages').insert({
            room_id: sessionId,
            timestamp: message.timestamp,
            role: role,
            value: message.text
        });

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error('Error inserting message:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}