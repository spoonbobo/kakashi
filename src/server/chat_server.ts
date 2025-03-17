import { Server } from 'socket.io';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';

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
      origin: process.env.CLIENT_URL,
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
      // @ts-expect-error: jwt.verify is not defined
      const decoded = jwt.verify(token, process.env.JWT_SECRET) as { userId: string, username: string };
      socket.data.user = {
        id: decoded.userId,
        username: decoded.username
      };
      next();
    } catch (err) {
      console.error('Authentication error:', err);
      next(new Error('Authentication error'));
    }
  });

  const MAX_INITIAL_MESSAGES = 50;
  const MAX_STORED_MESSAGES = 500;

  io.on('connection', async (socket) => {
    const user = socket.data.user;
    let roomId = socket.handshake.auth.roomId;
    const isAgent = socket.handshake.auth.isAgent;

    if (!roomId && !isAgent) {
      roomId = await createRoomInDatabase();
      rooms.set(roomId, new Set());
      messageHistory.set(roomId, []);
      userConnections.set(roomId, new Map());
      socket.emit('room_created', { roomId });
    }

    socket.join(roomId);

    // Initialize room data structures if they don't exist
    if (!rooms.has(roomId)) rooms.set(roomId, new Set());
    if (!userConnections.has(roomId)) userConnections.set(roomId, new Map());
    if (!messageHistory.has(roomId)) messageHistory.set(roomId, []);

    const roomUsers = rooms.get(roomId)!;
  
    // Track user connections properly
    if (!roomUsers.has(user)) {
      roomUsers.add({ ...user, roomId });
      socket.to(roomId).emit('user_joined', user);
    }

    // Track socket connections per user
    if (!userConnections.get(roomId)?.has(user.id)) {
      userConnections.get(roomId)?.set(user.id, new Set());
    }
    userConnections.get(roomId)?.get(user.id)?.add(socket.id);

    // Fetch recent messages from Redis
    const redisKey = `chat:room:${roomId}:messages`;
    const messagesRaw = await pubClient.lRange(redisKey, -MAX_INITIAL_MESSAGES, -1);
    const messages = messagesRaw.map(msg => JSON.parse(msg));

    socket.emit('room_data', { messages, users: Array.from(roomUsers || []) });

    socket.on('message', async (message: ChatMessage) => {
      const newMessage = { 
        ...message, 
        id: uuidv4(), 
        timestamp: new Date(), 
        username: user.username 
      };

      // Store message in Redis
      await pubClient.rPush(redisKey, JSON.stringify(newMessage));
      await pubClient.lTrim(redisKey, -MAX_STORED_MESSAGES, -1);

      io.to(roomId).emit('message', newMessage);
    });

    socket.on('disconnect', () => {
      const userSockets = userConnections.get(roomId)?.get(user.id);
      userSockets?.delete(socket.id);

      // Remove user only if no active sockets remain
      if (userSockets && userSockets.size === 0) {
        userConnections.get(roomId)?.delete(user.id);
        rooms.get(roomId)?.forEach(u => {
          if (u.id === user.id) rooms.get(roomId)?.delete(u);
        });
        socket.to(roomId).emit('user_left', user.id);
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
  console.log(process.env.CLIENT_URL);
  try {
    const response = await fetch(`${process.env.CLIENT_URL}/api/chat/create_room`, {
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