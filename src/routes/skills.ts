import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const skillRouter = Router();

// ==================== Validation Schemas ====================
const createSkillSchema = z.object({
  name: z.string().min(1, '请输入服务名称'),
  solution: z.string().min(1, '请输入解决方案描述'),
  cases: z.array(z.object({
    title: z.string(),
    description: z.string(),
  })).default([]),
  priceType: z.enum(['range', 'fixed', 'daily']).default('range'),
  priceMin: z.number().min(0).optional(),
  priceMax: z.number().min(0).optional(),
  currency: z.string().default('¥'),
  teamIntro: z.string().optional(),
  teamSize: z.number().min(1).optional(),
  tags: z.array(z.string()).default([]),
  category: z.string().min(1, '请选择分类'),
  industries: z.array(z.string()).default([]),
  scenarios: z.array(z.string()).default([]),
  location: z.string().optional(),
});

// ==================== 获取技能列表 (广场) ====================
skillRouter.get('/', optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
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

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (category && category !== '全部') {
      where.category = category;
    }

    if (keyword) {
      where.OR = [
        { name: { contains: keyword, mode: 'insensitive' } },
        { solution: { contains: keyword, mode: 'insensitive' } },
        { tags: { hasSome: [keyword] } },
      ];
    }

    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'price_high') orderBy = { priceMax: 'desc' };
    if (sort === 'price_low') orderBy = { priceMin: 'asc' };
    if (sort === 'popular') orderBy = { viewCount: 'desc' };

    const [skills, total] = await Promise.all([
      prisma.skill.findMany({
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
      prisma.skill.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        items: skills,
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

// ==================== 获取技能详情 ====================
skillRouter.get('/:id', optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const skill = await prisma.skill.findUnique({
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

    if (!skill) {
      throw new AppError('服务不存在', 404);
    }

    // Increment view count
    await prisma.skill.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    // Get match recommendations (projects that match this skill)
    const matches = await prisma.matchRecord.findMany({
      where: { skillId: id },
      orderBy: { score: 'desc' },
      take: 5,
      include: {
        project: {
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
        ...skill,
        viewCount: skill.viewCount + 1,
        recommendations: matches.map((m) => ({
          id: m.id,
          score: m.score,
          project: m.project,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

// ==================== 发布技能/服务 ====================
skillRouter.post('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = createSkillSchema.parse(req.body);

    const skill = await prisma.skill.create({
      data: {
        ...data,
        cases: data.cases as any,
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

    // Trigger matching asynchronously
    triggerMatching(skill.id).catch(console.error);

    res.status(201).json({
      success: true,
      data: skill,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400));
    }
    next(error);
  }
});

// ==================== 更新技能 ====================
skillRouter.put('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const existing = await prisma.skill.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('服务不存在', 404);
    }
    if (existing.publisherId !== req.user!.id) {
      throw new AppError('无权修改此服务', 403);
    }

    const data = createSkillSchema.partial().parse(req.body);

    const skill = await prisma.skill.update({
      where: { id },
      data: {
        ...data,
        cases: data.cases as any,
      },
    });

    res.json({
      success: true,
      data: skill,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400));
    }
    next(error);
  }
});

// ==================== 删除技能 ====================
skillRouter.delete('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const existing = await prisma.skill.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('服务不存在', 404);
    }
    if (existing.publisherId !== req.user!.id) {
      throw new AppError('无权删除此服务', 403);
    }

    await prisma.skill.delete({ where: { id } });

    res.json({
      success: true,
      message: '服务已删除',
    });
  } catch (error) {
    next(error);
  }
});

// ==================== 表达兴趣 ====================
skillRouter.post('/:id/interest', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const skill = await prisma.skill.findUnique({
      where: { id },
      include: { publisher: true },
    });

    if (!skill) {
      throw new AppError('服务不存在', 404);
    }

    if (skill.publisherId === req.user!.id) {
      throw new AppError('不能对自己的服务表达兴趣', 400);
    }

    await prisma.skill.update({
      where: { id },
      data: { matchCount: { increment: 1 } },
    });

    let conversation = await prisma.conversation.findFirst({
      where: {
        skillId: id,
        participants: {
          some: { userId: req.user!.id },
        },
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          skillId: id,
          status: 'active',
          participants: {
            create: [
              { userId: req.user!.id },
              { userId: skill.publisherId },
            ],
          },
        },
      });

      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: req.user!.id,
          type: 'system',
          content: `对「${skill.name}」表达了兴趣`,
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

async function triggerMatching(skillId: string) {
  const { matchService } = require('../services/match');
  await matchService.matchForSkill(skillId);
}
