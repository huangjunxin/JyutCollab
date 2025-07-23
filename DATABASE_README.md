本项目的数据库的结构如下所示：

作为全栈工程师，我来设计完整的数据库表结构。基于粤语众包平台的需求，以下是详细的 **PostgreSQL 数据库设计**：

---

## 🗄️ **完整数据库表设计**

### **1. 用户管理模块**

#### **1.1 users 表 (用户基础信息)**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  display_name VARCHAR(100),
  avatar_url TEXT,
  location VARCHAR(100),           -- 用户所在地区 (如"香港""广州""台山")
  native_dialect VARCHAR(50),      -- 母语方言 (如"香港话""广州话""台山话")
  role VARCHAR(20) DEFAULT 'contributor', -- 'contributor', 'moderator', 'admin'
  bio TEXT,                        -- 个人简介
  contribution_count INTEGER DEFAULT 0,   -- 贡献词条数量
  review_count INTEGER DEFAULT 0,         -- 审核数量 (仅管理员)
  email_verified BOOLEAN DEFAULT false,   -- 邮箱是否已验证
  email_verification_token VARCHAR(255),  -- 邮箱验证令牌
  email_verification_expires TIMESTAMP WITH TIME ZONE, -- 邮箱验证令牌过期时间
  password_reset_token VARCHAR(255),      -- 密码重置令牌
  password_reset_expires TIMESTAMP WITH TIME ZONE,     -- 密码重置令牌过期时间
  last_login_at TIMESTAMP WITH TIME ZONE, -- 最后登录时间
  login_attempts INTEGER DEFAULT 0,       -- 登录尝试次数
  account_locked_until TIMESTAMP WITH TIME ZONE, -- 账户锁定到期时间
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- 索引
CREATE INDEX idx_users_location ON users(location);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email_verified ON users(email_verified);
CREATE INDEX idx_users_email_verification_token ON users(email_verification_token);
CREATE INDEX idx_users_password_reset_token ON users(password_reset_token);
```

#### **1.2 user_achievements 表 (用户成就系统)**
```sql
CREATE TABLE user_achievements (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  achievement_type VARCHAR(50) NOT NULL, -- 'first_contribution', 'expert_contributor', 'regional_champion'
  achievement_name VARCHAR(100) NOT NULL,
  description TEXT,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB                    -- 存储额外信息，如达成条件等
);

