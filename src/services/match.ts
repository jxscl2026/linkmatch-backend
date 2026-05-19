import { prisma } from '../utils/prisma';

/**
 * LinkMatch 匹配引擎
 * 
 * 基于多维度加权评分的匹配算法：
 * 1. 分类匹配 (必须一致, 否则跳过)
 * 2. 标签重合度 (权重 40%)
 * 3. 预算/报价匹配 (权重 40%)
 * 4. 其他因素 (权重 20%): 地理位置、信用分等
 */

const WEIGHTS = {
  tags: 0.4,
  budget: 0.4,
  other: 0.2,
};

/**
 * Calculate tag overlap score between two tag arrays
 */
function calculateTagScore(tags1: string[], tags2: string[]): number {
  if (tags1.length === 0 && tags2.length === 0) return 0.5;
  if (tags1.length === 0 || tags2.length === 0) return 0.1;

  const set1 = new Set(tags1.map((t) => t.toLowerCase()));
  const set2 = new Set(tags2.map((t) => t.toLowerCase()));

  let matchCount = 0;
  for (const tag of set1) {
    if (set2.has(tag)) matchCount++;
  }

  // Jaccard similarity
  const union = new Set([...set1, ...set2]);
  return matchCount / union.size;
}

/**
 * Calculate budget overlap score
 */
function calculateBudgetScore(
  budgetMin: number,
  budgetMax: number,
  priceMin: number | null,
  priceMax: number | null
): number {
  if (!priceMin && !priceMax) return 0.5;

  const pMin = priceMin || 0;
  const pMax = priceMax || Infinity;

  // Check if ranges overlap
  const overlapStart = Math.max(budgetMin, pMin);
  const overlapEnd = Math.min(budgetMax, pMax);

  if (overlapStart > overlapEnd) {
    // No overlap - calculate distance penalty
    const gap = overlapStart - overlapEnd;
    const avgBudget = (budgetMin + budgetMax) / 2;
    const penalty = Math.min(gap / avgBudget, 1);
    return Math.max(0, 0.3 - penalty * 0.3);
  }

  // Has overlap - calculate overlap ratio
  const overlapSize = overlapEnd - overlapStart;
  const budgetRange = budgetMax - budgetMin || 1;
  const priceRange = (pMax === Infinity ? budgetMax * 2 : pMax) - pMin || 1;
  const maxRange = Math.max(budgetRange, priceRange);

  return Math.min(1, overlapSize / maxRange + 0.3);
}

/**
 * Calculate other factors score (location, credit score, etc.)
 */
function calculateOtherScore(
  projectLocation: string | null,
  skillLocation: string | null,
  publisherCreditScore: number
): number {
  let score = 0.5;

  // Location bonus
  if (projectLocation && skillLocation) {
    if (projectLocation === skillLocation) {
      score += 0.3;
    } else if (
      projectLocation.includes(skillLocation) ||
      skillLocation.includes(projectLocation)
    ) {
      score += 0.15;
    }
  }

  // Credit score bonus (normalized from 0-100 to 0-0.2)
  score += (publisherCreditScore / 100) * 0.2;

  return Math.min(1, score);
}

