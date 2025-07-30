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

    // 获取待审核的词条
    const { data: expressions, error: expressionsError } = await supabase
      .from(Tables.EXPRESSIONS)
      .select(`
        id,
        text,
        region,
        definition,
        usage_notes,
        phonetic_notation,
        formality_level,
        frequency,
        status,
        submitted_at,
        view_count,
        like_count,
        contributor:users!expressions_contributor_id_fkey (
          username,
          display_name
        )
      `)
      .in('status', ['pending', 'needs_revision'])
      .order('submitted_at', { ascending: false });

    if (expressionsError) {
      console.error('Error fetching pending expressions:', expressionsError);
      return NextResponse.json(
        { error: handleDatabaseError(expressionsError) },
        { status: 500 }
      );
    }

    // 为每个词条获取例句
    const expressionsWithExamples = await Promise.all(
      (expressions || []).map(async (expression) => {
        const { data: examples } = await supabase
          .from('expression_examples')
          .select('example_text, translation, context')
          .eq('expression_id', expression.id);

        return {
          ...expression,
          examples: examples || []
        };
      })
    );

    return NextResponse.json({ 
      expressions: expressionsWithExamples 
    });
  } catch (error) {
    console.error('Pending expressions API error:', error);
    return NextResponse.json(
      { error: '获取待审核词条时发生错误' },
      { status: 500 }
    );
  }
} 