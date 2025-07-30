import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, updateUserReviewCount } from '@/lib/auth';
import { supabase, Tables, handleDatabaseError } from '@/lib/database';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const expressionId = params.id;
    const body = await request.json();
    const { action, notes } = body;

    // 验证审核操作
    if (!['approve', 'reject', 'needs_revision'].includes(action)) {
      return NextResponse.json(
        { error: '无效的审核操作' },
        { status: 400 }
      );
    }

    // 检查用户权限
    const { data: user, error: userError } = await supabase
      .from(Tables.USERS)
      .select('role')
      .eq('id', payload.userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    if (user.role !== 'moderator' && user.role !== 'admin') {
      return NextResponse.json(
        { error: '权限不足' },
        { status: 403 }
      );
    }

    // 获取词条信息
    const { data: expression, error: expressionError } = await supabase
      .from(Tables.EXPRESSIONS)
      .select('id, status, contributor_id')
      .eq('id', expressionId)
      .single();

    if (expressionError || !expression) {
      return NextResponse.json(
        { error: '词条不存在' },
        { status: 404 }
      );
    }

    // 检查词条状态
    if (!['pending', 'needs_revision'].includes(expression.status)) {
      return NextResponse.json(
        { error: '该词条已被审核' },
        { status: 400 }
      );
    }

    // 确定新的状态
    let newStatus: string;
    switch (action) {
      case 'approve':
        newStatus = 'approved';
        break;
      case 'reject':
        newStatus = 'rejected';
        break;
      case 'needs_revision':
        newStatus = 'needs_revision';
        break;
      default:
        newStatus = 'pending';
    }

    // 更新词条状态
    const { error: updateError } = await supabase
      .from(Tables.EXPRESSIONS)
      .update({
        status: newStatus,
        reviewer_id: payload.userId,
        reviewed_at: new Date().toISOString(),
        review_notes: notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', expressionId);

    if (updateError) {
      console.error('Error updating expression status:', updateError);
      return NextResponse.json(
        { error: handleDatabaseError(updateError) },
        { status: 500 }
      );
    }

    // 更新审核者的审核计数
    await updateUserReviewCount(payload.userId);

    // 如果是通过，更新贡献者的贡献计数
    if (action === 'approve') {
      // 先获取贡献者当前的贡献计数
      const { data: contributor, error: contributorError } = await supabase
        .from(Tables.USERS)
        .select('contribution_count')
        .eq('id', expression.contributor_id)
        .single();

      if (!contributorError && contributor) {
        const newContributionCount = (contributor.contribution_count || 0) + 1;
        
        const { error: updateError } = await supabase
          .from(Tables.USERS)
          .update({
            contribution_count: newContributionCount,
            updated_at: new Date().toISOString()
          })
          .eq('id', expression.contributor_id);

        if (updateError) {
          console.error('Error updating contributor count:', updateError);
        }
      }
    }

    return NextResponse.json({ 
      message: '审核完成',
      status: newStatus
    });
  } catch (error) {
    console.error('Review submission API error:', error);
    return NextResponse.json(
      { error: '提交审核结果时发生错误' },
      { status: 500 }
    );
  }
} 