export const matchService = {
  /**
   * Find matching skills for a newly published project
   */
  async matchForProject(projectId: string): Promise<void> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) return;

    // Find all published skills in the same category
    const candidateSkills = await prisma.skill.findMany({
      where: {
        status: 'published',
        category: project.category,
        publisherId: { not: project.publisherId }, // Exclude self
      },
      include: {
        publisher: {
          select: { creditScore: true },
        },
      },
    });

    const matches: Array<{
      skillId: string;
      toUserId: string;
      score: number;
    }> = [];

    for (const skill of candidateSkills) {
      const tagScore = calculateTagScore(project.tags, skill.tags);
      const budgetScore = calculateBudgetScore(
        project.budgetMin,
        project.budgetMax,
        skill.priceMin,
        skill.priceMax
      );
      const otherScore = calculateOtherScore(
        project.location,
        skill.location,
        skill.publisher.creditScore
      );

      const totalScore =
        tagScore * WEIGHTS.tags +
        budgetScore * WEIGHTS.budget +
        otherScore * WEIGHTS.other;

      // Only keep matches with score > 0.3
      if (totalScore > 0.3) {
        matches.push({
          skillId: skill.id,
          toUserId: skill.publisherId,
          score: Math.round(totalScore * 100) / 100,
        });
      }
    }

    // Sort by score descending, keep top 10
    matches.sort((a, b) => b.score - a.score);
    const topMatches = matches.slice(0, 10);

    // Store match records
    if (topMatches.length > 0) {
      await prisma.matchRecord.createMany({
        data: topMatches.map((m) => ({
          projectId,
          skillId: m.skillId,
          fromUserId: project.publisherId,
          toUserId: m.toUserId,
          score: m.score,
          status: 'recommended',
        })),
      });

      // Update project status to matching
      await prisma.project.update({
        where: { id: projectId },
        data: { status: 'matching', matchCount: topMatches.length },
      });
    }
  },

  /**
   * Find matching projects for a newly published skill
   */
  async matchForSkill(skillId: string): Promise<void> {
    const skill = await prisma.skill.findUnique({
      where: { id: skillId },
      include: {
        publisher: {
          select: { creditScore: true },
        },
      },
    });

    if (!skill) return;

    // Find all published projects in the same category
    const candidateProjects = await prisma.project.findMany({
      where: {
        status: { in: ['published', 'matching'] },
        category: skill.category,
        publisherId: { not: skill.publisherId },
      },
      include: {
        publisher: {
          select: { creditScore: true },
        },
      },
    });

    const matches: Array<{
      projectId: string;
      toUserId: string;
      score: number;
    }> = [];

    for (const project of candidateProjects) {
      const tagScore = calculateTagScore(skill.tags, project.tags);
      const budgetScore = calculateBudgetScore(
        project.budgetMin,
        project.budgetMax,
        skill.priceMin,
        skill.priceMax
      );
      const otherScore = calculateOtherScore(
        project.location,
        skill.location,
        skill.publisher.creditScore
      );

      const totalScore =
        tagScore * WEIGHTS.tags +
        budgetScore * WEIGHTS.budget +
        otherScore * WEIGHTS.other;

      if (totalScore > 0.3) {
        matches.push({
          projectId: project.id,
          toUserId: project.publisherId,
          score: Math.round(totalScore * 100) / 100,
        });
      }
    }

    matches.sort((a, b) => b.score - a.score);
    const topMatches = matches.slice(0, 10);

    if (topMatches.length > 0) {
      await prisma.matchRecord.createMany({
        data: topMatches.map((m) => ({
          projectId: m.projectId,
          skillId,
          fromUserId: skill.publisherId,
          toUserId: m.toUserId,
          score: m.score,
          status: 'recommended',
        })),
      });

      await prisma.skill.update({
        where: { id: skillId },
        data: { status: 'matching', matchCount: topMatches.length },
      });
    }
  },

  /**
   * Recalculate all matches (can be run periodically)
   */
  async recalculateAll(): Promise<{ projectMatches: number; skillMatches: number }> {
    // Clear old recommendations
    await prisma.matchRecord.deleteMany({
      where: { status: 'recommended' },
    });

    const projects = await prisma.project.findMany({
      where: { status: { in: ['published', 'matching'] } },
    });

    let projectMatches = 0;
    for (const project of projects) {
      await this.matchForProject(project.id);
      projectMatches++;
    }

    const skills = await prisma.skill.findMany({
      where: { status: { in: ['published', 'matching'] } },
    });

    let skillMatches = 0;
    for (const skill of skills) {
      await this.matchForSkill(skill.id);
      skillMatches++;
    }

    return { projectMatches, skillMatches };
  },
};
