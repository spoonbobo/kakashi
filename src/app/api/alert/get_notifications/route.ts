import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const sinceId = searchParams.get('since');
        const status = searchParams.get('status');
        const priority = searchParams.get('priority');
        const limitParam = searchParams.get('limit') || '10';
        const limit = Math.min(parseInt(limitParam), 100); // Cap the limit at 100
        
        // Build the query with Knex
        let query = db('notifications')
            .select('id', 'notification_id', 'message', 'sender', 'timestamp', 'priority', 'status')
            .orderBy('timestamp', 'desc')
            .limit(limit);
        
        // Add filters
        if (sinceId && !isNaN(Number(sinceId))) {
            query = query.where('id', '>', Number(sinceId));
        }
        
        if (status) {
            query = query.where('status', status);
        }
        
        if (priority) {
            query = query.where('priority', priority);
        }
        
        const notifications = await query;
        
        // Count query with Knex
        let countQuery = db('notifications').count('* as total');
        
        if (sinceId && !isNaN(Number(sinceId))) {
            countQuery = countQuery.where('id', '>', Number(sinceId));
        }
        
        if (status) {
            countQuery = countQuery.where('status', status);
        }
        
        if (priority) {
            countQuery = countQuery.where('priority', priority);
        }
        
        const countResult = await countQuery;
        const total = parseInt(countResult[0]?.total as string || '0');
            
        return NextResponse.json({
            notifications,
            pagination: {
                total,
                limit,
                hasMore: total > notifications.length
            }
        }, { status: 200 });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return NextResponse.json({ 
            error: 'Internal Server Error',
            message: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
        }, { status: 500 });
    }
}
