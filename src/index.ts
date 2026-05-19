import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { config } from './config';
import { authRouter } from './routes/auth';
import { projectRouter } from './routes/projects';
import { skillRouter } from './routes/skills';
import { chatRouter } from './routes/chat';
import { shareRouter } from './routes/share';
import { userRouter } from './routes/users';
import { setupSocketIO } from './services/socket';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const httpServer = createServer(app);

// Socket.IO setup
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: config.frontendUrl,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/projects', projectRouter);
app.use('/api/skills', skillRouter);
app.use('/api/chat', chatRouter);
app.use('/api/share', shareRouter);
app.use('/api/users', userRouter);

// Error handler
app.use(errorHandler);

// Setup Socket.IO
setupSocketIO(io);

// Start server
httpServer.listen(config.port, () => {
  console.log(`🚀 LinkMatch Backend running on port ${config.port}`);
  console.log(`📡 WebSocket server ready`);
  console.log(`🌍 Environment: ${config.nodeEnv}`);
});

export { app, io };
