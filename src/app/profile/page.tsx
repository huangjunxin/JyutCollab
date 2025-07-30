'use client';

import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Mail, 
  Calendar, 
  MapPin, 
  Edit3, 
  Save, 
  X,
  Trophy,
  BookOpen,
  Heart,
  TrendingUp,
  Star,
  CheckCircle,
  Award,
  Shield,
  Globe
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';

interface UserStats {
  contributions: number;
  approvedContributions: number;
  totalViews: number;
  totalLikes: number;
  approvalRate: number;
  rank: string;
  rankColor: string;
  joinDate: string;
  reviewCount: number;
}

interface UserActivity {
  id: string;
  type: string;
  action: string;
  content: string;
  region: string;
  time: string;
  status: string;
  submittedAt: string;
  reviewedAt?: string;
}

interface UserAchievement {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  condition: boolean;
  earned: boolean;
}

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [editForm, setEditForm] = useState({
    display_name: '',
    bio: '',
    location: '',
    native_dialect: ''
  });

  // 获取用户统计信息
  const fetchUserStats = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const response = await fetch('/api/user/profile/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  // 获取用户活动记录
  const fetchUserActivities = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const response = await fetch('/api/user/profile/activities?limit=5', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities);
      }
    } catch (error) {
      console.error('Error fetching user activities:', error);
    }
  };

  // 获取用户成就
  const fetchUserAchievements = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const response = await fetch('/api/user/profile/achievements', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAchievements(data.achievements);
      }
    } catch (error) {
      console.error('Error fetching user achievements:', error);
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      redirect('/auth/login');
    }
    
    if (user) {
      setEditForm({
        display_name: user.display_name || user.username || '',
        bio: user.bio || '',
        location: user.location || '',
        native_dialect: user.native_dialect || ''
      });
      
      // 加载用户数据
      const loadUserData = async () => {
        setLoadingData(true);
        await Promise.all([
          fetchUserStats(),
          fetchUserActivities(),
          fetchUserAchievements()
        ]);
        setLoadingData(false);
      };

      loadUserData();
    }
  }, [user, loading]);

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const response = await fetch('/api/auth/user', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          display_name: editForm.display_name,
          bio: editForm.bio,
          location: editForm.location,
          native_dialect: editForm.native_dialect
        })
      });

      if (response.ok) {
        setIsEditing(false);
        // 可以显示成功消息
      } else {
        // 处理错误
        console.error('Failed to update user profile');
      }
    } catch (error) {
      console.error('Error updating user profile:', error);
    }
  };

  const handleCancel = () => {
    if (user) {
      setEditForm({
        display_name: user.display_name || user.username || '',
        bio: user.bio || '',
        location: user.location || '',
        native_dialect: user.native_dialect || ''
      });
    }
    setIsEditing(false);
  };

  // 获取角色显示名称
  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin':
        return '管理员';
      case 'moderator':
        return '版主';
      case 'contributor':
        return '贡献者';
      default:
        return '贡献者';
    }
  };

  // 获取角色徽章颜色
  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'moderator':
        return 'default';
      case 'contributor':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <User className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">请先登录</h2>
          <p className="text-muted-foreground mb-6">您需要登录才能查看个人资料</p>
          <div className="flex gap-3 justify-center">
            <Button asChild>
              <Link href="/auth/login">登录</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/auth/register">注册</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">个人资料</h1>
          <p className="text-muted-foreground mt-2">管理您的个人信息和查看贡献统计</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧 - 个人信息 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 基本信息卡片 */}
            <div className="bg-card p-6 rounded-lg border">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">基本信息</h2>
                {!isEditing ? (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    编辑
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleCancel}
                    >
                      <X className="h-4 w-4 mr-2" />
                      取消
                    </Button>
                    <Button 
                      size="sm"
                      onClick={handleSave}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      保存
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {/* 头像和基本信息 */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-8 w-8 text-primary" />
                  </div>
                  <div className="flex-1">
                    {isEditing ? (
                      <Input
                        placeholder="显示名称"
                        value={editForm.display_name}
                        onChange={(e) => setEditForm({...editForm, display_name: e.target.value})}
                      />
                    ) : (
                      <div>
                        <h3 className="text-lg font-semibold">{user.display_name || user.username}</h3>
                        <p className="text-muted-foreground">@{user.username}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 邮箱和验证状态 */}
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{user.email}</span>
                  <Badge variant={user.email_verified ? "default" : "secondary"} className="text-xs">
                    {user.email_verified ? (
                      <>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        已验证
                      </>
                    ) : (
                      <>
                        <X className="h-3 w-3 mr-1" />
                        未验证
                      </>
                    )}
                  </Badge>
                </div>

                {/* 用户角色 */}
                <div className="flex items-center gap-3">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span>角色：</span>
                  <Badge variant={getRoleBadgeVariant(user.role)} className="text-xs">
                    {getRoleDisplayName(user.role)}
                  </Badge>
                </div>

                {/* 地区 */}
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  {isEditing ? (
                    <Input
                      placeholder="所在地区"
                      value={editForm.location}
                      onChange={(e) => setEditForm({...editForm, location: e.target.value})}
                      className="flex-1"
                    />
                  ) : (
                    <span>{editForm.location || '未设置'}</span>
                  )}
                </div>

                {/* 母语方言 */}
                <div className="flex items-center gap-3">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span>母语方言：</span>
                  {isEditing ? (
                    <Input
                      placeholder="如：香港话、广州话、台山话等"
                      value={editForm.native_dialect}
                      onChange={(e) => setEditForm({...editForm, native_dialect: e.target.value})}
                      className="flex-1"
                    />
                  ) : (
                    <span>{editForm.native_dialect || '未设置'}</span>
                  )}
                </div>

                {/* 注册时间 */}
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>注册于 {stats?.joinDate || '未知'}</span>
                </div>

                {/* 个人简介 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">个人简介</label>
                  {isEditing ? (
                    <Textarea
                      placeholder="介绍一下您自己..."
                      value={editForm.bio}
                      onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                      rows={3}
                    />
                  ) : (
                    <p className="text-muted-foreground p-3 bg-muted/50 rounded-md">
                      {editForm.bio || '这个人很懒，什么都没有留下...'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* 最近活动 */}
            <div className="bg-card p-6 rounded-lg border">
              <h2 className="text-xl font-semibold mb-4">最近活动</h2>
              <div className="space-y-4">
                {activities.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpen className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                    <p>暂无活动记录</p>
                    <p className="text-sm">开始贡献词条来记录您的活动吧！</p>
                  </div>
                ) : (
                  activities.map((activity, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-muted/50 rounded-md">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <BookOpen className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">
                          {activity.action} <span className="font-medium text-cantonese-600">&ldquo;{activity.content}&rdquo;</span>
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{activity.time}</span>
                          <span>•</span>
                          <span>{activity.region}</span>
                        </div>
                      </div>
                      <Badge 
                        variant={activity.status === 'approved' ? 'default' : 
                                activity.status === 'rejected' ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {activity.status === 'approved' ? '已通过' : 
                         activity.status === 'rejected' ? '已拒绝' :
                         activity.status === 'needs_revision' ? '需修改' : '审核中'}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* 右侧 - 统计信息 */}
          <div className="space-y-6">
            {/* 等级和徽章 */}
            <div className="bg-card p-6 rounded-lg border">
              <h3 className="text-lg font-semibold mb-4">用户等级</h3>
              <div className="text-center space-y-3">
                <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                  <Trophy className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h4 className={`font-semibold ${stats?.rankColor || 'text-cantonese-600'}`}>{stats?.rank || '新手贡献者'}</h4>
                  <p className="text-sm text-muted-foreground">继续努力！</p>
                </div>
              </div>
            </div>

            {/* 贡献统计 */}
            <div className="bg-card p-6 rounded-lg border">
              <h3 className="text-lg font-semibold mb-4">贡献统计</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-red-500" />
                    <span className="text-sm">总贡献</span>
                  </div>
                  <span className="font-semibold">{stats?.contributions || 0}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">已通过</span>
                  </div>
                  <span className="font-semibold">{stats?.approvedContributions || 0}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">总浏览量</span>
                  </div>
                  <span className="font-semibold">{stats?.totalViews?.toLocaleString() || '0'}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-pink-500" />
                    <span className="text-sm">获得点赞</span>
                  </div>
                  <span className="font-semibold">{stats?.totalLikes?.toLocaleString() || '0'}</span>
                </div>

                {/* 只有moderator和admin才显示审核数量 */}
                {(user.role === 'moderator' || user.role === 'admin') && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-purple-500" />
                      <span className="text-sm">审核数量</span>
                    </div>
                    <span className="font-semibold">{stats?.reviewCount || 0}</span>
                  </div>
                )}
                
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">通过率</span>
                    <span className="font-semibold text-green-600">
                      {stats?.approvalRate || 0}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 获得徽章 */}
            <div className="bg-card p-6 rounded-lg border">
              <h3 className="text-lg font-semibold mb-4">获得徽章</h3>
              <div className="grid grid-cols-2 gap-3">
                {achievements.length === 0 ? (
                  <div className="col-span-2 text-center py-8 text-muted-foreground">
                    <Award className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                    <p>暂无徽章</p>
                    <p className="text-sm">继续贡献来获得成就徽章！</p>
                  </div>
                ) : (
                  achievements.map((achievement, index) => {
                    const IconComponent = achievement.icon === 'Star' ? Star :
                                        achievement.icon === 'TrendingUp' ? TrendingUp :
                                        achievement.icon === 'CheckCircle' ? CheckCircle :
                                        achievement.icon === 'Heart' ? Heart :
                                        achievement.icon === 'Award' ? Award :
                                        achievement.icon === 'MapPin' ? MapPin : Star;
                    
                    return (
                      <div key={index} className="flex flex-col items-center p-3 bg-muted/50 rounded-md">
                        <IconComponent className={`h-6 w-6 ${achievement.color} mb-1`} />
                        <span className="text-xs text-center">{achievement.name}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 