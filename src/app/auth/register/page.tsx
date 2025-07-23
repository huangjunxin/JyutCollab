'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, Loader2, Mail, Lock, User, MapPin, Check } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
    display_name: '',
    location: '',
    native_dialect: '',
  });
  const [error, setError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);

  // 密码强度检查
  const checkPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.match(/[a-z]/)) strength++;
    if (password.match(/[A-Z]/)) strength++;
    if (password.match(/[0-9]/)) strength++;
    if (password.match(/[^a-zA-Z0-9]/)) strength++;
    return strength;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // 验证
    if (formData.password !== formData.confirmPassword) {
      setError('两次输入的密码不匹配');
      setIsLoading(false);
      return;
    }

    if (passwordStrength < 3) {
      setError('密码强度不够，请包含大小写字母、数字或特殊字符');
      setIsLoading(false);
      return;
    }

    try {
      const result = await signUp({
        email: formData.email,
        password: formData.password,
        username: formData.username,
        display_name: formData.display_name,
        location: formData.location,
        native_dialect: formData.native_dialect,
      });
      
      if (result.error) {
        setError(result.error);
      } else {
        // 注册成功，显示邮箱确认提示
        router.push('/auth/check-email');
      }
    } catch (err) {
      setError('注册时发生未知错误');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // 当地区改变时，自动更新母语方言
    if (name === 'location') {
      setFormData(prev => ({
        ...prev,
        location: value,
        native_dialect: value.trim() ? value + '话' : ''
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    // 更新密码强度
    if (name === 'password') {
      setPasswordStrength(checkPasswordStrength(value));
    }
  };

  const getStrengthColor = (strength: number) => {
    if (strength < 2) return 'bg-red-500';
    if (strength < 4) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStrengthText = (strength: number) => {
    if (strength < 2) return '弱';
    if (strength < 4) return '中等';
    return '强';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cantonese-50 to-orange-50 px-4 py-12">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg border-2 border-cantonese-500">
              <span className="drop-shadow-lg">粤</span>
            </div>
            <span className="font-bold text-2xl text-foreground">JyutCollab</span>
          </Link>
          
          <h2 className="text-3xl font-bold text-foreground">创建账户</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            加入粤语传承的社区
          </p>
        </div>

        {/* Register Form */}
        <div className="bg-card rounded-lg shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Email */}
            <div>
                              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                  邮箱地址 *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="pl-10"
                  placeholder="your.email@example.com"
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            {/* Username */}
            <div>
                              <label htmlFor="username" className="block text-sm font-medium text-foreground mb-2">
                  用户名 *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  className="pl-8"
                  placeholder="username"
                  value={formData.username}
                  onChange={handleInputChange}
                />
              </div>
                              <p className="mt-1 text-xs text-muted-foreground">用户名只能包含字母、数字和下划线</p>
            </div>

            {/* Display Name */}
            <div>
                              <label htmlFor="display_name" className="block text-sm font-medium text-foreground mb-2">
                  显示名称
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="display_name"
                  name="display_name"
                  type="text"
                  autoComplete="name"
                  className="pl-10"
                  placeholder="请输入您的显示名称"
                  value={formData.display_name}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            {/* Location */}
            <div>
                              <label htmlFor="location" className="block text-sm font-medium text-foreground mb-2">
                  所在地区 *
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="location"
                  name="location"
                  type="text"
                  required
                  className="pl-10"
                  placeholder="如：香港、广州、台山等"
                  value={formData.location}
                  onChange={handleInputChange}
                />
              </div>
                              <p className="mt-1 text-xs text-muted-foreground">请输入您的所在地区，母语方言点将自动填充</p>
            </div>

            {/* Native Dialect */}
            <div>
                              <label htmlFor="native_dialect" className="block text-sm font-medium text-foreground mb-2">
                母语方言点 *
              </label>
              <Input
                id="native_dialect"
                name="native_dialect"
                type="text"
                required
                placeholder="如：香港话、广州话、台山话等"
                value={formData.native_dialect}
                onChange={handleInputChange}
              />
                              <p className="mt-1 text-xs text-muted-foreground">会根据地区自动填充，您可以进一步修改</p>
            </div>

            {/* Password */}
            <div>
                              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                  密码 *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  className="pl-10 pr-10"
                  placeholder="请输入密码"
                  value={formData.password}
                  onChange={handleInputChange}
                />
                                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              
              {/* Password Strength */}
              {formData.password && (
                <div className="mt-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all ${getStrengthColor(passwordStrength)}`}
                        style={{ width: `${(passwordStrength / 5) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      密码强度: {getStrengthText(passwordStrength)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
                              <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-2">
                  确认密码 *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  className="pl-10 pr-10"
                  placeholder="请再次输入密码"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                />
                                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="mt-1 text-xs text-red-600">密码不匹配</p>
              )}
              {formData.confirmPassword && formData.password === formData.confirmPassword && (
                <div className="mt-1 flex items-center text-xs text-green-600">
                  <Check className="h-3 w-3 mr-1" />
                  密码匹配
                </div>
              )}
            </div>

            {/* Terms */}
            <div className="flex items-start">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                required
                className="h-4 w-4 text-cantonese-600 focus:ring-cantonese-500 border-gray-300 rounded mt-0.5"
              />
                              <label htmlFor="terms" className="ml-2 block text-sm text-foreground">
                我同意{' '}
                <Link href="/terms" className="text-cantonese-600 hover:text-cantonese-500">
                  服务条款
                </Link>
                {' '}和{' '}
                <Link href="/privacy" className="text-cantonese-600 hover:text-cantonese-500">
                  隐私政策
                </Link>
              </label>
            </div>

            {/* Submit Button */}
            <div>
              <Button
                type="submit"
                className="w-full bg-cantonese-600 hover:bg-cantonese-700"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    注册中...
                  </>
                ) : (
                  '创建账户'
                )}
              </Button>
            </div>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              已有账户？{' '}
              <Link href="/auth/login" className="font-medium text-cantonese-600 hover:text-cantonese-500">
                立即登录
              </Link>
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="text-center">
          <div className="flex justify-center gap-4 text-xs text-muted-foreground">
            <Badge variant="secondary" className="bg-cantonese-100 text-cantonese-800">
              🎯 AI 智能分类
            </Badge>
            <Badge variant="secondary" className="bg-cantonese-100 text-cantonese-800">
              🌍 多方言支持
            </Badge>
            <Badge variant="secondary" className="bg-cantonese-100 text-cantonese-800">
              👥 社区驱动
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
} 