import { Server } from 'socket.io';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import { Server as HttpServer } from 'http';
import jwt, { JwtPayload } from 'jsonwebtoken';
import express from 'express';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Log environment variables for debugging
console.log('Loading environment variables for socket server');
console.log('JWT_SECRET available:', !!process.env.JWT_SECRET);
console.log('JWT_SECRET length:', process.env.JWT_SECRET?.length || 0);

// If JWT_SECRET is not available, try to load it from a different source
if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET not found in environment variables. Authentication will fail.');
  // You might want to set a default for development
  if (process.env.NODE_ENV === 'development') {
    process.env.JWT_SECRET = 'development_secret_key_for_testing_only';
    console.log('Using development JWT_SECRET');
  }
}

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

// Define a type for the decoded token
interface DecodedToken extends JwtPayload {
  userId: string;
  username: string;
}

// Add this function near the top of your file
function debugToken(token: string): void {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('Invalid token format: Token should have 3 parts');
      return;
    }
    
    const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    
    console.log('Token header:', header);
    console.log('Token payload:', payload);
    console.log('Token expiration:', new Date(payload.exp * 1000).toISOString());
    console.log('Current time:', new Date().toISOString());
    console.log('Token expired:', payload.exp * 1000 < Date.now());
  } catch (error) {
    console.error('Error parsing token:', error);
  }
}

// Then update the verifyToken function to use it
const verifyToken = (token: string): DecodedToken | null => {
  try {
    console.log('Verifying token:', token);
    console.log('Using JWT secret:', process.env.JWT_SECRET ? 'Available' : 'Not available');
    
    // Debug the token
    debugToken(token);
    
    // Make sure JWT_SECRET is defined
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined');
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as DecodedToken;
    console.log('Token verified successfully:', decoded);
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

  Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
    io.adapter(createAdapter(pubClient, subClient));
  });

  // Room data storage
  const rooms = new Map<string, Set<User>>();
  const messageHistory = new Map<string, ChatMessage[]>();

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      console.error('Authentication error: No token provided');
      return next(new Error('Authentication error: No token provided'));
    }
    
    try {
      // Log the token for debugging
      console.log('Received token:', token.substring(0, 10) + '...');
      
      const decoded = verifyToken(token);
      
      if (!decoded) {
        console.error('Authentication error: Token verification failed');
        return next(new Error('Authentication error: Invalid token'));
      }
      
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

// Setup the chat server
setupChatServer(httpServer);

// Add this near the bottom of your file, before starting the server
console.log('Socket server environment:');
console.log('JWT_SECRET length:', process.env.JWT_SECRET?.length || 0);
console.log('JWT_SECRET preview:', process.env.JWT_SECRET ? 
  `${process.env.JWT_SECRET.substring(0, 3)}...${process.env.JWT_SECRET.substring(process.env.JWT_SECRET.length - 3)}` : 
  'not set');
console.log('NODE_ENV:', process.env.NODE_ENV); 