-- 索引
CREATE INDEX idx_achievements_user ON user_achievements(user_id);
CREATE INDEX idx_achievements_type ON user_achievements(achievement_type);
```

#### **1.3 用户会话表（用于JWT token管理）**
```sql
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token_hash ON user_sessions(token_hash);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
```

---

### **2. 主题分类模块**

#### **2.1 themes 表 (主题分类树)**
```sql
CREATE TABLE themes (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  name_en VARCHAR(100),             -- 英文名称
  name_traditional VARCHAR(100),    -- 繁体中文名称
  parent_id INTEGER REFERENCES themes(id) ON DELETE CASCADE,
  description TEXT,
  level INTEGER NOT NULL DEFAULT 1, -- 分类层级 (1=顶级, 2=二级...)
  sort_order INTEGER DEFAULT 0,     -- 同级排序
  icon VARCHAR(50),                 -- 图标名称 (用于前端显示)
  color VARCHAR(7),                 -- 主题色 (#hex格式)
  is_active BOOLEAN DEFAULT true,
  expression_count INTEGER DEFAULT 0, -- 该主题下词条数量 (冗余字段，便于统计)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_themes_parent ON themes(parent_id);
CREATE INDEX idx_themes_level ON themes(level);
CREATE INDEX idx_themes_active ON themes(is_active);

-- 示例数据
INSERT INTO themes (name, name_en, description, level) VALUES
('饮食', 'Food & Dining', '与食物、用餐相关的表达', 1),
('情感', 'Emotions', '表达情绪、感受的词汇', 1),
('日常生活', 'Daily Life', '日常生活场景用语', 1);

INSERT INTO themes (name, parent_id, level) VALUES
('粤菜', 1, 2),
('茶餐厅', 1, 2),
('喜悦', 2, 2),
('愤怒', 2, 2);
```

---

### **3. 核心词条模块**

#### **3.1 expressions 表 (粤语表达主表)**
```sql
CREATE TABLE expressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id_l1 INTEGER REFERENCES themes(id), -- 一级主题ID
  theme_id_l2 INTEGER REFERENCES themes(id), -- 二级主题ID  
  theme_id_l3 INTEGER REFERENCES themes(id), -- 三级主题ID (最具体的分类)
  text VARCHAR(500) NOT NULL,       -- 粤语表达原文
  text_normalized VARCHAR(500),     -- 标准化后的文本 (用于搜索)
  region VARCHAR(50) NOT NULL,      -- 地区 ('guangzhou', 'hongkong', 'taishan', 'overseas')
  definition TEXT,                  -- 释义
  usage_notes TEXT,                 -- 使用说明/语境提示
  formality_level VARCHAR(20),      -- 正式程度 ('formal', 'informal', 'slang', 'vulgar')
  frequency VARCHAR(20),            -- 使用频率 ('common', 'uncommon', 'rare', 'obsolete')
  
  -- 发音信息
  phonetic_notation VARCHAR(200),   -- 音标 (粤拼/IPA)
  notation_system VARCHAR(20) DEFAULT 'jyutping', -- 'jyutping', 'ipa', 'yale'
  audio_url TEXT,                   -- 语音文件URL
  pronunciation_verified BOOLEAN DEFAULT false, -- 发音是否经过验证
  
  -- 贡献者信息
  contributor_id UUID NOT NULL REFERENCES users(id),
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 审核状态
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'needs_revision'
  reviewer_id UUID REFERENCES users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  
  -- 统计信息
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  report_count INTEGER DEFAULT 0,
  
  -- 时间戳
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_expressions_theme_l1 ON expressions(theme_id_l1);
CREATE INDEX idx_expressions_theme_l2 ON expressions(theme_id_l2);
CREATE INDEX idx_expressions_theme_l3 ON expressions(theme_id_l3);
CREATE INDEX idx_expressions_region ON expressions(region);
CREATE INDEX idx_expressions_status ON expressions(status);
CREATE INDEX idx_expressions_contributor ON expressions(contributor_id);
CREATE INDEX idx_expressions_text_search ON expressions USING gin(to_tsvector('simple', text || ' ' || COALESCE(definition, '')));

-- 主题层级说明：
-- theme_id_l1: 一级主题（如"饮食"、"情感"）
-- theme_id_l2: 二级主题（如"粤菜"、"茶餐厅"）  
-- theme_id_l3: 三级主题（最具体的分类，如"点心"、"炒菜"）
-- 
-- 优势：
-- 1. 支持按任意级别快速筛选和统计
-- 2. 避免复杂的递归查询
-- 3. 提高查询性能，无需JOIN themes表
-- 4. 便于前端多级导航和面包屑显示
```

#### **3.2 expression_examples 表 (例句)**
```sql
CREATE TABLE expression_examples (
  id SERIAL PRIMARY KEY,
  expression_id UUID NOT NULL REFERENCES expressions(id) ON DELETE CASCADE,
  example_text TEXT NOT NULL,       -- 例句原文
  translation TEXT,                 -- 普通话/英文翻译
  context TEXT,                     -- 使用语境说明
  source VARCHAR(100),              -- 来源 ('user_generated', 'ai_generated', 'literature', 'media')
  contributor_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_featured BOOLEAN DEFAULT false -- 是否精选例句
);

-- 索引
CREATE INDEX idx_examples_expression ON expression_examples(expression_id);
```

### **4. AI辅助与质量控制**

#### **4.1 ai_suggestions 表 (AI建议记录)**
```sql
CREATE TABLE ai_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expression_id UUID REFERENCES expressions(id) ON DELETE CASCADE,
  suggestion_type VARCHAR(30) NOT NULL, -- 'theme_classification', 'definition', 'example', 'spelling_check'
  original_content TEXT,            -- 原始内容
  suggested_content TEXT,           -- AI建议内容
  confidence_score DECIMAL(3,2),
  model_name VARCHAR(50),           -- 使用的AI模型
  prompt_version VARCHAR(20),       -- 提示词版本 (便于A/B测试)
  user_action VARCHAR(20),          -- 用户操作 ('accepted', 'rejected', 'modified', 'pending')
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_ai_suggestions_expression ON ai_suggestions(expression_id);
CREATE INDEX idx_ai_suggestions_type ON ai_suggestions(suggestion_type);
```

---

### **6. 社区互动模块**

#### **6.1 user_interactions 表 (用户互动)**
```sql
CREATE TABLE user_interactions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expression_id UUID NOT NULL REFERENCES expressions(id) ON DELETE CASCADE,
  interaction_type VARCHAR(20) NOT NULL, -- 'like', 'bookmark', 'report', 'view'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, expression_id, interaction_type)
);

-- 索引
CREATE INDEX idx_interactions_user ON user_interactions(user_id);
CREATE INDEX idx_interactions_expression ON user_interactions(expression_id);
CREATE INDEX idx_interactions_type ON user_interactions(interaction_type);
```

#### **6.2 reports 表 (举报管理)**
```sql
CREATE TABLE reports (
  id SERIAL PRIMARY KEY,
  reporter_id UUID NOT NULL REFERENCES users(id),
  expression_id UUID NOT NULL REFERENCES expressions(id) ON DELETE CASCADE,
  report_type VARCHAR(30) NOT NULL, -- 'inappropriate', 'incorrect', 'duplicate', 'spam'
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'resolved', 'dismissed'
  handled_by UUID REFERENCES users(id),
  handled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_expression ON reports(expression_id);
```

---

### **7. 系统配置与统计**

#### **7.1 system_settings 表 (系统配置)**
```sql
CREATE TABLE system_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  data_type VARCHAR(20) DEFAULT 'string', -- 'string', 'number', 'boolean', 'json'
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

-- 示例配置
INSERT INTO system_settings (key, value, description) VALUES
('min_expression_length', '2', '词条最小字符数'),
('max_expression_length', '100', '词条最大字符数'),
('ai_confidence_threshold', '0.7', 'AI建议的最低置信度'),
('enable_auto_approval', 'false', '是否启用自动审批');
```

#### **7.2 statistics 表 (统计数据)**
```sql
CREATE TABLE statistics (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  metric_name VARCHAR(50) NOT NULL,
  metric_value INTEGER NOT NULL,
  region VARCHAR(50),
  theme_id INTEGER REFERENCES themes(id), -- 可以是任意级别的主题ID
  theme_level INTEGER,                    -- 主题级别 (1, 2, 3)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(date, metric_name, region, theme_id, theme_level)
);

-- 索引
CREATE INDEX idx_statistics_date ON statistics(date);
CREATE INDEX idx_statistics_metric ON statistics(metric_name);
```
