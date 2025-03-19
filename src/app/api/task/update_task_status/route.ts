import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(request: Request) {
    try {
        const { taskId, status, startTime } = await request.json();
        
        if (!taskId || !status) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }
        
        // Validate status
        if (status !== 'approved' && status !== 'denied') {
            return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
        }
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updateData: Record<string, any> = { status };
        
        // Add start_time if status is approved and startTime is provided
        if (status === 'approved' && startTime) {
            updateData.start_time = startTime;
        }
        
        // Update the task using Knex
        const result = await db('agent_task')
            .where('task_id', taskId)
            .update(updateData)
            .returning('*');
        
        if (result.length === 0) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }
        
        return NextResponse.json({ success: true, task: result[0] }, { status: 200 });
        
    } catch (error) {
        console.error('Error updating task status:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
