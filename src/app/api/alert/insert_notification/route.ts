import { NextResponse } from 'next/server';
import db from '@/lib/db';


export async function POST(request: Request) {
    try {
        const body = await request.json();
        
        // Validate required fields
        const { notification_id, message, sender, priority, status } = body;
        
        if (!notification_id || !message || !sender || !priority || !status) {
            return NextResponse.json(
                { error: 'Missing required fields' }, 
                { status: 400 }
            );
        }
        
        // Validate priority and status values
        const validPriorities = ['low', 'medium', 'high', 'critical'];
        const validStatuses = ['new', 'acknowledged', 'resolved'];
        
        if (!validPriorities.includes(priority)) {
            return NextResponse.json(
                { error: 'Invalid priority value. Must be one of: low, medium, high, critical' }, 
                { status: 400 }
            );
        }
        
        if (!validStatuses.includes(status)) {
            return NextResponse.json(
                { error: 'Invalid status value. Must be one of: new, acknowledged, resolved' }, 
                { status: 400 }
            );
        }
        
        // Insert the notification using Knex
        const result = await db('notifications')
            .insert({
                notification_id,
                message,
                sender,
                priority,
                status
            })
            .returning('*');
        
        return NextResponse.json(result[0], { status: 201 });
    } catch (error) {
        console.error('Error inserting notification:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

