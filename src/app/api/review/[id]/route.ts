import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, updateUserReviewCount } from '@/lib/auth';
import { supabase, Tables, handleDatabaseError } from '@/lib/database';

interface RevisedContent {
  text: string;
  phonetic_notation: string;
  definition?: string;
  usage_notes?: string;
  examples: Array<{
    example_text: string;
    translation?: string;
    context?: string;
  }>;
}

interface ReviewRequest {
  action: 'pending' | 'approve' | 'reject' | 'revised_and_approved';
  notes?: string;
  revised_content?: RevisedContent;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const resolvedParams = await params;
    const expressionId = resolvedParams.id;
    const body = await request.json() as ReviewRequest;
    const { action, notes, revised_content } = body;

    // 验证审核操作
    if (!['pending', 'approve', 'reject', 'revised_and_approved'].includes(action)) {
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
    if (!['pending', 'approved', 'rejected'].includes(expression.status)) {
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
      case 'revised_and_approved':
        newStatus = 'approved';
        break;
      default:
        newStatus = 'pending';
    }

    // 准备更新数据
    const updateData: {
      status: string;
      reviewer_id: string;
      reviewed_at: string;
      review_notes: string | null;
      updated_at: string;
      text?: string;
      phonetic_notation?: string;
      definition?: string | null;
      usage_notes?: string | null;
    } = {
      status: newStatus,
      reviewer_id: payload.userId,
      reviewed_at: new Date().toISOString(),
      review_notes: notes || null,
      updated_at: new Date().toISOString()
    };

    // 如果是修改并通过，更新词条内容
    if (action === 'revised_and_approved' && revised_content) {
      updateData.text = revised_content.text;
      updateData.phonetic_notation = revised_content.phonetic_notation;
      updateData.definition = revised_content.definition || null;
      updateData.usage_notes = revised_content.usage_notes || null;
    }

    // 更新词条状态和内容
    const { error: updateError } = await supabase
      .from(Tables.EXPRESSIONS)
      .update(updateData)
      .eq('id', expressionId);

    if (updateError) {
      console.error('Error updating expression status:', updateError);
      return NextResponse.json(
        { error: handleDatabaseError(updateError) },
        { status: 500 }
      );
    }

    // 如果是修改并通过，更新例句
    if (action === 'revised_and_approved' && revised_content && revised_content.examples) {
      // 先删除现有例句
      const { error: deleteError } = await supabase
        .from('expression_examples')
        .delete()
        .eq('expression_id', expressionId);

      if (deleteError) {
        console.error('Error deleting existing examples:', deleteError);
      }

      // 添加新的例句
      if (revised_content.examples.length > 0) {
        const examplesToInsert = revised_content.examples
          .filter((example) => example.example_text.trim())
          .map((example) => ({
            expression_id: expressionId,
            example_text: example.example_text,
            translation: example.translation || null,
            context: example.context || null,
            source: 'moderator_revised',
            contributor_id: payload.userId,
            created_at: new Date().toISOString(),
            is_featured: false
          }));

        if (examplesToInsert.length > 0) {
          const { error: insertError } = await supabase
            .from('expression_examples')
            .insert(examplesToInsert);

          if (insertError) {
            console.error('Error inserting revised examples:', insertError);
          }
        }
      }
    }

    // 更新审核者的审核计数
    await updateUserReviewCount(payload.userId);

    // 如果是通过或修改并通过，更新贡献者的贡献计数
    if (action === 'approve' || action === 'revised_and_approved') {
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
      status: newStatus,
      action: action
    });
  } catch (error) {
    console.error('Review submission API error:', error);
    return NextResponse.json(
      { error: '提交审核结果时发生错误' },
      { status: 500 }
    );
  }
} 