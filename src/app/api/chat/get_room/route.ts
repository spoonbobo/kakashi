import { NextResponse } from 'next/server';
import db from '@/lib/db.server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
    }

    try {
        // First get the room details
        const roomResult = await db('chat_rooms')
            .where({ id })
            .first('id', 'name', 'created_at');

        if (!roomResult) {
            return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        }

        // Then get the messages for this room
        const messagesResult = await db.raw(`
            SELECT 
                m.id,
                m.timestamp,
                m.role,
                m.value
            FROM messages m
            WHERE m.room_id = ?
            ORDER BY m.timestamp ASC
        `, [id]);

        return NextResponse.json({
            id: roomResult.id,
            name: roomResult.name,
            created_at: roomResult.created_at,
            messages: messagesResult.rows
        }, { status: 200 });
    } catch (error) {
        console.error('Error fetching room:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}