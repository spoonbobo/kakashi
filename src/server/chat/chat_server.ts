import { Server } from 'socket.io';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import express from 'express';
import pkg from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
const { JwtPayload } = pkg;


// Log environment variables for debugging
console.log('Loading environment variables for socket server');
console.log('JWT_SECRET available:', !!process.env.JWT_SECRET);
console.log('JWT_SECRET length:', process.env.JWT_SECRET?.length || 0);


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

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
interface DecodedToken extends JwtPayload {
  userId: string;
  username: string;
}

// Then update the verifyToken function to use it
const verifyToken = (token: string): DecodedToken | null => {
  try {
    // Use the exact same string as in login route
    const decoded = jwt.verify(token, process.env.JWT_SECRET!, {
      algorithms: ['HS256']
    }) as DecodedToken;
    return decoded;
  } catch (error: unknown) {
    console.error('Token verification failed:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
};

export const setupChatServer = (httpServer: HttpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST']
    }
  });

  // Redis setup
  const pubClient = createClient({ url: process.env.REDIS_URL });
  const subClient = pubClient.duplicate();

  // Add error handlers to the Redis clients.  CRITICAL!
  pubClient.on('error', (err) => console.error('Redis Pub Client Error', err));
  subClient.on('error', (err) => console.error('Redis Sub Client Error', err));

  Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
    io.adapter(createAdapter(pubClient, subClient));
  });

  // Room data storage
  const rooms = new Map<string, Set<User>>();
  const messageHistory = new Map<string, ChatMessage[]>();

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    console.log('Received token:', token);
    
    if (!token) {
      console.error('Authentication error: No token provided');
      return next(new Error('Authentication error: No token provided'));
    }
    
    try {
      const decoded = verifyToken(token);
      
      if (!decoded) {
        console.error('Authentication error: Token verification failed');
        return next(new Error('Authentication error: Invalid token'));
      }
      
      console.log('Decoded token:', decoded);
      // Store user info in socket
      socket.data.user = {
        id: decoded.userId,
        username: decoded.username
      };
      
      console.log('User authenticated successfully:', socket.data.user);
      next();
    } catch (error) {
      console.error('Authentication error:', error);
      return next(new Error('Authentication error: Server error'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;
    const roomId = socket.handshake.auth.roomId;

    if (!roomId) {
      socket.disconnect();
      return;
    }

    // Join room
    socket.join(roomId);
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }
    rooms.get(roomId)?.add({ ...user, roomId });

    // Send room data to new user
    const roomUsers = Array.from(rooms.get(roomId) || []);
    const messages = messageHistory.get(roomId) || [];
    socket.emit('room_data', { messages, users: roomUsers });

    // Notify others about new user
    socket.to(roomId).emit('user_joined', user);

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

    // Handle disconnection
    socket.on('disconnect', () => {
      rooms.get(roomId)?.delete(user);
      socket.to(roomId).emit('user_left', user.id);
    });
  });

  return io;
};

// Create and start the server
const app = express();
const httpServer = app.listen(3001, () => {
  console.log('Chat server is running on port 3001');
});

// Add this near the bottom of your file, before starting the server
console.log('Socket server environment:');
console.log('REDIS_URL:', process.env.REDIS_URL);
console.log('JWT_SECRET:', process.env.JWT_SECRET);
console.log('JWT_SECRET length:', process.env.JWT_SECRET?.length || 0);
console.log('JWT_SECRET preview:', process.env.JWT_SECRET ? 
  `${process.env.JWT_SECRET.substring(0, 3)}...${process.env.JWT_SECRET.substring(process.env.JWT_SECRET.length - 3)}` : 
  'not set');
console.log('NODE_ENV:', process.env.NODE_ENV); 

// Setup the chat server
setupChatServer(httpServer);
