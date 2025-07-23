// 用户相关类型
export interface User {
  id: string;
  email: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  location?: string;
  native_dialect?: string;
  role: 'contributor' | 'moderator' | 'admin';
  bio?: string;
  contribution_count: number;
  review_count: number;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface UserAchievement {
  id: number;
  user_id: string;
  achievement_type: string;
  achievement_name: string;
  description?: string;
  earned_at: string;
  metadata?: Record<string, any>;
}

// 主题分类类型
export interface Theme {
  id: number;
  name: string;
  name_en?: string;
  name_traditional?: string;
  parent_id?: number;
  description?: string;
  level: number;
  sort_order: number;
  icon?: string;
  color?: string;
  is_active: boolean;
  expression_count: number;
  created_at: string;
  updated_at: string;
  children?: Theme[];
}

// 词条相关类型
export interface Expression {
  id: string;
  theme_id_l1?: number;  // 一级主题ID
  theme_id_l2?: number;  // 二级主题ID  
  theme_id_l3?: number;  // 三级主题ID (最具体的分类)
  text: string;
  text_normalized?: string;
  region: 'guangzhou' | 'hongkong' | 'taishan' | 'overseas';
  definition?: string;
  usage_notes?: string;
  formality_level?: 'formal' | 'informal' | 'slang' | 'vulgar';
  frequency?: 'common' | 'uncommon' | 'rare' | 'obsolete';
  
  // 发音信息 (已从单独的表合并到主表)
  phonetic_notation?: string;     // 音标 (粤拼/IPA)
  notation_system?: 'jyutping' | 'ipa' | 'yale';  // 标音系统
  audio_url?: string;             // 语音文件URL
  pronunciation_verified?: boolean; // 发音是否经过验证
  
  contributor_id: string;
  submitted_at: string;
  status: 'pending' | 'approved' | 'rejected' | 'needs_revision';
  reviewer_id?: string;
  reviewed_at?: string;
  review_notes?: string;
  view_count: number;
  like_count: number;
  report_count: number;
  created_at: string;
  updated_at: string;
  
  // 关联数据
  contributor?: User;
  reviewer?: User;
  theme_l1?: Theme;    // 一级主题对象
  theme_l2?: Theme;    // 二级主题对象
  theme_l3?: Theme;    // 三级主题对象
  examples?: ExpressionExample[];
}

export interface ExpressionExample {
  id: number;
  expression_id: string;
  example_text: string;
  translation?: string;
  context?: string;
  source: 'user_generated' | 'ai_generated' | 'literature' | 'media';
  contributor_id?: string;
  created_at: string;
  is_featured: boolean;
}

// AI 相关类型
export interface AISuggestion {
  id: string;
  expression_id?: string;
  suggestion_type: 'theme_classification' | 'definition' | 'example' | 'spelling_check';
  original_content?: string;
  suggested_content: string;
  confidence_score: number;
  model_name: string;
  prompt_version: string;
  user_action: 'accepted' | 'rejected' | 'modified' | 'pending';
  created_at: string;
}

export interface ValidationLog {
  id: number;
  expression_id?: string;
  validation_type: 'pronunciation' | 'character' | 'tone';
  character_checked?: string;
  region?: string;
  expected_value?: string;
  actual_value?: string;
  is_valid: boolean;
  error_type?: string;
  created_at: string;
}

// 用户交互类型
export interface UserInteraction {
  id: number;
  user_id: string;
  expression_id: string;
  interaction_type: 'like' | 'bookmark' | 'report' | 'view';
  created_at: string;
}

export interface Report {
  id: number;
  reporter_id: string;
  expression_id: string;
  report_type: 'inappropriate' | 'incorrect' | 'duplicate' | 'spam';
  description?: string;
  status: 'pending' | 'resolved' | 'dismissed';
  handled_by?: string;
  handled_at?: string;
  created_at: string;
}

// 表单类型
export interface ExpressionFormData {
  text: string;
  region: Expression['region'];
  theme_id_l1?: number;  // 一级主题ID
  theme_id_l2?: number;  // 二级主题ID
  theme_id_l3?: number;  // 三级主题ID
  definition?: string;
  usage_notes?: string;
  formality_level?: Expression['formality_level'];
  frequency?: Expression['frequency'];
  examples: Array<{
    example_text: string;
    translation?: string;
    context?: string;
  }>;
  pronunciation?: {
    phonetic_notation: string;
    notation_system: 'jyutping' | 'ipa' | 'yale';
    audio_url?: string;
  };
}

// API 响应类型
export interface APIResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// 搜索和筛选类型
export interface SearchFilters {
  query?: string;
  theme_id_l1?: number;  // 一级主题筛选
  theme_id_l2?: number;  // 二级主题筛选
  theme_id_l3?: number;  // 三级主题筛选
  region?: Expression['region'];
  status?: Expression['status'];
  contributor_id?: string;
  formality_level?: Expression['formality_level'];
  frequency?: Expression['frequency'];
  sort_by?: 'created_at' | 'updated_at' | 'view_count' | 'like_count';
  sort_order?: 'asc' | 'desc';
} 