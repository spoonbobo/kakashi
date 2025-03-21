import { NextResponse } from 'next/server';
import db from '@/lib/db.server';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const sinceId = searchParams.get('since');
        
        const query = db('agent_task')
            .select('*')
            .orderBy('created_at', 'desc')
            .limit(10);
            
        if (sinceId) {
            query.where('id', '>', sinceId);
        }
        
        const result = await query;
        
        return NextResponse.json(result, { status: 200 });
    } catch (error) {
        console.error('Error fetching tasks:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}