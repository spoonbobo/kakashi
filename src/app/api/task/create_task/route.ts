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
    const { name, role, description, room_id, task_id } = await request.json();
    const result = await pool.query(`
        insert into agent_task (name, role, description, room_id, task_id, status, result) 
        values ($1, $2, $3, $4, $5, 'pending', null)
    `, [name, role, description, room_id, task_id]);
    return NextResponse.json(result.rows, { status: 200 });
}
