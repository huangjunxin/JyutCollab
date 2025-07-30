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
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10');

    // 获取用户最近的表达贡献
    const { data: expressions, error: expressionsError } = await supabase
      .from(Tables.EXPRESSIONS)
      .select('id, text, status, created_at, region')
      .eq('contributor_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (expressionsError) {
      console.error('Error fetching user expressions:', expressionsError);
      return NextResponse.json(
        { error: handleDatabaseError(expressionsError) },
        { status: 500 }
      );
    }

    // 格式化活动数据
    const activities = expressions?.map(expr => {
      const submittedTime = new Date(expr.created_at);
      const now = new Date();
      const diffInHours = Math.floor((now.getTime() - submittedTime.getTime()) / (1000 * 60 * 60));
      
      let timeAgo = '';
      if (diffInHours < 1) {
        timeAgo = '刚刚';
      } else if (diffInHours < 24) {
        timeAgo = `${diffInHours} 小时前`;
      } else if (diffInHours < 24 * 7) {
        const days = Math.floor(diffInHours / 24);
        timeAgo = `${days} 天前`;
      } else {
        const weeks = Math.floor(diffInHours / (24 * 7));
        timeAgo = `${weeks} 周前`;
      }

      // 区域中文显示
      const regionMap: Record<string, string> = {
        guangzhou: '广州话',
        hongkong: '香港话',
        taishan: '台山话',
        overseas: '海外粤语'
      };

      return {
        id: expr.id,
        type: 'contribution',
        action: '贡献了新词条',
        content: expr.text,
        region: regionMap[expr.region] || expr.region,
        time: timeAgo,
        status: expr.status,
        submittedAt: expr.created_at,
        reviewedAt: null // 暂时没有审核时间字段
      };
    }) || [];

    return NextResponse.json({ activities });
  } catch (error) {
    console.error('Profile activities API error:', error);
    return NextResponse.json(
      { error: '获取用户活动记录时发生错误' },
      { status: 500 }
    );
  }
} 