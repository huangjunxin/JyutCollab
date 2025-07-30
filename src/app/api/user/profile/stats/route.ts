import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, syncUserStats } from '@/lib/auth';
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

    // 同步用户统计信息
    await syncUserStats(userId);

    // 获取用户基本信息
    const { data: user, error: userError } = await supabase
      .from(Tables.USERS)
      .select('created_at, contribution_count, review_count')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Error fetching user:', userError);
      return NextResponse.json(
        { error: handleDatabaseError(userError) },
        { status: 500 }
      );
    }

    // 获取用户贡献统计
    const { data: expressions, error: expressionsError } = await supabase
      .from(Tables.EXPRESSIONS)
      .select('status, view_count, like_count')
      .eq('contributor_id', userId);

    if (expressionsError) {
      console.error('Error fetching expressions:', expressionsError);
      return NextResponse.json(
        { error: handleDatabaseError(expressionsError) },
        { status: 500 }
      );
    }

    // 计算统计信息
    const totalContributions = expressions?.length || 0;
    const approvedContributions = expressions?.filter(e => e.status === 'approved').length || 0;
    const totalViews = expressions?.reduce((sum, e) => sum + (e.view_count || 0), 0) || 0;
    const totalLikes = expressions?.reduce((sum, e) => sum + (e.like_count || 0), 0) || 0;
    
    // 计算通过率
    const approvalRate = totalContributions > 0 ? Math.round((approvedContributions / totalContributions) * 100) : 0;
    
    // 计算用户等级
    let rank = '新手贡献者';
    let rankColor = 'text-gray-600';
    
    if (totalContributions >= 100) {
      rank = '专家贡献者';
      rankColor = 'text-purple-600';
    } else if (totalContributions >= 50) {
      rank = '资深贡献者';
      rankColor = 'text-blue-600';
    } else if (totalContributions >= 20) {
      rank = '活跃贡献者';
      rankColor = 'text-green-600';
    } else if (totalContributions >= 5) {
      rank = '进阶贡献者';
      rankColor = 'text-orange-600';
    }

    // 格式化注册时间
    const joinDate = new Date(user.created_at).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long'
    });

    const stats = {
      contributions: totalContributions,
      approvedContributions,
      totalViews,
      totalLikes,
      approvalRate,
      rank,
      rankColor,
      joinDate,
      reviewCount: user.review_count || 0
    };

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Profile stats API error:', error);
    return NextResponse.json(
      { error: '获取用户统计信息时发生错误' },
      { status: 500 }
    );
  }
} 

export async function POST(request: NextRequest) {
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

    // 同步用户统计信息
    const result = await syncUserStats(userId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      message: '用户统计信息同步成功',
      success: true 
    });
  } catch (error) {
    console.error('Sync user stats API error:', error);
    return NextResponse.json(
      { error: '同步用户统计信息时发生错误' },
      { status: 500 }
    );
  }
} 