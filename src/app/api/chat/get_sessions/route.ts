import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    password: process.env.PGPASSWORD,
    port: parseInt(process.env.PGPORT || '5432'),
});
  

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    try {
        const result = await pool.query(`
            SELECT 
                cs.id, 
                cs.created_at,
                json_agg(
                    json_build_object(
                        'id', m.id,
                        'timestamp', m.timestamp,
                        'role', m.role,
                        'value', m.value
                    ) ORDER BY m.timestamp DESC
                ) AS messages,
                COUNT(m.id) AS message_count
            FROM chat_sessions cs
            LEFT JOIN messages m ON cs.id = m.session_id
            GROUP BY cs.id
            ORDER BY cs.created_at DESC
            LIMIT $1 OFFSET $2
        `, [limit, offset]);
        
        const sessions = result.rows.map(row => ({
            id: row.id,
            created_at: row.created_at,
            messages: row.messages.filter((m: any) => m.id !== null),
            message_count: row.message_count
        }));

        return NextResponse.json({ sessions }, { status: 200 });
    } catch (error) {
        console.error('Error fetching sessions:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}