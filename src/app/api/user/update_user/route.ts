import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: Request) {
    try {
        // Get the current user session
        const session = await getServerSession(authOptions);

        if (!session || !session.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Parse the request body
        const body = await request.json();
        const { roomId, action, userId, settings } = body;

        // If settings is provided, update user settings
        if (settings) {
            await db('users')
                .where('email', session.user.email)
                .update({
                    settings: JSON.stringify(settings),
                    updated_at: new Date().toISOString()
                });

            return NextResponse.json({ success: true }, { status: 200 });
        }

        // Handle active rooms updates (existing functionality)
        if (!roomId || !action) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // If userId is provided, update that user's active_rooms
        // Otherwise, update the current user's active_rooms
        const userQuery = userId
            ? db('users').where('user_id', userId)
            : db('users').where('email', session.user.email);

        const user = await userQuery.first();

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Initialize active_rooms if it doesn't exist
        let activeRooms = user.active_rooms || [];

        // Update active_rooms based on the action
        if (action === 'add' && !activeRooms.includes(roomId)) {
            activeRooms.push(roomId);
        } else if (action === 'remove') {
            activeRooms = activeRooms.filter((id: string) => id !== roomId);
        }

        // Update the user in the database
        await userQuery.update({
            active_rooms: activeRooms,
            updated_at: new Date().toISOString()
        });

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error('Error updating user:', error);
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }
} 