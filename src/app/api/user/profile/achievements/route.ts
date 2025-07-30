import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { supabase, Tables, handleDatabaseError } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const authorization = request.headers.get('authorization');
    
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '未提供认证令牌' },
        { status: 401 }
      );
    }

    const token = authorization.split(' ')[1];
    const payload = verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        { error: '无效的令牌' },
        { status: 401 }
      );
    }

    const userId = payload.userId;

    // 获取用户成就记录
    const { data: achievements, error: achievementsError } = await supabase
      .from(Tables.USER_ACHIEVEMENTS)
      .select('*')
      .eq('user_id', userId)
      .order('earned_at', { ascending: false });

    if (achievementsError) {
      console.error('Error fetching user achievements:', achievementsError);
      return NextResponse.json(
        { error: handleDatabaseError(achievementsError) },
        { status: 500 }
      );
    }

    // 获取用户统计信息以计算潜在成就
    const { data: expressions, error: expressionsError } = await supabase
      .from(Tables.EXPRESSIONS)
      .select('status, created_at')
      .eq('contributor_id', userId);

    if (expressionsError) {
      console.error('Error fetching expressions for achievements:', expressionsError);
      return NextResponse.json(
        { error: handleDatabaseError(expressionsError) },
        { status: 500 }
      );
    }

    const totalContributions = expressions?.length || 0;
    const approvedContributions = expressions?.filter(e => e.status === 'approved').length || 0;
    const approvalRate = totalContributions > 0 ? (approvedContributions / totalContributions) : 0;

    // 计算连续贡献天数
    const sortedDates = expressions?.map(e => new Date(e.created_at).toDateString()).sort();
    const uniqueDates = [...new Set(sortedDates)];
    let consecutiveDays = 0;
    if (uniqueDates.length > 0) {
      let currentStreak = 1;
      for (let i = 1; i < uniqueDates.length; i++) {
        const prevDate = new Date(uniqueDates[i - 1]);
        const currDate = new Date(uniqueDates[i]);
        const diffInDays = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
        if (diffInDays === 1) {
          currentStreak++;
        } else {
          break;
        }
      }
      consecutiveDays = currentStreak;
    }

    // 定义所有可能的成就
    const possibleAchievements = [
      {
        id: 'first_contribution',
        name: '首次贡献',
        icon: 'Star',
        color: 'text-yellow-500',
        description: '提交了第一个词条',
        condition: totalContributions >= 1,
        earned: achievements?.some(a => a.achievement_type === 'first_contribution') || false
      },
      {
        id: 'continuous_contributor',
        name: '连续贡献',
        icon: 'TrendingUp',
        color: 'text-blue-500',
        description: '连续多天贡献词条',
        condition: consecutiveDays >= 3,
        earned: achievements?.some(a => a.achievement_type === 'continuous_contributor') || false
      },
      {
        id: 'quality_assurance',
        name: '质量保证',
        icon: 'CheckCircle',
        color: 'text-green-500',
        description: '词条通过率达到85%以上',
        condition: approvalRate >= 0.85 && totalContributions >= 5,
        earned: achievements?.some(a => a.achievement_type === 'quality_assurance') || false
      },
      {
        id: 'active_contributor',
        name: '热心用户',
        icon: 'Heart',
        color: 'text-red-500',
        description: '贡献超过10个词条',
        condition: totalContributions >= 10,
        earned: achievements?.some(a => a.achievement_type === 'active_contributor') || false
      },
      {
        id: 'expert_contributor',
        name: '专家贡献者',
        icon: 'Award',
        color: 'text-purple-500',
        description: '贡献超过50个词条',
        condition: totalContributions >= 50,
        earned: achievements?.some(a => a.achievement_type === 'expert_contributor') || false
      },
      {
        id: 'regional_champion',
        name: '地区达人',
        icon: 'MapPin',
        color: 'text-orange-500',
        description: '在特定地区贡献突出',
        condition: totalContributions >= 20,
        earned: achievements?.some(a => a.achievement_type === 'regional_champion') || false
      }
    ];

    // 只返回已获得的成就
    const earnedAchievements = possibleAchievements.filter(achievement => achievement.earned);

    return NextResponse.json({ 
      achievements: earnedAchievements,
      totalAchievements: earnedAchievements.length,
      possibleAchievements: possibleAchievements.length
    });
  } catch (error) {
    console.error('Profile achievements API error:', error);
    return NextResponse.json(
      { error: '获取用户成就时发生错误' },
      { status: 500 }
    );
  }
} 