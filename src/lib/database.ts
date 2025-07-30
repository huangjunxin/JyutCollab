import { createClient } from '@supabase/supabase-js';
import type { User } from '@/types';

// Type for Supabase query builders
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseQuery = any;

// Supabase 配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 客户端实例（用于用户操作）
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// 数据库表定义
export const Tables = {
  USERS: 'users',
  THEMES: 'themes',
  EXPRESSIONS: 'expressions',
  EXPRESSION_DEFINITIONS: 'expression_definitions',
  EXPRESSION_PRONUNCIATIONS: 'expression_pronunciations',
  EXPRESSION_EXAMPLES: 'expression_examples',
  AI_SUGGESTIONS: 'ai_suggestions',
  USER_INTERACTIONS: 'user_interactions',
  USER_ACHIEVEMENTS: 'user_achievements',
  REPORTS: 'reports'
} as const;

// 辅助函数：处理数据库错误
export function handleDatabaseError(error: unknown): string {
  console.error('Database error:', error);
  
  if (error && typeof error === 'object' && 'code' in error) {
    if (error.code === 'PGRST301') {
      return '您没有权限执行此操作';
    }
    
    if (error.code === '23505') {
      return '数据已存在，请检查是否重复提交';
    }
    
    if (error.code === '23503') {
      return '相关数据不存在，请检查关联信息';
    }
  }
  
  return (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') 
    ? error.message 
    : '数据库操作失败，请稍后重试';
}

// 辅助函数：构建搜索查询
export function buildSearchQuery(baseQuery: SupabaseQuery, searchTerm?: string, searchFields: string[] = []) {
  if (!searchTerm || searchFields.length === 0) {
    return baseQuery;
  }
  
  // 使用 PostgreSQL 全文搜索
  const searchConditions = searchFields
    .map(field => `${field}.ilike.%${searchTerm}%`)
    .join(',');
    
  return baseQuery.or(searchConditions);
}

// 辅助函数：应用筛选器
export function applyFilters(query: SupabaseQuery, filters: Record<string, unknown>) {
  let filteredQuery = query;
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        filteredQuery = filteredQuery.in(key, value);
      } else {
        filteredQuery = filteredQuery.eq(key, value);
      }
    }
  });
  
  return filteredQuery;
}

// 辅助函数：应用分页
export function applyPagination(query: SupabaseQuery, page: number = 1, perPage: number = 20) {
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  
  return query.range(from, to);
}

// 辅助函数：应用排序
export function applySorting(query: SupabaseQuery, sortBy?: string, sortOrder: 'asc' | 'desc' = 'desc') {
  if (!sortBy) {
    return query.order('created_at', { ascending: sortOrder === 'asc' });
  }
  
  return query.order(sortBy, { ascending: sortOrder === 'asc' });
}

// 实时订阅辅助函数
export function subscribeToTable(
  tableName: string,
  callback: (payload: unknown) => void,
  filter?: string
) {
  const channel = supabase
    .channel(`${tableName}_changes`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: tableName,
        filter: filter
      },
      callback
    )
    .subscribe();
    
  return () => {
    supabase.removeChannel(channel);
  };
}

// 获取当前用户信息
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }
  
  // 获取用户详细信息
  const { data: userProfile, error: profileError } = await supabase
    .from(Tables.USERS)
    .select('*')
    .eq('id', user.id)
    .single();
    
  if (profileError) {
    console.error('Error fetching user profile:', profileError);
    return null;
  }
  
  return userProfile;
}

// 检查用户权限
export function checkUserPermission(user: User | null, requiredRole: 'contributor' | 'moderator' | 'admin'): boolean {
  if (!user) return false;
  
  const roleHierarchy = {
    'contributor': 1,
    'moderator': 2,
    'admin': 3
  };
  
  return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
} 