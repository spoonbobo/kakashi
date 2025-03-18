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
        const { summarization, role, description, room_id, task_id, task_type, is_tool_call = false, tools_called = null } = await request.json();
        
        // Properly format tools_called as JSONB
        const toolsCalledJson = tools_called ? JSON.stringify(tools_called) : null;
        
        const result = await pool.query(`
            INSERT INTO agent_task (summarization, role, description, room_id, task_id, status, result, task_type, is_tool_call, tools_called) 
            VALUES ($1, $2, $3, $4, $5, 'pending', null, $6, $7, $8::jsonb)
        `, [summarization, role, description, room_id, task_id, task_type, is_tool_call, toolsCalledJson]);
        
        return NextResponse.json({ success: true, rows: result.rows }, { status: 200 });
    } catch (error) {
        console.error('Error creating task:', error);
        return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
    }
}
