import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { generateToken } from '../utils/jwt';
import { smsService } from '../services/sms';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const authRouter = Router();

// ==================== Validation Schemas ====================
const emailRegisterSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(6, '密码至少6位'),
  name: z.string().min(1, '请输入用户名').optional(),
  role: z.enum(['enterprise', 'provider', 'demander']).optional(),
});

const emailLoginSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(1, '请输入密码'),
});

const smsSendSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, '请输入有效的手机号'),
});

const smsLoginSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, '请输入有效的手机号'),
  code: z.string().length(6, '验证码为6位数字'),
});

// ==================== Helper ====================
function formatUserResponse(user: any) {
  return {
    id: user.id,
    name: user.name,
    avatar: user.avatar,
    role: user.role,
    creditScore: user.creditScore,
    company: user.company,
    title: user.title,
    bio: user.bio,
    phone: user.phone,
    email: user.email,
    createdAt: user.createdAt,
  };
}

// ==================== 邮箱注册 ====================
authRouter.post('/register/email', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = emailRegisterSchema.parse(req.body);

    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new AppError('该邮箱已被注册', 409);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name || data.email.split('@')[0],
        role: data.role || 'demander',
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Date.now()}`,
      },
    });

    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      data: {
        user: formatUserResponse(user),
        token,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400));
    }
    next(error);
  }
});

// ==================== 邮箱登录 ====================
authRouter.post('/login/email', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = emailLoginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user || !user.password) {
      throw new AppError('邮箱或密码错误', 401);
    }

    const isValid = await bcrypt.compare(data.password, user.password);
    if (!isValid) {
      throw new AppError('邮箱或密码错误', 401);
    }

    const token = generateToken(user.id);

    res.json({
      success: true,
      data: {
        user: formatUserResponse(user),
        token,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400));
    }
    next(error);
  }
});

// ==================== 发送短信验证码 ====================
authRouter.post('/sms/send', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = smsSendSchema.parse(req.body);

    // Rate limiting: check if code was sent within last 60 seconds
    const recentCode = await prisma.smsCode.findFirst({
      where: {
        phone: data.phone,
        createdAt: { gt: new Date(Date.now() - 60 * 1000) },
      },
    });

    if (recentCode) {
      throw new AppError('请求过于频繁，请60秒后重试', 429);
    }

    const result = await smsService.sendCode(data.phone);

    res.json({
      success: result.success,
      message: result.message,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400));
    }
    next(error);
  }
});

// ==================== 手机验证码登录 (自动注册) ====================
authRouter.post('/login/sms', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = smsLoginSchema.parse(req.body);

    // Verify code
    const isValid = await smsService.verifyCode(data.phone, data.code);
    if (!isValid) {
      throw new AppError('验证码错误或已过期', 401);
    }

    // Find or create user
    let user = await prisma.user.findUnique({ where: { phone: data.phone } });

    if (!user) {
      // Auto-register
      user = await prisma.user.create({
        data: {
          phone: data.phone,
          name: `用户${data.phone.slice(-4)}`,
          role: 'demander',
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.phone}`,
        },
      });
    }

    const token = generateToken(user.id);

    res.json({
      success: true,
      data: {
        user: formatUserResponse(user),
        token,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400));
    }
    next(error);
  }
});

// ==================== 微信登录 (第二期预留) ====================
authRouter.get('/wechat/url', (req: Request, res: Response) => {
  res.json({
    success: false,
    message: '微信登录功能即将上线',
  });
});

authRouter.post('/wechat/callback', (req: Request, res: Response) => {
  res.json({
    success: false,
    message: '微信登录功能即将上线',
  });
});

// ==================== 获取当前用户信息 ====================
authRouter.get('/me', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
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
        ...formatUserResponse(user),
        projectCount: user._count.projects,
        skillCount: user._count.skills,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ==================== 更新用户信息 ====================
authRouter.put('/me', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const updateSchema = z.object({
      name: z.string().min(1).optional(),
      avatar: z.string().url().optional(),
      role: z.enum(['enterprise', 'provider', 'demander']).optional(),
      company: z.string().optional(),
      title: z.string().optional(),
      bio: z.string().optional(),
    });

    const data = updateSchema.parse(req.body);

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data,
    });

    res.json({
      success: true,
      data: formatUserResponse(user),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400));
    }
    next(error);
  }
});

// ==================== 退出登录 (前端清除token即可, 此接口可选) ====================
authRouter.post('/logout', authenticate, (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    message: '已退出登录',
  });
});
