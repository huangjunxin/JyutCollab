import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/database';
import { convertToHongKongTraditional } from '@/lib/textConversion';

export async function POST(request: NextRequest) {
  try {
    const { query, region } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Invalid query' }, { status: 400 });
    }

    // 转换为繁体字进行搜索
    const convertedQuery = convertToHongKongTraditional(query);
    
    // 构建搜索查询 - 搜索文本相似的词条
    let searchQuery = supabase
      .from('expressions')
      .select(`
        id,
        text,
        text_normalized,
        region,
        theme_id_l1,
        theme_id_l2,
        theme_id_l3,
        definition,
        usage_notes,
        formality_level,
        frequency,
        phonetic_notation,
        notation_system,
        like_count,
        view_count,
        created_at,
        parent_expression_id
      `)
      .eq('status', 'approved')
      .is('parent_expression_id', null); // 只搜索主词条，不搜索方言变体

    // 多种搜索策略：
    // 1. 精确匹配
    // 2. 部分匹配（包含查询词）
    // 3. 相似度搜索（PostgreSQL similarity）
    const searchConditions = [
      `text.eq.${convertedQuery}`,  // 精确匹配
      `text_normalized.ilike.%${convertedQuery}%`,  // 包含匹配
      `text.ilike.%${convertedQuery}%`  // 文本包含匹配
    ];

    searchQuery = searchQuery.or(searchConditions.join(','));

    // 如果指定了地区，优先显示同地区的词条
    if (region && region !== 'all') {
      // 不限制地区，但在结果中会优先排序
    }

    // 排序：同地区优先，然后按相关性和热度
    searchQuery = searchQuery.order('like_count', { ascending: false });
    
    // 限制返回最多10个结果
    searchQuery = searchQuery.limit(10);

    const { data: expressions, error } = await searchQuery;

    if (error) {
      console.error('Search expressions error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // 后处理：按相关性和地区优先级重新排序
    const sortedExpressions = expressions?.sort((a, b) => {
      // 精确匹配优先
      const aExact = a.text === convertedQuery ? 1 : 0;
      const bExact = b.text === convertedQuery ? 1 : 0;
      if (aExact !== bExact) return bExact - aExact;

      // 同地区优先（如果指定了地区）
      if (region && region !== 'all') {
        const aRegionMatch = a.region === region ? 1 : 0;
        const bRegionMatch = b.region === region ? 1 : 0;
        if (aRegionMatch !== bRegionMatch) return bRegionMatch - aRegionMatch;
      }

      // 相似度优先（文本包含程度）
      const aContains = a.text.includes(convertedQuery) || a.text_normalized?.includes(convertedQuery);
      const bContains = b.text.includes(convertedQuery) || b.text_normalized?.includes(convertedQuery);
      if (aContains !== bContains) return (bContains ? 1 : 0) - (aContains ? 1 : 0);

      // 最后按热度排序
      return b.like_count - a.like_count;
    }) || [];

    return NextResponse.json({
      expressions: sortedExpressions,
      count: sortedExpressions.length
    });

  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 