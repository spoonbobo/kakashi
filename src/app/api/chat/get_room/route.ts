import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const sessionId = parseInt(searchParams.get('sessionId') || '1');

    try {
        const result = await db.raw(`
            select 
                m.id,
                m.timestamp,
                m.role,
                m.value
            from messages m
            where m.session_id = ?
            order by m.timestamp asc
        `, [sessionId]);
        return NextResponse.json({ messages: result.rows }, { status: 200 });
    } catch (error) {
        console.error('Error fetching messages:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}