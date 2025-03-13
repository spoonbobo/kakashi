import { Server } from 'socket.io';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import express from 'express';

interface User {
  id: string;
  username: string;
  roomId: string;
}

interface ChatMessage {
  id: string;
  text: string;
  sender: string;
  timestamp: Date;
  username?: string;
}

export const setupChatServer = (httpServer: HttpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://kakashi-next_app:3000',
      methods: ['GET', 'POST']
    }
  });

  // Redis setup
  const pubClient = createClient({ url: process.env.REDIS_URL });
  const subClient = pubClient.duplicate();

  Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
    io.adapter(createAdapter(pubClient, subClient));
  });

  // Improved user tracking system
  const rooms = new Map<string, Set<User>>();
  const messageHistory = new Map<string, ChatMessage[]>();
  
  // Track user connections by room and userId
  const userConnections = new Map<string, Map<string, Set<string>>>();

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET) as { userId: string, username: string };
      socket.data.user = {
        id: decoded.userId,
        username: decoded.username
      };
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket) => {
    const user = socket.data.user;
    let roomId = socket.handshake.auth.roomId;

    if (!roomId) {
      console.log('No roomId provided, creating a new room');
      console.log('User:', user);
      try {
        const newRoomId = await createRoomInDatabase();
        console.log('New room ID:', newRoomId);
        // Initialize room data
        rooms.set(newRoomId, new Set());
        messageHistory.set(newRoomId, []);
        
        // Initialize user connections for this room
        userConnections.set(newRoomId, new Map());
        
        // Inform the client about the newly created room
        socket.emit('room_created', { roomId: newRoomId });
        console.log(`Created new room with ID: ${newRoomId}`);
        
        // Update the roomId for this connection
        roomId = newRoomId;
      } catch (error) {
        console.error('Error creating room:', error);
        socket.emit('room_creation_error', { message: 'Failed to create room' });
        return;
      }
    }

    // Join room
    socket.join(roomId);
    
    // Make sure room data structures exist
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }
    if (!userConnections.has(roomId)) {
      userConnections.set(roomId, new Map());
    }
    
    // Add user to room
    const roomUser = { ...user, roomId };
    rooms.get(roomId)?.add(roomUser);
    
    // Track socket connection for this user
    const roomUsers = userConnections.get(roomId)!;
    if (!roomUsers.has(user.id)) {
      roomUsers.set(user.id, new Set());
      // Only emit user_joined if this is their first connection
      socket.to(roomId).emit('user_joined', roomUser);
    }
    
    // Add this socket to the user's connections
    roomUsers.get(user.id)!.add(socket.id);
    
    // Store socket data for easier access
    socket.data.roomId = roomId;
    
    // Get unique users for this room
    const getUniqueRoomUsers = () => {
      const uniqueUsers: User[] = [];
      const roomUserMap = userConnections.get(roomId);
      
      if (roomUserMap) {
        for (const [userId, _] of roomUserMap) {
          const userInfo = Array.from(rooms.get(roomId) || []).find(u => u.id === userId);
          if (userInfo) {
            uniqueUsers.push(userInfo);
          }
        }
      }
      
      return uniqueUsers;
    };

    // Send room data to new user (with deduplicated users)
    const messages = messageHistory.get(roomId) || [];
    socket.emit('room_data', { 
      messages, 
      users: getUniqueRoomUsers()
    });

    // Handle messages
    socket.on('message', (message: ChatMessage) => {
      const newMessage = {
        ...message,
        id: Date.now().toString(),
        timestamp: new Date(),
        username: user.username
      };

      // Store message in history
      if (!messageHistory.has(roomId)) {
        messageHistory.set(roomId, []);
      }
      messageHistory.get(roomId)?.push(newMessage);

      // Broadcast message to room
      io.to(roomId).emit('message', newMessage);
    });

    // Handle disconnection with improved user tracking
    socket.on('disconnect', () => {
      const roomUserMap = userConnections.get(roomId);
      
      if (roomUserMap && roomUserMap.has(user.id)) {
        const userSockets = roomUserMap.get(user.id)!;
        userSockets.delete(socket.id);
        
        // Only emit user_left and remove user if all their sockets are gone
        if (userSockets.size === 0) {
          roomUserMap.delete(user.id);
          rooms.get(roomId)?.forEach(u => {
            if (u.id === user.id) {
              rooms.get(roomId)?.delete(u);
            }
          });
          
          // Broadcast user left message
          socket.to(roomId).emit('user_left', user.id);
        }
      }
    });
  });

  return io;
};

// Create and start the server
const app = express();
const httpServer = app.listen(3001, () => {
  console.log('Chat server is running on port 3001');
});

// Setup the chat server
setupChatServer(httpServer);

// Add this helper function
const createRoomInDatabase = async (): Promise<string> => {
  try {
    const response = await fetch('http://kakashi-next_app:3000/api/chat/create_room', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to create room in database');
    }
    
    const data = await response.json();
    return data.sessionId;
  } catch (error) {
    console.error('Error creating room:', error);
    throw error;
  }
}; 