import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(request: Request) {
    try {
        const { 
            summarization, 
            role, 
            description, 
            room_id, 
            task_id, 
            is_tool_call = false, 
            tools_called = null,
            conversation = null,
        } = await request.json();
        
        const result = await db('agent_task')
            .insert({
                summarization,
                role,
                description,
                room_id,
                task_id,
                status: 'pending',
                result: null,
                is_tool_call,
                tools_called: tools_called ? JSON.stringify(tools_called) : null,
                conversation: conversation ? JSON.stringify(conversation) : null
            })
            .returning('*');
        
        return NextResponse.json({ success: true, rows: result }, { status: 200 });
    } catch (error) {
        console.error('Error creating task:', error);
        return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
    }
}
