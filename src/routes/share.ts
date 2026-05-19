import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { prisma } from '../utils/prisma';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const shareRouter = Router();

// ==================== 生成分享链接 ====================
shareRouter.post('/generate', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      type: z.enum(['project', 'skill']),
      id: z.string().uuid(),
    });

    const data = schema.parse(req.body);

    // Verify resource exists
    if (data.type === 'project') {
      const project = await prisma.project.findUnique({ where: { id: data.id } });
      if (!project) throw new AppError('需求不存在', 404);
    } else {
      const skill = await prisma.skill.findUnique({ where: { id: data.id } });
      if (!skill) throw new AppError('服务不存在', 404);
    }

    // Check if token already exists for this resource
    const existing = await prisma.shareToken.findFirst({
      where: {
        type: data.type,
        ...(data.type === 'project' ? { projectId: data.id } : { skillId: data.id }),
        creatorId: req.user!.id,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });

    if (existing) {
      return res.json({
        success: true,
        data: {
          token: existing.token,
          url: `${req.headers.origin || process.env.FRONTEND_URL}/s/${existing.token}`,
        },
      });
    }

    // Generate new token
    const token = nanoid(10);

    await prisma.shareToken.create({
      data: {
        token,
        type: data.type,
        projectId: data.type === 'project' ? data.id : null,
        skillId: data.type === 'skill' ? data.id : null,
        creatorId: req.user!.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    res.json({
      success: true,
      data: {
        token,
        url: `${req.headers.origin || process.env.FRONTEND_URL}/s/${token}`,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400));
    }
    next(error);
  }
});

// ==================== 通过分享token获取资源 ====================
shareRouter.get('/resolve/:token', optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params;

    const shareToken = await prisma.shareToken.findUnique({
      where: { token },
      include: {
        project: {
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
        },
        skill: {
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
        },
      },
    });

    if (!shareToken) {
      throw new AppError('分享链接无效', 404);
    }

    if (shareToken.expiresAt && shareToken.expiresAt < new Date()) {
      throw new AppError('分享链接已过期', 410);
    }

    // Increment view count
    await prisma.shareToken.update({
      where: { id: shareToken.id },
      data: { viewCount: { increment: 1 } },
    });

    res.json({
      success: true,
      data: {
        type: shareToken.type,
        resource: shareToken.type === 'project' ? shareToken.project : shareToken.skill,
      },
    });
  } catch (error) {
    next(error);
  }
});
