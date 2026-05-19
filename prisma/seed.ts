import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create test users
  const password = await bcrypt.hash('123456', 12);

  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'zhaoXuemei@test.com' },
      update: {},
      create: {
        email: 'zhaoXuemei@test.com',
        password,
        name: '赵雪梅',
        role: 'demander',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhaoXuemei',
        company: '雪梅文化传媒',
        title: '创始人',
        bio: '寻找视频制作和数字营销团队',
        creditScore: 82,
      },
    }),
    prisma.user.upsert({
      where: { email: 'chenMingyuan@test.com' },
      update: {},
      create: {
        email: 'chenMingyuan@test.com',
        password,
        name: '陈明远',
        role: 'demander',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=chenMingyuan',
        company: '远景数据科技',
        title: 'CTO',
        bio: '专注企业数据中台建设',
        creditScore: 90,
      },
    }),
    prisma.user.upsert({
      where: { email: 'zhangSiqin@test.com' },
      update: {},
      create: {
        email: 'zhangSiqin@test.com',
        password,
        name: '张思琪',
        role: 'demander',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhangSiqin',
        company: '思琪电商',
        title: '产品经理',
        bio: '微信小程序商城开发需求',
        creditScore: 78,
      },
    }),
    prisma.user.upsert({
      where: { email: 'wangJianhua@test.com' },
      update: {},
      create: {
        email: 'wangJianhua@test.com',
        password,
        name: '王建华',
        role: 'provider',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=wangJianhua',
        company: '建华科技工作室',
        title: '技术总监',
        bio: '全栈开发、AI解决方案',
        creditScore: 95,
      },
    }),
    prisma.user.upsert({
      where: { email: 'linXiaoyu@test.com' },
      update: {},
      create: {
        email: 'linXiaoyu@test.com',
        password,
        name: '林小雨',
        role: 'provider',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=linXiaoyu',
        company: '小雨设计工作室',
        title: '创意总监',
        bio: '专业UI/UX设计、数字营销',
        creditScore: 88,
      },
    }),
    prisma.user.upsert({
      where: { email: 'liHaoran@test.com' },
      update: {},
      create: {
        email: 'liHaoran@test.com',
        password,
        name: '李浩然',
        role: 'provider',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=liHaoran',
        company: '浩然移动开发',
        title: '移动端负责人',
        bio: '微信小程序、App开发专家',
        creditScore: 92,
      },
    }),
  ]);

  console.log(`✅ Created ${users.length} users`);

  // Create projects (demands)
  const projects = await Promise.all([
    prisma.project.create({
      data: {
        title: '短视频内容运营平台开发',
        description: '开发一个短视频内容管理和运营平台，支持多平台账号管理、内容排期、数据分析、团队协作等功能。需要对接抖音、快手、小红书等平台API。',
        budgetMin: 250000,
        budgetMax: 400000,
        category: '技术开发',
        tags: ['短视频', '内容管理', '社媒运营'],
        requirements: ['有社媒平台API对接经验', '熟悉视频处理技术', '有内容管理系统开发经验'],
        background: '本项目旨在通过专业的技术团队支持，实现业务目标的高效达成。',
        acceptance: '按时交付符合需求的成果物\n通过质量测试和验收流程\n提供完整的文档和培训支持\n满足约定的技术指标和性能要求',
        skillTypes: ['软件开发', '视频处理', 'API对接'],
        resources: [],
        location: '上海',
        status: 'matching',
        viewCount: 198,
        matchCount: 5,
        publisherId: users[0].id,
        deadline: new Date('2025-08-15'),
      },
    }),
    prisma.project.create({
      data: {
        title: '企业数据中台建设',
        description: '建设企业级数据中台，整合多业务线数据源，构建数据仓库、数据治理体系、BI分析平台。需要ETL开发、数据建模、可视化报表等能力。',
        budgetMin: 500000,
        budgetMax: 800000,
        category: '技术开发',
        tags: ['数据中台', 'ETL', 'BI'],
        requirements: ['有大数据平台建设经验', '熟悉数据治理', '有BI工具开发经验'],
        background: '整合多业务线数据，构建统一的数据分析平台。',
        acceptance: '数据中台架构设计文档\n完成数据接入和ETL流程\nBI报表系统上线',
        skillTypes: ['数据工程', '大数据', '可视化'],
        resources: [],
        location: '北京',
        status: 'published',
        viewCount: 156,
        matchCount: 3,
        publisherId: users[1].id,
        deadline: new Date('2025-09-30'),
      },
    }),
    prisma.project.create({
      data: {
        title: '微信小程序商城开发',
        description: '开发微信小程序商城，需要商品分类、搜索、购物车、微信支付、订单管理、分销系统等核心功能。要求性能优异，加载速度快。',
        budgetMin: 100000,
        budgetMax: 200000,
        category: '技术开发',
        tags: ['微信小程序', '商城', '支付'],
        requirements: ['有微信小程序开发经验', '熟悉微信支付', '有电商系统开发经验'],
        background: '打造一个高性能的微信小程序商城。',
        acceptance: '小程序上线并通过审核\n支付流程完整可用\n性能达标',
        skillTypes: ['小程序开发', '电商', '支付'],
        resources: [],
        location: '深圳',
        status: 'published',
        viewCount: 234,
        matchCount: 4,
        publisherId: users[2].id,
        deadline: new Date('2025-07-01'),
      },
    }),
    prisma.project.create({
      data: {
        title: '品牌VI视觉识别系统设计',
        description: '为新兴消费品牌设计全套VI系统，包括Logo、标准色、字体规范、名片、信纸、包装等应用场景。目标受众为25-35岁年轻消费者。',
        budgetMin: 80000,
        budgetMax: 150000,
        category: '设计创意',
        tags: ['VI设计', 'Logo', '品牌策略'],
        requirements: ['有消费品牌VI设计经验', '了解年轻消费者审美', '提供完整VI手册'],
        background: '新品牌上市，需要完整的视觉识别系统。',
        acceptance: 'Logo设计方案\n完整VI手册\n应用场景设计稿',
        skillTypes: ['品牌设计', 'VI设计', '平面设计'],
        resources: [],
        location: '杭州',
        status: 'published',
        viewCount: 89,
        matchCount: 2,
        publisherId: users[0].id,
        deadline: new Date('2025-06-15'),
      },
    }),
    prisma.project.create({
      data: {
        title: '企业官网改版设计与开发',
        description: '对现有企业官网进行全面改版，包括视觉设计升级、响应式适配、SEO优化、后台CMS系统开发。需要设计和开发一体化服务。',
        budgetMin: 60000,
        budgetMax: 120000,
        category: '技术开发',
        tags: ['官网', '响应式', 'SEO', 'CMS'],
        requirements: ['有企业官网设计开发经验', '熟悉SEO', '提供CMS后台'],
        background: '企业品牌升级，官网需要全面改版。',
        acceptance: '设计稿通过审核\n网站上线并通过测试\nSEO基础优化完成',
        skillTypes: ['Web开发', 'UI设计', 'SEO'],
        resources: [],
        location: '广州',
        status: 'published',
        viewCount: 167,
        matchCount: 6,
        publisherId: users[1].id,
        deadline: new Date('2025-07-30'),
      },
    }),
    prisma.project.create({
      data: {
        title: '社交电商APP开发',
        description: '开发一款社交电商APP，融合社交分享、直播带货、拼团砍价等功能。需要iOS和Android双端开发，以及后端API服务。',
        budgetMin: 300000,
        budgetMax: 600000,
        category: '技术开发',
        tags: ['社交电商', 'APP', '直播'],
        requirements: ['有社交电商APP开发经验', '熟悉直播技术', '支持双端开发'],
        background: '打造新一代社交电商平台。',
        acceptance: 'APP上架应用商店\n核心功能完整可用\n性能和稳定性达标',
        skillTypes: ['移动开发', '直播', '电商'],
        resources: [],
        location: '成都',
        status: 'published',
        viewCount: 312,
        matchCount: 8,
        publisherId: users[2].id,
        deadline: new Date('2025-10-01'),
      },
    }),
    prisma.project.create({
      data: {
        title: '数字营销全案策划',
        description: '为新产品上市提供全案数字营销策划，包括市场调研、品牌定位、社媒运营方案、KOL合作策略、投放计划等。',
        budgetMin: 150000,
        budgetMax: 300000,
        category: '市场营销',
        tags: ['数字营销', 'KOL', '社媒运营'],
        requirements: ['有快消品营销经验', '熟悉主流社媒平台', '有KOL资源'],
        background: '新产品即将上市，需要全方位的数字营销支持。',
        acceptance: '营销策划方案\n执行计划和时间表\n效果预估和KPI',
        skillTypes: ['营销策划', '社媒运营', 'KOL'],
        resources: [],
        location: '上海',
        status: 'published',
        viewCount: 145,
        matchCount: 3,
        publisherId: users[0].id,
        deadline: new Date('2025-06-30'),
      },
    }),
    prisma.project.create({
      data: {
        title: '智能客服系统开发',
        description: '开发基于AI的智能客服系统，支持多渠道接入（网页、微信、APP）、自然语言理解、知识库管理、人工坐席转接等功能。',
        budgetMin: 200000,
        budgetMax: 400000,
        category: '技术开发',
        tags: ['AI', '客服系统', 'NLP'],
        requirements: ['有AI/NLP开发经验', '熟悉客服系统架构', '有多渠道接入经验'],
        background: '提升客户服务效率，降低人工成本。',
        acceptance: '系统上线并稳定运行\nAI识别准确率达85%以上\n支持多渠道接入',
        skillTypes: ['AI开发', 'NLP', '系统集成'],
        resources: [],
        location: '北京',
        status: 'published',
        viewCount: 201,
        matchCount: 4,
        publisherId: users[1].id,
        deadline: new Date('2025-08-30'),
      },
    }),
  ]);

  console.log(`✅ Created ${projects.length} projects`);

  // Create skills (services)
  const skills = await Promise.all([
    prisma.skill.create({
      data: {
        name: '全栈Web开发服务',
        solution: '提供从前端到后端的全栈Web开发服务，包括React/Vue前端开发、Node.js/Python后端开发、数据库设计、API开发、部署运维等。',
        cases: [
          { title: '某电商平台重构', description: '使用React+Node.js重构电商平台，性能提升60%' },
          { title: '企业ERP系统', description: '为制造业企业开发定制ERP系统' },
        ],
        priceType: 'range',
        priceMin: 100000,
        priceMax: 500000,
        category: '技术开发',
        tags: ['全栈开发', 'React', 'Node.js', 'Python'],
        industries: ['电商', '企业服务', 'SaaS'],
        scenarios: ['Web应用开发', '系统重构', 'API开发'],
        teamIntro: '5人全栈团队，平均8年开发经验',
        teamSize: 5,
        location: '北京',
        status: 'published',
        viewCount: 345,
        matchCount: 12,
        publisherId: users[3].id,
      },
    }),
    prisma.skill.create({
      data: {
        name: 'AI解决方案与LLM应用开发',
        solution: '提供基于大语言模型的AI解决方案，包括智能客服、文档分析、代码生成、数据分析等应用场景的开发和部署。',
        cases: [
          { title: '智能文档分析系统', description: '为金融机构开发基于GPT的文档自动分析系统' },
          { title: 'AI编程助手', description: '企业内部AI编程助手，提升开发效率40%' },
        ],
        priceType: 'range',
        priceMin: 300000,
        priceMax: 1000000,
        category: '技术开发',
        tags: ['AI', 'LLM', 'GPT', '机器学习'],
        industries: ['金融', '教育', '企业服务'],
        scenarios: ['智能客服', '文档分析', '数据分析'],
        teamIntro: '3人AI团队，均有大厂AI研发经验',
        teamSize: 3,
        location: '北京',
        status: 'published',
        viewCount: 567,
        matchCount: 8,
        publisherId: users[3].id,
      },
    }),
    prisma.skill.create({
      data: {
        name: '专业UI/UX设计服务',
        solution: '提供从用户研究到视觉设计的全流程UI/UX设计服务，包括产品原型、交互设计、视觉设计、设计系统搭建等。',
        cases: [
          { title: '社交APP设计', description: '为某社交APP完成从0到1的设计，DAU突破100万' },
          { title: 'SaaS产品设计系统', description: '为B端SaaS产品搭建完整设计系统' },
        ],
        priceType: 'range',
        priceMin: 30000,
        priceMax: 150000,
        category: '设计创意',
        tags: ['UI设计', 'UX设计', '交互设计', '设计系统'],
        industries: ['互联网', 'SaaS', '消费品'],
        scenarios: ['APP设计', '网站设计', '设计系统'],
        teamIntro: '4人设计团队，擅长B端和C端产品设计',
        teamSize: 4,
        location: '杭州',
        status: 'published',
        viewCount: 289,
        matchCount: 15,
        publisherId: users[4].id,
      },
    }),
    prisma.skill.create({
      data: {
        name: '数字营销与增长服务',
        solution: '提供全方位数字营销服务，包括社媒运营、内容营销、SEO/SEM、KOL合作、数据分析驱动的增长策略。',
        cases: [
          { title: '新品牌冷启动', description: '帮助新消费品牌3个月内实现从0到月销百万' },
          { title: '企业获客增长', description: '为B2B企业搭建数字化获客体系，获客成本降低50%' },
        ],
        priceType: 'range',
        priceMin: 30000,
        priceMax: 200000,
        category: '市场营销',
        tags: ['数字营销', '社媒运营', 'SEO', '增长'],
        industries: ['消费品', 'B2B', '教育'],
        scenarios: ['品牌推广', '获客增长', '社媒运营'],
        teamIntro: '6人营销团队，覆盖策略、内容、投放全链路',
        teamSize: 6,
        location: '上海',
        status: 'published',
        viewCount: 198,
        matchCount: 9,
        publisherId: users[4].id,
      },
    }),
    prisma.skill.create({
      data: {
        name: '微信小程序开发服务',
        solution: '专注微信生态开发，提供小程序、公众号、企业微信的定制开发服务。熟悉微信支付、小程序云开发、订阅消息等能力。',
        cases: [
          { title: '连锁餐饮小程序', description: '为连锁餐饮品牌开发点餐小程序，日均订单5000+' },
          { title: '教育打卡小程序', description: '开发学习打卡小程序，用户突破50万' },
        ],
        priceType: 'range',
        priceMin: 50000,
        priceMax: 200000,
        category: '技术开发',
        tags: ['微信小程序', '公众号', '企业微信'],
        industries: ['餐饮', '教育', '零售'],
        scenarios: ['电商小程序', '工具小程序', '服务小程序'],
        teamIntro: '3人微信生态开发团队，累计开发50+小程序',
        teamSize: 3,
        location: '深圳',
        status: 'published',
        viewCount: 412,
        matchCount: 18,
        publisherId: users[5].id,
      },
    }),
    prisma.skill.create({
      data: {
        name: '移动端APP开发服务',
        solution: '提供iOS和Android双端APP开发服务，支持原生开发和跨平台方案（React Native/Flutter）。涵盖社交、电商、工具等多种类型。',
        cases: [
          { title: '健身社交APP', description: '开发健身社交APP，上线3个月用户突破10万' },
          { title: '企业办公APP', description: '为大型企业开发内部办公APP，覆盖2000+员工' },
        ],
        priceType: 'range',
        priceMin: 150000,
        priceMax: 500000,
        category: '技术开发',
        tags: ['iOS', 'Android', 'React Native', 'Flutter'],
        industries: ['社交', '企业服务', '健康'],
        scenarios: ['社交APP', '电商APP', '企业APP'],
        teamIntro: '4人移动开发团队，精通原生和跨平台方案',
        teamSize: 4,
        location: '成都',
        status: 'published',
        viewCount: 278,
        matchCount: 7,
        publisherId: users[5].id,
      },
    }),
    prisma.skill.create({
      data: {
        name: '企业咨询与数字化转型',
        solution: '为传统企业提供数字化转型咨询服务，包括业务流程梳理、技术架构规划、系统选型建议、实施路径设计等。',
        cases: [
          { title: '制造业数字化', description: '帮助制造企业完成生产管理数字化，效率提升35%' },
          { title: '零售数字化', description: '为连锁零售企业设计全渠道数字化方案' },
        ],
        priceType: 'daily',
        priceMin: 5000,
        priceMax: 15000,
        category: '咨询服务',
        tags: ['数字化转型', '企业咨询', '架构规划'],
        industries: ['制造业', '零售', '物流'],
        scenarios: ['数字化规划', '系统选型', '流程优化'],
        teamIntro: '2人咨询团队，10年+企业服务经验',
        teamSize: 2,
        location: '北京',
        status: 'published',
        viewCount: 134,
        matchCount: 4,
        publisherId: users[3].id,
      },
    }),
    prisma.skill.create({
      data: {
        name: '短视频内容制作与运营',
        solution: '提供短视频全流程服务，包括脚本策划、拍摄制作、后期剪辑、账号运营、数据分析。支持抖音、快手、小红书等平台。',
        cases: [
          { title: '美妆品牌短视频', description: '为美妆品牌打造短视频矩阵，单月播放量破亿' },
          { title: '知识IP孵化', description: '帮助行业专家打造知识IP，粉丝突破100万' },
        ],
        priceType: 'range',
        priceMin: 20000,
        priceMax: 100000,
        category: '运营支持',
        tags: ['短视频', '内容制作', '账号运营'],
        industries: ['美妆', '教育', '消费品'],
        scenarios: ['品牌短视频', 'IP孵化', '内容运营'],
        teamIntro: '8人内容团队，覆盖策划、拍摄、剪辑、运营',
        teamSize: 8,
        location: '上海',
        status: 'published',
        viewCount: 456,
        matchCount: 11,
        publisherId: users[4].id,
      },
    }),
  ]);

  console.log(`✅ Created ${skills.length} skills`);

  // Create some match records
  const matchRecords = await Promise.all([
    // Matches for project[0] (短视频内容运营平台开发)
    prisma.matchRecord.create({
      data: {
        projectId: projects[0].id,
        skillId: skills[1].id, // AI解决方案
        fromUserId: users[0].id,
        toUserId: users[3].id,
        score: 0.90,
        status: 'recommended',
      },
    }),
    prisma.matchRecord.create({
      data: {
        projectId: projects[0].id,
        skillId: skills[0].id, // 全栈Web开发
        fromUserId: users[0].id,
        toUserId: users[3].id,
        score: 0.93,
        status: 'recommended',
      },
    }),
    prisma.matchRecord.create({
      data: {
        projectId: projects[0].id,
        skillId: skills[3].id, // 数字营销
        fromUserId: users[0].id,
        toUserId: users[4].id,
        score: 0.90,
        status: 'recommended',
      },
    }),
    prisma.matchRecord.create({
      data: {
        projectId: projects[0].id,
        skillId: skills[2].id, // UI/UX设计
        fromUserId: users[0].id,
        toUserId: users[4].id,
        score: 0.90,
        status: 'recommended',
      },
    }),
    prisma.matchRecord.create({
      data: {
        projectId: projects[0].id,
        skillId: skills[4].id, // 微信小程序
        fromUserId: users[0].id,
        toUserId: users[5].id,
        score: 0.98,
        status: 'recommended',
      },
    }),
  ]);

  console.log(`✅ Created ${matchRecords.length} match records`);

  console.log('🎉 Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
