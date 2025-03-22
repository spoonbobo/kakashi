import { NextResponse } from 'next/server';
import db from '@/lib/db.server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    try {
        // First get the total count
        const countResult = await db.raw(`
            SELECT COUNT(*) AS total FROM chat_rooms
        `);
        
        const total = parseInt(countResult.rows[0].total);
        
        // Then get the paginated rooms
        const result = await db.raw(`
            SELECT 
                cs.id, 
                cs.name,
                cs.created_at,
                COALESCE(
                    (SELECT json_agg(
                        json_build_object(
                            'id', m.id,
                            'timestamp', m.timestamp,
                            'role', m.role,
                            'value', m.value
                        ) ORDER BY m.timestamp DESC
                    )
                    FROM messages m
                    WHERE m.room_id = cs.id
                    LIMIT 1), '[]'::json
                ) AS messages,
                (SELECT COUNT(*) FROM messages m WHERE m.room_id = cs.id) AS message_count
            FROM chat_rooms cs
            ORDER BY cs.created_at DESC
            LIMIT ? OFFSET ?
        `, [limit, offset]);
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rooms = result.rows.map((row: { id: string; name: string; created_at: string; messages: any[]; message_count: number }) => ({
            id: row.id,
            name: row.name,
            created_at: row.created_at,
            messages: row.messages.filter((m: { id: string }) => m.id !== null),
            message_count: row.message_count
        }));

        return NextResponse.json({ rooms, total }, { status: 200 });
    } catch (error) {
        console.error('Error fetching rooms:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}