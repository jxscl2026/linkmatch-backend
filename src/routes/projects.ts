import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const projectRouter = Router();

// ==================== Validation Schemas ====================
const createProjectSchema = z.object({
  title: z.string().min(1, '请输入项目标题'),
  description: z.string().min(1, '请输入项目描述'),
  budgetMin: z.number().min(0),
  budgetMax: z.number().min(0),
  currency: z.string().default('¥'),
  deadline: z.string().optional(),
  category: z.string().min(1, '请选择分类'),
  tags: z.array(z.string()).default([]),
  requirements: z.array(z.string()).default([]),
  background: z.string().optional(),
  acceptance: z.string().optional(),
  skillTypes: z.array(z.string()).default([]),
  resources: z.array(z.string()).default([]),
  location: z.string().optional(),
});

// ==================== 获取需求列表 (广场) ====================
projectRouter.get('/', optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      page = '1',
      limit = '10',
      category,
      keyword,
      status = 'published',
      sort = 'latest',
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (category && category !== '全部') {
      where.category = category;
    }

    if (keyword) {
      where.OR = [
        { title: { contains: keyword, mode: 'insensitive' } },
        { description: { contains: keyword, mode: 'insensitive' } },
        { tags: { hasSome: [keyword] } },
      ];
    }

    // Build orderBy
    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'budget_high') orderBy = { budgetMax: 'desc' };
    if (sort === 'budget_low') orderBy = { budgetMin: 'asc' };
    if (sort === 'popular') orderBy = { viewCount: 'desc' };

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        orderBy,
        skip,
        take: limitNum,
        include: {
          publisher: {
            select: {
              id: true,
              name: true,
              avatar: true,
              company: true,
              creditScore: true,
            },
          },
        },
      }),
      prisma.project.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        items: projects,
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

// ==================== 获取需求详情 ====================
projectRouter.get('/:id', optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        publisher: {
          select: {
            id: true,
            name: true,
            avatar: true,
            company: true,
            title: true,
            bio: true,
            creditScore: true,
            _count: {
              select: { projects: true, skills: true },
            },
          },
        },
      },
    });

    if (!project) {
      throw new AppError('需求不存在', 404);
    }

    // Increment view count
    await prisma.project.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    // Get match recommendations
    const matches = await prisma.matchRecord.findMany({
      where: { projectId: id },
      orderBy: { score: 'desc' },
      take: 5,
      include: {
        skill: {
          include: {
            publisher: {
              select: { id: true, name: true, avatar: true },
            },
          },
        },
      },
    });

    res.json({
      success: true,
      data: {
        ...project,
        viewCount: project.viewCount + 1,
        recommendations: matches.map((m) => ({
          id: m.id,
          score: m.score,
          skill: m.skill,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

// ==================== 发布需求 ====================
projectRouter.post('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = createProjectSchema.parse(req.body);

    const project = await prisma.project.create({
      data: {
        ...data,
        deadline: data.deadline ? new Date(data.deadline) : null,
        publisherId: req.user!.id,
        status: 'published',
      },
      include: {
        publisher: {
          select: {
            id: true,
            name: true,
            avatar: true,
            company: true,
          },
        },
      },
    });

    // Trigger matching asynchronously (non-blocking)
    triggerMatching(project.id, 'project').catch(console.error);

    res.status(201).json({
      success: true,
      data: project,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400));
    }
    next(error);
  }
});

// ==================== 更新需求 ====================
projectRouter.put('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Check ownership
    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('需求不存在', 404);
    }
    if (existing.publisherId !== req.user!.id) {
      throw new AppError('无权修改此需求', 403);
    }

    const data = createProjectSchema.partial().parse(req.body);

    const project = await prisma.project.update({
      where: { id },
      data: {
        ...data,
        deadline: data.deadline ? new Date(data.deadline) : undefined,
      },
    });

    res.json({
      success: true,
      data: project,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400));
    }
    next(error);
  }
});

// ==================== 删除需求 ====================
projectRouter.delete('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('需求不存在', 404);
    }
    if (existing.publisherId !== req.user!.id) {
      throw new AppError('无权删除此需求', 403);
    }

    await prisma.project.delete({ where: { id } });

    res.json({
      success: true,
      message: '需求已删除',
    });
  } catch (error) {
    next(error);
  }
});

// ==================== 表达兴趣 (感兴趣按钮) ====================
projectRouter.post('/:id/interest', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: { publisher: true },
    });

    if (!project) {
      throw new AppError('需求不存在', 404);
    }

    if (project.publisherId === req.user!.id) {
      throw new AppError('不能对自己的需求表达兴趣', 400);
    }

    // Update match count
    await prisma.project.update({
      where: { id },
      data: { matchCount: { increment: 1 } },
    });

    // Create or find conversation
    let conversation = await prisma.conversation.findFirst({
      where: {
        projectId: id,
        participants: {
          some: { userId: req.user!.id },
        },
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          projectId: id,
          status: 'active',
          participants: {
            create: [
              { userId: req.user!.id },
              { userId: project.publisherId },
            ],
          },
        },
      });

      // Send system message
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: req.user!.id,
          type: 'system',
          content: `对「${project.title}」表达了兴趣`,
        },
      });
    }

    res.json({
      success: true,
      data: {
        conversationId: conversation.id,
        message: '已表达兴趣，可以开始沟通',
      },
    });
  } catch (error) {
    next(error);
  }
});

// ==================== Matching trigger (internal) ====================
async function triggerMatching(projectId: string, type: 'project') {
  const { matchService } = require('../services/match');
  await matchService.matchForProject(projectId);
}
