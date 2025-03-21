import { NextResponse } from 'next/server';
import db from '@/lib/db.server';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const taskId = searchParams.get('taskId');
        
        if (!taskId) {
            return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
        }
        
        const result = await db('agent_task')
            .select('*')
            .where('id', taskId)
            .first();
        
        if (!result) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }
        
        console.log(`Found task with status: ${result.status}`);
        
        return NextResponse.json(result, { status: 200 });
    } catch (error) {
        console.error('Error fetching task status:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
