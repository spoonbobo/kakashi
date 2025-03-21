import { NextResponse } from 'next/server';
import db from '@/lib/db.server';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        
        // Get filter parameters
        const categories = searchParams.get('categories')?.split(',') || [];
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const status = searchParams.get('status');
        const limit = parseInt(searchParams.get('limit') || '10');
        const offset = parseInt(searchParams.get('offset') || '0');
        
        // Build query with Knex
        const query = db('agent_task')
            .select('*')
            .orderBy('created_at', 'desc')
            .limit(limit)
            .offset(offset);
        
        // Add category filter if provided
        if (categories.length > 0) {
            query.whereIn('role', categories);
        }
        
        // Add date range filters if provided
        if (startDate) {
            query.where('created_at', '>=', startDate);
        }
        
        if (endDate) {
            query.where('created_at', '<=', endDate);
        }
        
        // Add status filter if provided
        if (status) {
            query.where('status', status);
        }
                
        const result = await query;
        console.log(`Found ${result.length} tasks`);
            
        return NextResponse.json(result, { status: 200 });
    } catch (error) {
        console.error('Error fetching tasks:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
