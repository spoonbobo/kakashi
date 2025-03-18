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
        const { taskId, status, startTime } = await request.json();
        console.log("req.body", request.body);
        if (!taskId || !status) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }
        
        // Validate status
        if (status !== 'approved' && status !== 'denied') {
            return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
        }
        
        const client = await pool.connect();
        
        try {
            // If status is approved, update both status and start_time
            // If denied, just update status
            let query, values;
            
            if (status === 'approved' && startTime) {
                query = 'UPDATE agent_task SET status = $1, start_time = $2 WHERE task_id = $3 RETURNING *';
                values = [status, startTime, taskId];
            } else {
                query = 'UPDATE agent_task SET status = $1 WHERE task_id = $2 RETURNING *';
                values = [status, taskId];
            }
            
            const result = await client.query(query, values);
            
            if (result.rows.length === 0) {
                return NextResponse.json({ error: 'Task not found' }, { status: 404 });
            }
            
            return NextResponse.json({ success: true, task: result.rows[0] }, { status: 200 });
            
        } finally {
            client.release();
        }
        
    } catch (error) {
        console.error('Error updating task status:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
