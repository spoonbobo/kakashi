// pages/api/createChatSession.ts
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
      const result = await pool.query('INSERT INTO chat_sessions DEFAULT VALUES RETURNING id');
      const sessionId = result.rows[0].id;
      return NextResponse.json({ sessionId }, { status: 200 });
    } catch (error) {
      console.error('Error creating chat session:', error);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
  }