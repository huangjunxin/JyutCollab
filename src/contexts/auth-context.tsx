'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, RegisterData, LoginData } from '@/lib/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (data: RegisterData) => Promise<{ user?: User; error?: string; token?: string }>;
  signIn: (data: LoginData) => Promise<{ user?: User; error?: string; token?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 从本地存储获取token
  const getStoredToken = (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  };

  // 保存token到本地存储
  const setStoredToken = (token: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  };

  // 清除本地存储的token
  const clearStoredToken = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  };

  // 验证token并获取用户信息
  const validateToken = async (token: string): Promise<User | null> => {
    try {
      // 检查token格式
      if (!token || token.split('.').length !== 3) {
        clearStoredToken();
        return null;
      }

      // 解析token检查是否过期
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        clearStoredToken();
        return null;
      }

      // 通过API验证token并获取用户信息
      const response = await fetch('/api/auth/user', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        clearStoredToken();
        return null;
      }

      const data = await response.json();
      return data.user;
    } catch (error) {
      console.error('Token validation error:', error);
      clearStoredToken();
      return null;
    }
  };

  // 初始化认证状态
  useEffect(() => {
    const initAuth = async () => {
      const token = getStoredToken();
      
      if (token) {
        const user = await validateToken(token);
        setUser(user);
      }
      
      setLoading(false);
    };

    initAuth();
  }, []);

  // 注册
  const signUp = async (data: RegisterData) => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      
      if (response.ok && result.user && result.token) {
        setStoredToken(result.token);
        setUser(result.user);
        return { user: result.user, token: result.token };
      } else {
        return { error: result.error || '注册失败' };
      }
    } catch (error: unknown) {
      return { error: error.message || '注册失败' };
    } finally {
      setLoading(false);
    }
  };

  // 登录
  const signIn = async (data: LoginData) => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      
      if (response.ok && result.user && result.token) {
        setStoredToken(result.token);
        setUser(result.user);
        return { user: result.user, token: result.token };
      } else {
        return { error: result.error || '登录失败' };
      }
    } catch (error: unknown) {
      return { error: error.message || '登录失败' };
    } finally {
      setLoading(false);
    }
  };

  // 登出
  const signOut = async () => {
    const token = getStoredToken();
    
    if (token) {
      // 可以在这里调用logout API，但现在先简单清除本地状态
      try {
        // 可以添加 logout API 调用
        // await fetch('/api/auth/logout', {
        //   method: 'POST',
        //   headers: {
        //     'Authorization': `Bearer ${token}`,
        //   },
        // });
      } catch (error) {
        console.error('Logout API error:', error);
      }
    }
    
    // 清除本地状态
    clearStoredToken();
    setUser(null);
  };

  // 重置密码
  const resetPassword = async (email: string) => {
    // 这里应该调用 requestPasswordReset 函数
    // 暂时返回成功状态
    return { success: true };
  };

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 