import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// CSS 类名合并
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 格式化日期
export function formatDate(date: string | Date, locale: string = 'zh-CN'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (locale === 'zh-CN') {
    return dateObj.toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  return dateObj.toLocaleString(locale);
}

// 相对时间格式化
export function formatRelativeTime(date: string | Date, locale: string = 'zh-CN'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return '刚刚';
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}分钟前`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}小时前`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays}天前`;
  }
  
  if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7);
    return `${weeks}周前`;
  }
  
  // 超过30天显示具体日期
  return formatDate(dateObj, locale);
}

// 截断文本
export function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) {
    return text;
  }
  
  return text.slice(0, maxLength).trim() + '...';
}

// 高亮搜索关键词
export function highlightSearchTerm(text: string, searchTerm: string): string {
  if (!searchTerm.trim()) {
    return text;
  }
  
  const regex = new RegExp(`(${escapeRegExp(searchTerm)})`, 'gi');
  return text.replace(regex, '<mark class="bg-yellow-200 px-1 rounded">$1</mark>');
}

// 转义正则表达式特殊字符
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 生成随机ID
export function generateId(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// 延迟函数
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 防抖函数
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// 节流函数
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// 深拷贝
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T;
  }
  
  if (obj instanceof Array) {
    return obj.map(item => deepClone(item)) as T;
  }
  
  if (typeof obj === 'object') {
    const cloned = {} as T;
    Object.keys(obj).forEach(key => {
      (cloned as Record<string, unknown>)[key] = deepClone((obj as Record<string, unknown>)[key]);
    });
    return cloned;
  }
  
  return obj;
}

// 获取文件扩展名
export function getFileExtension(filename: string): string {
  const lastDotIndex = filename.lastIndexOf('.');
  return lastDotIndex !== -1 ? filename.slice(lastDotIndex + 1).toLowerCase() : '';
}

// 格式化文件大小
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// 验证邮箱
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// 验证用户名
export function validateUsername(username: string): boolean {
  // 3-20个字符，只允许字母、数字、下划线、中文
  const usernameRegex = /^[\w\u4e00-\u9fa5]{3,20}$/;
  return usernameRegex.test(username);
}

// 区域标签映射
export const REGION_LABELS = {
  'guangzhou': '广州话',
  'hongkong': '香港粤语',
  'taishan': '台山话',
  'overseas': '海外粤语'
} as const;

// 状态标签映射
export const STATUS_LABELS = {
  'pending': '待审核',
  'approved': '已通过',
  'rejected': '已拒绝',
  'needs_revision': '需修改'
} as const;

// 正式程度标签映射
export const FORMALITY_LABELS = {
  'formal': '正式',
  'informal': '非正式',
  'slang': '俚语',
  'vulgar': '粗俗'
} as const;

// 使用频率标签映射
export const FREQUENCY_LABELS = {
  'common': '常用',
  'uncommon': '不常用',
  'rare': '罕见',
  'obsolete': '过时'
} as const;

// 用户角色标签映射
export const ROLE_LABELS = {
  'contributor': '贡献者',
  'moderator': '管理员',
  'admin': '系统管理员'
} as const;

// 获取标签颜色
export function getStatusColor(status: string): string {
  const colors = {
    'pending': 'bg-yellow-100 text-yellow-800',
    'approved': 'bg-green-100 text-green-800',
    'rejected': 'bg-red-100 text-red-800',
    'needs_revision': 'bg-orange-100 text-orange-800'
  };
  
  return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
}

export function getRoleColor(role: string): string {
  const colors = {
    'contributor': 'bg-blue-100 text-blue-800',
    'moderator': 'bg-purple-100 text-purple-800',
    'admin': 'bg-red-100 text-red-800'
  };
  
  return colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800';
}

// 分页计算
export function calculatePagination(total: number, page: number, perPage: number) {
  const totalPages = Math.ceil(total / perPage);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;
  
  return {
    totalPages,
    hasNextPage,
    hasPrevPage,
    startIndex: (page - 1) * perPage + 1,
    endIndex: Math.min(page * perPage, total)
  };
}

// URL 查询参数处理
export function buildQueryString(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  
  return searchParams.toString();
}

export function parseQueryString(queryString: string): Record<string, string> {
  const params = new URLSearchParams(queryString);
  const result: Record<string, string> = {};
  
  params.forEach((value, key) => {
    result[key] = value;
  });
  
  return result;
} 