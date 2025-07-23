'use client';

import Link from 'next/link';
import { Mail, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { useState } from 'react';

export default function CheckEmailPage() {
  const { signUp } = useAuth();
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleResendEmail = async () => {
    setResending(true);
    // 这里可以添加重发邮件的逻辑
    setTimeout(() => {
      setResending(false);
      setResent(true);
    }, 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cantonese-50 to-orange-50 px-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg border-2 border-cantonese-500">
              <span className="drop-shadow-lg text-shadow-lg">粤</span>
            </div>
            <span className="font-bold text-2xl text-foreground">JyutCollab</span>
          </Link>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="h-8 w-8 text-blue-600" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            检查您的邮箱
          </h2>

          <p className="text-gray-600 mb-6">
            我们已经向您的邮箱发送了一封确认邮件。请点击邮件中的链接来验证您的账户。
          </p>

          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h4 className="text-sm font-medium text-blue-800 mb-2">没有收到邮件？</h4>
              <ul className="text-sm text-blue-700 space-y-1 text-left">
                <li>• 检查您的垃圾邮件文件夹</li>
                <li>• 确认邮箱地址拼写正确</li>
                <li>• 等待几分钟，邮件可能需要一些时间才能到达</li>
              </ul>
            </div>

            <Button
              onClick={handleResendEmail}
              disabled={resending || resent}
              variant="outline"
              className="w-full"
            >
              {resending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  重新发送中...
                </>
              ) : resent ? (
                '邮件已重新发送'
              ) : (
                '重新发送确认邮件'
              )}
            </Button>

            <div className="pt-4 border-t">
              <Button variant="ghost" asChild className="w-full">
                <Link href="/auth/login">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  返回登录页面
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Help Text */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            如果您持续遇到问题，请{' '}
            <Link href="/contact" className="text-cantonese-600 hover:text-cantonese-500">
              联系我们的支持团队
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
} 