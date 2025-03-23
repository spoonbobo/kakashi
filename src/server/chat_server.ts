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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  conversation: any[];
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

  // Modified user tracking system
  const rooms = new Map<string, Map<string, User>>();  // Change to Map for O(1) lookups by userId
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

    // Add connection validation
    if (!user || !user.id) {
        console.error('Invalid user connection:', user);
        socket.disconnect(true);
        return;
    }

    if (!roomId && !isAgent) {
        roomId = await createRoom();
        rooms.set(roomId, new Map());
        messageHistory.set(roomId, []);
        userConnections.set(roomId, new Map());
        socket.emit('room_created', { roomId });
    }

    socket.join(roomId);

    // Initialize room data structures if they don't exist
    if (!rooms.has(roomId)) rooms.set(roomId, new Map());
    if (!userConnections.has(roomId)) userConnections.set(roomId, new Map());
    if (!messageHistory.has(roomId)) messageHistory.set(roomId, []);

    const roomUsers = rooms.get(roomId)!;

    // Track socket connections per user
    if (!userConnections.get(roomId)?.has(user.id)) {
        userConnections.get(roomId)?.set(user.id, new Set());
    }
    const userSockets = userConnections.get(roomId)?.get(user.id)!;

    // CRITICAL FIX: Add this socket to the user's connections BEFORE checking if they're new
    userSockets.add(socket.id);

    // Only add user and emit join event if this is their first connection
    const isNewUser = !roomUsers.has(user.id);
    if (isNewUser) {
        roomUsers.set(user.id, { ...user, roomId });
        // Only emit user_joined if username doesn't start with "agent"
        if (!user.username.startsWith('agent')) {
            socket.to(roomId).emit('user_joined', user);
        }
    }

    // Fetch recent messages from Redis
    const redisKey = `chat:room:${roomId}:messages`;
    const messagesRaw = await pubClient.lRange(redisKey, -MAX_INITIAL_MESSAGES, -1);
    const messages = messagesRaw.map(msg => JSON.parse(msg));

    // Fetch room details from database
    let roomDetails = { name: `Chat Room #${roomId.substring(0, 8)}` };
    try {
      const response = await fetch(`${process.env.CLIENT_URL}/api/chat/get_room?id=${roomId}`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.name) {
          roomDetails = { name: data.name, id: data.id, created_at: data.created_at };
        }
      }
    } catch (error) {
      console.error('Error fetching room details:', error);
    }

    // Send both messages and room details in one event - convert Map to Array for users
    socket.emit('room_data', { 
      messages, 
      users: Array.from(roomUsers.values()),
      room: roomDetails
    });

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
            conversation: message.conversation
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
        // CRITICAL FIX: Get the latest userSockets reference
        const userSockets = userConnections.get(roomId)?.get(user.id);
        
        if (!userSockets) {
            console.log(`No sockets found for user ${user.id} in room ${roomId}`);
            return;
        }
        
        userSockets.delete(socket.id);
        console.log(`User ${user.username} socket ${socket.id} disconnected. Remaining sockets: ${userSockets.size}`);

        // Remove user only if no active sockets remain
        if (userSockets.size === 0) {
            console.log(`All sockets for user ${user.username} disconnected, removing from room ${roomId}`);
            userConnections.get(roomId)?.delete(user.id);
            roomUsers.delete(user.id);
            
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

// Update createRoom function to handle the new schema
const createRoom = async (): Promise<string> => {
  console.log(process.env.CLIENT_URL);
  try {
    const response = await fetch(`${process.env.CLIENT_URL}/api/chat/create_room`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'New Chat' }) // This is correct, but ensure the API endpoint expects this format
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to create room in database:', errorText);
      throw new Error(`Failed to create room in database: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    return data.sessionId || data.id; // Add fallback to handle both response formats
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
  conversation: any[];
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