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
    const sessionId = parseInt(searchParams.get('sessionId') || '1');

    try {
        const result = await pool.query(`
            SELECT 
                m.id,
                m.timestamp,
                m.role,
                m.value
            FROM messages m
            WHERE m.session_id = $1
            ORDER BY m.timestamp ASC
        `, [sessionId]);
        return NextResponse.json({ messages: result.rows }, { status: 200 });
    } catch (error) {
        console.error('Error fetching messages:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}