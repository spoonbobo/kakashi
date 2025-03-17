import { Server } from 'socket.io';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';

// Define interfaces for better type safety
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

interface TaskData {
  name: string;
  role: string;
  description: string;
  task_id: string;
  room_id: string;
}

interface TaskResponse {
  id: string;
  task_executor: string;
  task_description: string;
  task_create_time: Date;
  task_status: string;
  task_result: string | null;
}

// Constants
const MAX_INITIAL_MESSAGES = 50;
const MAX_STORED_MESSAGES = 500;

export const setupChatServer = (httpServer: HttpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL,
      methods: ['GET', 'POST']
    }
  });

  // Redis setup
  const pubClient = createClient({ 
    url: process.env.REDIS_URL,
    socket: {
      reconnectStrategy: (retries) => {
        // Exponential backoff with max delay of 10 seconds
        return Math.min(retries * 100, 10000);
      }
    }
  });
  
  pubClient.on('error', (err) => {
    console.error('Redis client error:', err);
  });
  
  const subClient = pubClient.duplicate();

  // Connect Redis clients and set up adapter
  Promise.all([pubClient.connect(), subClient.connect()])
    .then(() => {
      io.adapter(createAdapter(pubClient, subClient));
      console.log('Redis adapter configured successfully');
    })
    .catch(err => {
      console.error('Failed to connect Redis clients:', err);
    });

  // Improved user tracking system with Maps for O(1) lookups
  const rooms = new Map<string, Set<User>>();
  const messageHistory = new Map<string, ChatMessage[]>();
  
  // Track user connections by room and userId
  const userConnections = new Map<string, Map<string, Set<string>>>();

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string, username: string };
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

  // Connection handler
  io.on('connection', async (socket) => {
    const user = socket.data.user;
    let roomId = socket.handshake.auth.roomId;
    const isAgent = socket.handshake.auth.isAgent;
    const isTaskPanel = socket.handshake.auth.isTaskPanel;

    // Special handling for task logger connections
    if (isTaskPanel && roomId) {
      socket.join(roomId);
      console.log(`Task Panel connected for room: ${roomId}`);
      return; // Skip the rest of the connection handling
    }

    // Create a new room if needed
    if (!roomId && !isAgent) {
      try {
        roomId = await createRoomInDatabase();
        rooms.set(roomId, new Set());
        messageHistory.set(roomId, []);
        userConnections.set(roomId, new Map());
        socket.emit('room_created', { roomId });
      } catch (error) {
        console.error('Error creating room:', error);
        socket.disconnect();
        return;
      }
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
    try {
      const redisKey = `chat:room:${roomId}:messages`;
      const messagesRaw = await pubClient.lRange(redisKey, -MAX_INITIAL_MESSAGES, -1);
      const messages = messagesRaw.map(msg => JSON.parse(msg));
      socket.emit('room_data', { messages, users: Array.from(roomUsers || []) });
    } catch (error) {
      console.error('Error fetching messages from Redis:', error);
      // Send empty messages as fallback
      socket.emit('room_data', { messages: [], users: Array.from(roomUsers || []) });
    }

    // Message handler
    socket.on('message', async (message: ChatMessage) => {
      try {
        const newMessage = { 
          ...message, 
          id: message.id || uuidv4(), 
          timestamp: new Date(), 
          username: user.username 
        };

        // Store message in Redis
        const redisKey = `chat:room:${roomId}:messages`;
        await pubClient.rPush(redisKey, JSON.stringify(newMessage));
        await pubClient.lTrim(redisKey, -MAX_STORED_MESSAGES, -1);

        // Check if this is a tool call message and create a task
        if (message.text && message.text.includes('<tools>')) {
          try {
            const taskName = message.text.match(/<tools>\['(.+?)'\]<\/tools>/)?.[1] || 'DUMMY';
            await createTaskInDatabase({
              name: taskName,
              role: message.sender,
              description: message.text,
              task_id: newMessage.id,
              room_id: roomId
            });
            
            // Create task object
            const taskData: TaskResponse = {
              id: newMessage.id,
              task_executor: message.sender,
              task_description: message.text,
              task_create_time: newMessage.timestamp,
              task_status: 'pending',
              task_result: null
            };
            
            // Broadcast task creation event to all clients in the room
            io.to(roomId).emit('task_created', taskData);
          } catch (error) {
            console.error('Error creating task:', error);
          }
        }

        // Broadcast the message to all clients in the room
        io.to(roomId).emit('message', newMessage);
        
        // Send acknowledgment back to the sender
        socket.emit('message_ack', { 
          id: newMessage.id,
          status: 'delivered',
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Error processing message:', error);
        socket.emit('message_ack', { 
          id: message.id || 'unknown',
          status: 'failed',
          timestamp: new Date(),
          error: 'Failed to process message'
        });
      }
    });

    // Disconnect handler
    socket.on('disconnect', () => {
      try {
        const userSockets = userConnections.get(roomId)?.get(user.id);
        if (userSockets) {
          userSockets.delete(socket.id);

          // Remove user only if no active sockets remain
          if (userSockets.size === 0) {
            userConnections.get(roomId)?.delete(user.id);
            rooms.get(roomId)?.forEach(u => {
              if (u.id === user.id) rooms.get(roomId)?.delete(u);
            });
            
            // Only emit user_left if username doesn't start with "agent"
            if (!user.username.startsWith('agent')) {
              socket.to(roomId).emit('user_left', user.id);
            }
          }
        }
      } catch (error) {
        console.error('Error handling disconnect:', error);
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

// Helper function to create a room in the database
const createRoomInDatabase = async (): Promise<string> => {
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

// Helper function for task creation
const createTaskInDatabase = async (taskData: TaskData): Promise<any> => {
  try {
    const response = await fetch(`${process.env.CLIENT_URL}/api/task/create_task`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(taskData)
    });
    
    if (!response.ok) {
      throw new Error('Failed to create task in database');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating task:', error);
    throw error;
  }
}; 