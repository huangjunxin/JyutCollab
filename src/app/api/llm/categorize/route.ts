import { NextRequest, NextResponse } from 'next/server';
import { categorizeExpression, getThemeHierarchy } from '@/lib/llm';

export async function POST(request: NextRequest) {
  try {
    const { expression, context } = await request.json();
    
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
    
    return NextResponse.json({ 
      theme_classification: themeResult,
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