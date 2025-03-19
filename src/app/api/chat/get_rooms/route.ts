import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    try {
        const result = await db.raw(`
            select 
                cs.id, 
                cs.created_at,
                coalesce(
                    (select json_agg(
                        json_build_object(
                            'id', m.id,
                            'timestamp', m.timestamp,
                            'role', m.role,
                            'value', m.value
                        ) order by m.timestamp desc
                    )
                    from messages m
                    where m.room_id = cs.id
                    limit 50), '[]'::json
                ) as messages,
                (select count(*) from messages m where m.room_id = cs.id) as message_count
            from chat_rooms cs
            order by cs.created_at desc
            limit ? offset ?
        `, [limit, offset]);
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rooms = result.rows.map((row: { id: string; created_at: string; messages: any[]; message_count: number }) => ({
            id: row.id,
            created_at: row.created_at,
            messages: row.messages.filter((m: { id: string }) => m.id !== null),
            message_count: row.message_count
        }));

        return NextResponse.json({ rooms }, { status: 200 });
    } catch (error) {
        console.error('Error fetching rooms:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}