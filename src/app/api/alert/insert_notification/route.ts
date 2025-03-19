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

export const updateTaskStatusInDb = async (taskId: string, status: 'approved' | 'denied') => {
  try {
    console.log("updateTaskStatusInDb called with taskId:", taskId, "and status:", status);
    const response = await fetch('/api/task/update_task_status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskId,
        status,
        startTime: status === 'approved' ? new Date().toISOString() : null
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to update task status: ${response.statusText}`);
    }

    console.log(`Task ${taskId} status updated to ${status} in database`);
    
    // Send notification about task status change
    sendTaskStatusNotification(taskId, status);
  } catch (error) {
    console.error("Error updating task status in database:", error);
  }
};

export const sendTaskStatusNotification = async (taskId: string, status: 'approved' | 'denied') => {
  try {
    const priority = status === 'approved' ? 'medium' : 'high';
    const message = status === 'approved' 
      ? `Task ${taskId} has been approved and will be executed`
      : `Task ${taskId} has been denied and will not be executed`;
    
    const notification = {
      notification_id: `task-${taskId}-${status}-${Date.now()}`,
      message,
      sender: 'TaskSystem',
      priority,
      status: 'new'
    };
    
    const response = await fetch('/api/alert/insert_notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notification)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to send notification: ${response.statusText}`);
    }
    
    console.log(`Notification sent for task ${taskId} status change to ${status}`);
  } catch (error) {
    console.error("Error sending task status notification:", error);
  }
};