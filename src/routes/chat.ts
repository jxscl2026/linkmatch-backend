import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const chatRouter = Router();

// ==================== 获取会话列表 ====================
chatRouter.get('/conversations', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const participations = await prisma.conversationParticipant.findMany({
      where: { userId },
      include: {
        conversation: {
          include: {
            participants: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    avatar: true,
                    company: true,
                  },
                },
              },
            },
            project: {
              select: { id: true, title: true },
            },
            skill: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: {
        conversation: { lastMessageAt: 'desc' },
      },
    });

    const conversations = participations.map((p) => {
      const conv = p.conversation;
      const otherParticipant = conv.participants.find(
        (pp) => pp.userId !== userId
      );

      return {
        id: conv.id,
        status: conv.status,
        lastMessage: conv.lastMessage,
        lastMessageAt: conv.lastMessageAt,
        unreadCount: p.unreadCount,
        relatedTitle: conv.project?.title || conv.skill?.name || '',
        relatedType: conv.project ? 'project' : conv.skill ? 'skill' : null,
        relatedId: conv.project?.id || conv.skill?.id || null,
        otherUser: otherParticipant?.user || null,
      };
    });

    res.json({
      success: true,
      data: conversations,
    });
  } catch (error) {
    next(error);
  }
});

// ==================== 获取会话消息历史 ====================
chatRouter.get('/conversations/:id/messages', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { page = '1', limit = '50' } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Verify user is participant
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId: id,
        userId: req.user!.id,
      },
    });

    if (!participant) {
      throw new AppError('无权访问此会话', 403);
    }

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: { conversationId: id },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limitNum,
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
      }),
      prisma.message.count({ where: { conversationId: id } }),
    ]);

    // Mark as read
    await prisma.conversationParticipant.update({
      where: { id: participant.id },
      data: { unreadCount: 0 },
    });

    res.json({
      success: true,
      data: {
        items: messages,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// ==================== 发送消息 (HTTP fallback, 主要通过WebSocket) ====================
chatRouter.post('/conversations/:id/messages', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const messageSchema = z.object({
      content: z.string().min(1, '消息内容不能为空'),
      type: z.enum(['text', 'image', 'card']).default('text'),
      cardData: z.any().optional(),
    });

    const data = messageSchema.parse(req.body);

    // Verify user is participant
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId: id,
        userId: req.user!.id,
      },
    });

    if (!participant) {
      throw new AppError('无权在此会话中发送消息', 403);
    }

    const message = await prisma.message.create({
      data: {
        conversationId: id,
        senderId: req.user!.id,
        content: data.content,
        type: data.type,
        cardData: data.cardData || undefined,
      },
      include: {
        sender: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });

    // Update conversation last message
    await prisma.conversation.update({
      where: { id },
      data: {
        lastMessage: data.content,
        lastMessageAt: new Date(),
      },
    });

    // Increment unread count for other participants
    await prisma.conversationParticipant.updateMany({
      where: {
        conversationId: id,
        userId: { not: req.user!.id },
      },
      data: {
        unreadCount: { increment: 1 },
      },
    });

    res.status(201).json({
      success: true,
      data: message,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400));
    }
    next(error);
  }
});

// ==================== 确认合作 ====================
chatRouter.post('/conversations/:id/confirm', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Verify user is participant
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId: id,
        userId: req.user!.id,
      },
    });

    if (!participant) {
      throw new AppError('无权操作此会话', 403);
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        project: true,
        skill: true,
      },
    });

    if (!conversation) {
      throw new AppError('会话不存在', 404);
    }

    // Update conversation status
    await prisma.conversation.update({
      where: { id },
      data: { status: 'confirmed' },
    });

    // Update related project/skill status
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

    // Add system message
    await prisma.message.create({
      data: {
        conversationId: id,
        senderId: req.user!.id,
        type: 'system',
        content: '双方已确认合作',
      },
    });

    // Update credit scores for both participants
    const participants = await prisma.conversationParticipant.findMany({
      where: { conversationId: id },
    });

    for (const p of participants) {
      await prisma.user.update({
        where: { id: p.userId },
        data: { creditScore: { increment: 2 } },
      });
    }

    res.json({
      success: true,
      message: '合作已确认',
    });
  } catch (error) {
    next(error);
  }
});

// ==================== 创建新会话 (主动发起聊天) ====================
chatRouter.post('/conversations', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      targetUserId: z.string().uuid(),
      projectId: z.string().uuid().optional(),
      skillId: z.string().uuid().optional(),
      initialMessage: z.string().optional(),
    });

    const data = schema.parse(req.body);

    if (data.targetUserId === req.user!.id) {
      throw new AppError('不能与自己创建会话', 400);
    }

    // Check if conversation already exists
    const existing = await prisma.conversation.findFirst({
      where: {
        AND: [
          { participants: { some: { userId: req.user!.id } } },
          { participants: { some: { userId: data.targetUserId } } },
          ...(data.projectId ? [{ projectId: data.projectId }] : []),
          ...(data.skillId ? [{ skillId: data.skillId }] : []),
        ],
      },
    });

    if (existing) {
      return res.json({
        success: true,
        data: { conversationId: existing.id },
      });
    }

    const conversation = await prisma.conversation.create({
      data: {
        projectId: data.projectId || null,
        skillId: data.skillId || null,
        status: 'active',
        participants: {
          create: [
            { userId: req.user!.id },
            { userId: data.targetUserId },
          ],
        },
      },
    });

    // Send initial message if provided
    if (data.initialMessage) {
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: req.user!.id,
          content: data.initialMessage,
          type: 'text',
        },
      });

      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessage: data.initialMessage,
          lastMessageAt: new Date(),
        },
      });
    }

    res.status(201).json({
      success: true,
      data: { conversationId: conversation.id },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400));
    }
    next(error);
  }
});
