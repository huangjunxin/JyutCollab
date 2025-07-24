# JyutCollab - 粤语多音节词众包平台

**传承粤语之美，共建文化宝库**

JyutCollab 是一个概念驱动的粤语多音节词众包平台，通过 AI 辅助和社区协作，构建最全面的粤语表达数据库。

## ✨ 核心特性

- 🤖 **AI 智能辅助**: 使用 GPT-4 进行自动分类、释义生成和例句创建
- 🌏 **跨方言支持**: 支持广州话、香港话、台山话等多个方言点
- 👥 **社区驱动**: 开放的贡献机制和专业的审核流程
- 🔍 **智能搜索**: 全文搜索和语义搜索结合
- 📱 **响应式设计**: 完美适配桌面和移动设备
- 🎯 **概念分类**: 基于主题的层级分类系统

## 🚀 技术栈

### 前端
- **Next.js 14** - React 全栈框架（App Router）
- **TypeScript** - 类型安全的 JavaScript
- **Tailwind CSS** - 现代化的 CSS 框架
- **Radix UI** - 无障碍的组件库
- **Lucide React** - 优雅的图标库

### 后端
- **Supabase** - 开源的 Firebase 替代品
  - PostgreSQL 数据库
  - 实时订阅
  - 用户认证
  - 行级安全（RLS）

### AI 集成
- **OpenAI API** - GPT-4o 和 GPT-4o-mini
- **Vercel AI SDK** - 流式响应和结构化输出
- **Zod** - 数据验证和类型推断

### 部署
- **Vercel** - 全球 CDN 和边缘计算
- **环境变量管理** - 安全的配置管理

## 📁 项目结构

```
jyutcollab/
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── (auth)/             # 认证相关页面
│   │   ├── browse/             # 浏览词条页面
│   │   ├── contribute/         # 贡献词条页面
│   │   ├── api/                # API 路由
│   │   │   ├── llm/           # LLM 相关 API
│   │   │   └── expressions/   # 词条相关 API
│   │   ├── globals.css        # 全局样式
│   │   ├── layout.tsx         # 根布局
│   │   └── page.tsx           # 首页
│   ├── components/            # React 组件
│   │   ├── ui/               # 基础 UI 组件
│   │   ├── forms/            # 表单组件
│   │   ├── layout/           # 布局组件
│   │   └── data-display/     # 数据展示组件
│   ├── lib/                  # 工具库
│   │   ├── database.ts       # Supabase 配置
│   │   ├── llm.ts           # AI 集成
│   │   └── utils.ts         # 通用工具
│   ├── types/               # TypeScript 类型定义
│   └── data/                # 静态数据
├── public/                  # 静态资源
├── tailwind.config.ts      # Tailwind 配置
├── next.config.ts          # Next.js 配置
└── package.json            # 依赖管理
```

## 🛠️ 开发环境设置

### 前置要求

- Node.js 18+ (推荐使用 NVM)
- npm 或 yarn
- Git

### 快速开始

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd jyutcollab
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **环境配置**
   
   创建 `.env.local` 文件：
   ```bash
   cp .env.local.example .env.local
   ```
   
   配置以下环境变量：
   ```env
   # Supabase 配置
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   
   # OpenRouter 配置
   OPENROUTER_API_KEY=your_openrouter_api_key
   
   # 站点信息
   NEXT_PUBLIC_SITE_URL=http://localhost:3001
   NEXT_PUBLIC_SITE_NAME=JyutCollab
   
   # 应用配置
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **启动开发服务器**
   ```bash
   npm run dev
   ```
   
   打开 [http://localhost:3000](http://localhost:3000) 查看应用。

## 🗄️ 数据库设计

### 核心表结构

1. **users** - 用户信息
2. **themes** - 主题分类（支持层级结构）
3. **expressions** - 粤语表达主表
4. **expression_pronunciations** - 发音信息
5. **expression_examples** - 例句
6. **ai_suggestions** - AI 建议记录
7. **user_interactions** - 用户交互（点赞、收藏等）

### 数据库初始化

1. 在 Supabase 中创建新项目
2. 执行 `database/schema.sql` 创建表结构
3. 导入 `database/seed.sql` 初始化示例数据
4. 配置行级安全策略（RLS）

## 🤖 AI 功能

### 支持的 AI 操作

1. **自动分类** - 根据词条内容推荐合适的主题分类
2. **释义生成** - 生成准确的中文释义和使用说明
3. **例句创建** - 生成自然地道的使用例句
4. **拼写检查** - 检查粤语表达的拼写和用字

### 成本控制

- 使用 GPT-4o-mini 处理简单任务（分类、拼写检查）
- 使用 GPT-4o 处理复杂任务（释义、例句生成）
- 实现响应缓存，避免重复调用
- 置信度阈值控制，只有高质量的建议才会被采纳

## 📝 开发指南

### 代码规范

- 使用 TypeScript 编写所有代码
- 组件使用 PascalCase 命名
- 文件使用 kebab-case 命名
- 遵循 ESLint 规则

### 组件开发

1. **UI 组件** - 放在 `src/components/ui/`
2. **业务组件** - 放在对应的功能目录
3. **使用 Tailwind CSS** - 样式优先使用 Tailwind
4. **响应式设计** - 确保所有组件在移动端正常显示

### API 开发

1. **RESTful 设计** - 遵循 REST 规范
2. **错误处理** - 统一的错误响应格式
3. **类型安全** - 使用 TypeScript 定义请求/响应类型
4. **认证授权** - 集成 Supabase Auth

## 🚀 部署

### Vercel 部署

1. 连接 GitHub 仓库到 Vercel
2. 配置环境变量
3. 自动部署（Git push 触发）

### 环境变量配置

在 Vercel 项目设置中添加：
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `OPENROUTER_API_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SITE_NAME`

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

### 贡献类型

- 🐛 Bug 修复
- ✨ 新功能
- 📝 文档更新
- 🎨 UI/UX 改进
- ⚡ 性能优化
- 🔧 重构

## 📊 项目状态

- ✅ 基础架构搭建
- ✅ UI 组件库
- ✅ 数据库设计
- ✅ AI 集成
- 🚧 用户认证
- 🚧 词条管理
- 🚧 搜索功能
- 📋 移动端优化
- 📋 性能优化

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [Next.js](https://nextjs.org/) - 强大的 React 框架
- [Supabase](https://supabase.com/) - 优秀的开源 BaaS
- [Tailwind CSS](https://tailwindcss.com/) - 现代化的 CSS 框架
- [Radix UI](https://www.radix-ui.com/) - 无障碍组件库

## 📞 联系我们

- 项目主页: [GitHub](https://github.com/your-username/jyutcollab)
- 邮箱: contact@jyutcollab.com
- 讨论: [GitHub Discussions](https://github.com/your-username/jyutcollab/discussions)

---

**让我们一起传承粤语文化，共建文化宝库！** 🎯
