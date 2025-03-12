import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    password: process.env.PGPASSWORD,
    port: parseInt(process.env.PGPORT || '5432'),
});
  

export async function POST(request: Request) {
    try {
        const { sessionId, message, role } = await request.json();
        
        if (role !== 'user' && role !== 'bot') {
            return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
        }

        await pool.query(
            'INSERT INTO messages (session_id, timestamp, role, value) VALUES ($1, $2, $3, $4)',
            [sessionId, message.timestamp, role, message.text]
        );

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error('Error inserting message:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}