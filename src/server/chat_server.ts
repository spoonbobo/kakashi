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
  task_id?: string;
  is_tool_call: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tools_called: any[];
  summarization: string;
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
    const isTaskPanel = socket.handshake.auth.isTaskPanel;
    
    // Allow task panels to connect without full authentication
    if (isTaskPanel) {
      socket.data.isTaskPanel = true;
      return next();
    }
    
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
    let roomId = socket.handshake.auth.roomId;
    const isAgent = socket.handshake.auth.isAgent;
    
    const user = socket.data.user;

    if (!roomId && !isAgent) {
      roomId = await createRoom();
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
        id: message.id || uuidv4(), 
        timestamp: new Date(), 
        username: user.username 
      };

      // Store message in Redis
      await pubClient.rPush(redisKey, JSON.stringify(newMessage));
      await pubClient.lTrim(redisKey, -MAX_STORED_MESSAGES, -1);

      // Check if this is a tool call message and create a task
      if (message.text && message.is_tool_call) {
        try {
          // Assign task_id to both message and newMessage
          const taskId = newMessage.id;
          // const taskName = message.summarization;
          const toolsCalled = message.tools_called;

          console.log("toolsCalled", toolsCalled);
          message.task_id = taskId;
          newMessage.task_id = taskId;
                    
          // Create task object with proper sender/executor identification
          const taskData = {
            id: taskId,
            role: message.sender || user.username, // Ensure we have a fallback
            description: message.text,
            created_at: newMessage.timestamp,
            status: 'pending',
            result: null
          };
          console.log('Creating task with data:', taskData);
          
          // Store task in database
          await createTask({
            summarization: message.summarization,
            role: message.sender || user.username,
            description: message.text,
            task_id: taskId,
            room_id: roomId,
            tools_called: toolsCalled,
          });
          
          // Broadcast task creation event to all clients in the room
          console.log(`Emitting task_created event to room ${roomId}:`, taskData);
          
          // Use a more reliable broadcast method
          const roomSockets = await io.in(roomId).fetchSockets();
          console.log(`Broadcasting task to ${roomSockets.length} sockets in room ${roomId}`);
          
          // Broadcast to each socket individually to ensure delivery
          roomSockets.forEach(s => {
            s.emit('task_created', taskData);
          });
          
          // Also broadcast using the standard method as backup
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
        
        // Only emit user_left if username doesn't start with "agent"
        if (!user.username.startsWith('agent')) {
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
const createRoom = async (): Promise<string> => {
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

// Add this helper function for task creation
const createTask = async (taskData: {
  summarization: string;
  role: string;
  description: string;
  task_id: string;
  room_id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tools_called: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}): Promise<any> => {
  try {
    console.log("taskData", taskData);
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