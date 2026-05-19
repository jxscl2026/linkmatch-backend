import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyToken } from '../utils/jwt';
import { prisma } from '../utils/prisma';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

// Track online users: userId -> Set of socket IDs
const onlineUsers = new Map<string, Set<string>>();

export function setupSocketIO(io: SocketIOServer) {
  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      if (!token) {
        return next(new Error('认证失败：未提供token'));
      }

      const decoded = verifyToken(token as string);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true },
      });

      if (!user) {
        return next(new Error('认证失败：用户不存在'));
      }

      socket.userId = user.id;
      next();
    } catch (error) {
      next(new Error('认证失败：token无效'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.userId!;
    console.log(`🔌 User connected: ${userId} (socket: ${socket.id})`);

    // Track online status
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId)!.add(socket.id);

    // Join user's personal room for direct messages
    socket.join(`user:${userId}`);

    // Join all conversation rooms
    joinUserConversations(socket, userId);

    // ==================== Event Handlers ====================

    // Send message
    socket.on('sendMessage', async (data: {
      conversationId: string;
      content: string;
      type?: 'text' | 'image' | 'card';
      cardData?: any;
    }) => {
      try {
        const { conversationId, content, type = 'text', cardData } = data;

        // Verify participation
        const participant = await prisma.conversationParticipant.findFirst({
          where: { conversationId, userId },
        });

        if (!participant) {
          socket.emit('error', { message: '无权在此会话中发送消息' });
          return;
        }

        // Create message
        const message = await prisma.message.create({
          data: {
            conversationId,
            senderId: userId,
            content,
            type,
            cardData: cardData || undefined,
          },
          include: {
            sender: {
              select: { id: true, name: true, avatar: true },
            },
          },
        });

        // Update conversation
        await prisma.conversation.update({
          where: { id: conversationId },
          data: {
            lastMessage: content,
            lastMessageAt: new Date(),
          },
        });

        // Increment unread for others
        await prisma.conversationParticipant.updateMany({
          where: {
            conversationId,
            userId: { not: userId },
          },
          data: { unreadCount: { increment: 1 } },
        });

        // Broadcast to conversation room
        io.to(`conversation:${conversationId}`).emit('receiveMessage', {
          ...message,
          conversationId,
        });

        // Notify other participants about new message (for conversation list update)
        const otherParticipants = await prisma.conversationParticipant.findMany({
          where: { conversationId, userId: { not: userId } },
        });

        for (const p of otherParticipants) {
          io.to(`user:${p.userId}`).emit('conversationUpdated', {
            conversationId,
            lastMessage: content,
            lastMessageAt: new Date(),
          });
        }
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: '消息发送失败' });
      }
    });

    // Typing indicator
    socket.on('typing', (data: { conversationId: string }) => {
      socket.to(`conversation:${data.conversationId}`).emit('userTyping', {
        userId,
        conversationId: data.conversationId,
      });
    });

    // Stop typing
    socket.on('stopTyping', (data: { conversationId: string }) => {
      socket.to(`conversation:${data.conversationId}`).emit('userStopTyping', {
        userId,
        conversationId: data.conversationId,
      });
    });

    // Mark conversation as read
    socket.on('markRead', async (data: { conversationId: string }) => {
      try {
        await prisma.conversationParticipant.updateMany({
          where: {
            conversationId: data.conversationId,
            userId,
          },
          data: { unreadCount: 0 },
        });
      } catch (error) {
        console.error('Error marking as read:', error);
      }
    });

    // Join a specific conversation room
    socket.on('joinConversation', (data: { conversationId: string }) => {
      socket.join(`conversation:${data.conversationId}`);
    });

    // Leave a conversation room
    socket.on('leaveConversation', (data: { conversationId: string }) => {
      socket.leave(`conversation:${data.conversationId}`);
    });

    // Confirm collaboration
    socket.on('confirmCollaboration', async (data: { conversationId: string }) => {
      try {
        const conversation = await prisma.conversation.findUnique({
          where: { id: data.conversationId },
        });

        if (!conversation) return;

        await prisma.conversation.update({
          where: { id: data.conversationId },
          data: { status: 'confirmed' },
        });

        if (conversation.projectId) {
          await prisma.project.update({
            where: { id: conversation.projectId },
            data: { status: 'confirmed' },
          });
        }

        if (conversation.skillId) {
          await prisma.skill.update({
            where: { id: conversation.skillId },
            data: { status: 'confirmed' },
          });
        }

        // System message
        const sysMessage = await prisma.message.create({
          data: {
            conversationId: data.conversationId,
            senderId: userId,
            type: 'system',
            content: '双方已确认合作 🎉',
          },
          include: {
            sender: { select: { id: true, name: true, avatar: true } },
          },
        });

        io.to(`conversation:${data.conversationId}`).emit('receiveMessage', sysMessage);
        io.to(`conversation:${data.conversationId}`).emit('collaborationConfirmed', {
          conversationId: data.conversationId,
        });
      } catch (error) {
        console.error('Error confirming collaboration:', error);
        socket.emit('error', { message: '确认合作失败' });
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`🔌 User disconnected: ${userId} (socket: ${socket.id})`);
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
        }
      }
    });
  });
}

async function joinUserConversations(socket: AuthenticatedSocket, userId: string) {
  const participations = await prisma.conversationParticipant.findMany({
    where: { userId },
    select: { conversationId: true },
  });

  for (const p of participations) {
    socket.join(`conversation:${p.conversationId}`);
  }
}

export function isUserOnline(userId: string): boolean {
  return onlineUsers.has(userId) && onlineUsers.get(userId)!.size > 0;
}
