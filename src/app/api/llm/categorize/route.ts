import { NextRequest, NextResponse } from 'next/server';
import { categorizeExpression, getThemeHierarchy } from '@/lib/llm';
import { convertToHongKongTraditional } from '@/lib/textConversion';

export async function POST(request: NextRequest) {
  try {
    const { expression, context, referenceExpressions } = await request.json();
    
    if (!expression) {
      return NextResponse.json(
        { error: 'Expression is required' },
        { status: 400 }
      );
    }

    // 获取三级主题分类
    const themeResult = await categorizeExpression(expression, context);
    
    // 根据三级主题反推上级主题
    const themeHierarchy = await getThemeHierarchy(themeResult.theme_id);
    
    // 强制转换LLM返回的解释文本为香港繁体
    const convertedThemeResult = {
      ...themeResult,
      explanation: convertToHongKongTraditional(themeResult.explanation)
    };
    
    return NextResponse.json({ 
      theme_classification: convertedThemeResult,
      theme_hierarchy: themeHierarchy
    });
  } catch (error) {
    console.error('Error in categorize API:', error);
    return NextResponse.json(
      { error: 'Failed to categorize expression' },
      { status: 500 }
    );
  }
} 