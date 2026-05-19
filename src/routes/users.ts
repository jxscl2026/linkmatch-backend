import { Router, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const userRouter = Router();

// ==================== 获取用户公开信息 ====================
userRouter.get('/:id', optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        avatar: true,
        role: true,
        creditScore: true,
        company: true,
        title: true,
        bio: true,
        createdAt: true,
        _count: {
          select: {
            projects: true,
            skills: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError('用户不存在', 404);
    }

    res.json({
      success: true,
      data: {
        ...user,
        projectCount: user._count.projects,
        skillCount: user._count.skills,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ==================== 获取我的发布 (需求) ====================
userRouter.get('/me/projects', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '10', status } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const where: any = { publisherId: req.user!.id };
    if (status) where.status = status;

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
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

// ==================== 获取我的发布 (技能) ====================
userRouter.get('/me/skills', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '10', status } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const where: any = { publisherId: req.user!.id };
    if (status) where.status = status;

    const [skills, total] = await Promise.all([
      prisma.skill.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
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

// ==================== 获取我的匹配记录 ====================
userRouter.get('/me/matches', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const matches = await prisma.matchRecord.findMany({
      where: {
        OR: [
          { fromUserId: req.user!.id },
          { toUserId: req.user!.id },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        project: {
          select: { id: true, title: true, category: true, budgetMin: true, budgetMax: true },
        },
        skill: {
          select: { id: true, name: true, category: true, priceMin: true, priceMax: true },
        },
        fromUser: {
          select: { id: true, name: true, avatar: true },
        },
        toUser: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });

    res.json({
      success: true,
      data: matches,
    });
  } catch (error) {
    next(error);
  }
});

// ==================== 获取统计数据 (个人中心) ====================
userRouter.get('/me/stats', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const [
      projectCount,
      skillCount,
      conversationCount,
      completedCount,
    ] = await Promise.all([
      prisma.project.count({ where: { publisherId: userId } }),
      prisma.skill.count({ where: { publisherId: userId } }),
      prisma.conversationParticipant.count({ where: { userId } }),
      prisma.conversation.count({
        where: {
          status: 'confirmed',
          participants: { some: { userId } },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        projectCount,
        skillCount,
        conversationCount,
        completedCount,
      },
    });
  } catch (error) {
    next(error);
  }
});
