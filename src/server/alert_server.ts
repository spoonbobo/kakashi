import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';

interface User {
  id: string;
  username: string;
}

interface Notification {
  id?: string;
  notification_id: string;
  message: string;
  sender: string;
  timestamp: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'new' | 'acknowledged' | 'resolved';
}

export const setupAlertServer = (httpServer: HttpServer) => {
  console.log('Setting up alert server...');
  
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || '*',
      methods: ['GET', 'POST']
    },
    path: '/socket.io/' // Ensure this matches client configuration
  });

  // Simple in-memory storage for notifications
  let notifications: Notification[] = [];
  const MAX_NOTIFICATIONS = 100;

  // Authentication middleware
  io.use((socket, next) => {
    console.log('Socket authentication attempt');
    const token = socket.handshake.auth.token;
    
    if (!token) {
      console.log('No token provided');
      return next(new Error('Authentication error: No token provided'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string, username: string };
      socket.data.user = {
        id: decoded.userId,
        username: decoded.username
      };
      console.log('User authenticated:', socket.data.user.username);
      next();
    } catch (err) {
      console.error('JWT verification error:', err);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;
    console.log(`User connected: ${user?.username || 'Unknown'} (${socket.id})`);

    // Send existing notifications to the newly connected client
    socket.emit('notifications_data', { notifications });
    
    // Handle new notifications
    socket.on('publish_notification', (notification: Omit<Notification, 'timestamp' | 'status'>) => {
      console.log('Received notification:', notification);
      
      const newNotification = { 
        ...notification, 
        notification_id: notification.notification_id || uuidv4(), 
        timestamp: new Date(),
        status: 'new'
      };

      // Add to in-memory storage
      notifications.unshift(newNotification);
      notifications = notifications.slice(0, MAX_NOTIFICATIONS);

      // Broadcast to all clients
      io.emit('notification', newNotification);
      
      // Acknowledge receipt
      socket.emit('notification_ack', { 
        id: newNotification.notification_id,
        status: 'delivered',
        timestamp: new Date()
      });
      
      // Store in database (optional)
      storeNotification(newNotification).catch(err => 
        console.error('Failed to store notification:', err)
      );
    });

    // Handle status updates
    socket.on('update_notification_status', (notificationId: string, status: 'acknowledged' | 'resolved') => {
      console.log(`Updating notification ${notificationId} to ${status}`);
      
      // Update in memory
      const notificationIndex = notifications.findIndex(n => n.notification_id === notificationId);
      if (notificationIndex >= 0) {
        notifications[notificationIndex].status = status;
        
        // Broadcast update
        io.emit('notification_status_updated', { notificationId, status });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${user?.username || 'Unknown'} (${socket.id})`);
    });
  });

  return io;
};

// Create and start the server
const app = express();
const httpServer = app.listen(3002, () => {
  console.log('Notification server is running on port 3002');
});

// Setup the alert server
setupAlertServer(httpServer);

// Helper function to store notifications in the database
const storeNotification = async (notificationData: Notification): Promise<any> => {
  try {
    console.log('Storing notification in database:', notificationData.notification_id);
    
    const response = await fetch(`${process.env.CLIENT_URL || 'http://localhost:3000'}/api/alert/insert_notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(notificationData)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to store notification: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error storing notification:', error);
    throw error;
  }
};
