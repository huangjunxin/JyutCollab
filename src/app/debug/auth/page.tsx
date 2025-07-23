'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/database';

export default function AuthDebugPage() {
  const { user, signUp, signIn, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const testSignUp = async () => {
    setLoading(true);
    addLog('Starting signup test...');
    
    try {
      const result = await signUp({
        email: email,
        password: password,
        username: 'debuguser' + Date.now(),
        full_name: 'Debug User',
        region: 'hongkong',
        native_speaker: false,
      });
      
      if (result.error) {
        addLog(`Signup error: ${result.error}`);
      } else {
        addLog('Signup successful!');
      }
    } catch (err: any) {
      addLog(`Signup failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testSignIn = async () => {
    setLoading(true);
    addLog('Starting signin test...');
    
    try {
      const result = await signIn({
        email: email,
        password: password,
      });
      
      if (result.error) {
        addLog(`Signin error: ${result.error}`);
      } else {
        addLog('Signin successful!');
      }
    } catch (err: any) {
      addLog(`Signin failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testProfile = async () => {
    if (!user) {
      addLog('No user logged in');
      return;
    }

    addLog('Testing profile access...');
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) {
        addLog(`Profile error: ${error.message}`);
      } else {
        addLog(`Profile found: ${JSON.stringify(data)}`);
      }
    } catch (err: any) {
      addLog(`Profile test failed: ${err.message}`);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">认证调试页面</h1>
      
      <div className="grid md:grid-cols-2 gap-8">
        {/* Controls */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">用户信息</h2>
            
                         {user ? (
               <div className="space-y-2">
                 <p><strong>ID:</strong> {user.id}</p>
                 <p><strong>Email:</strong> {user.email}</p>
                 <p><strong>Username:</strong> {user.username}</p>
                 <p><strong>Full Name:</strong> {user.full_name}</p>
                 <p><strong>Region:</strong> {user.region}</p>
                 <p><strong>Email Verified:</strong> {user.email_verified ? 'Yes' : 'No'}</p>
                 <p><strong>Role:</strong> {user.role}</p>
                 <Button onClick={signOut} variant="outline">
                   退出登录
                 </Button>
               </div>
             ) : (
               <p>未登录</p>
             )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">测试控制</h2>
            
            <div className="space-y-4">
              <Input
                placeholder="邮箱"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Input
                type="password"
                placeholder="密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={testSignUp} disabled={loading}>
                  测试注册
                </Button>
                <Button onClick={testSignIn} disabled={loading}>
                  测试登录
                </Button>
              </div>
              
              <Button onClick={testProfile} disabled={!user} className="w-full">
                测试Profile
              </Button>
              
              <Button onClick={clearLogs} variant="outline" className="w-full">
                清除日志
              </Button>
            </div>
          </div>
        </div>

        {/* Logs */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">调试日志</h2>
          
          <div className="bg-gray-100 rounded p-4 h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-gray-500">暂无日志</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="text-sm font-mono mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 