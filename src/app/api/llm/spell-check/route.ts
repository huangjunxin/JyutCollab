import { NextRequest, NextResponse } from 'next/server';
import { checkSpelling } from '@/lib/llm';
import { convertToHongKongTraditional } from '@/lib/textConversion';

export async function POST(request: NextRequest) {
  try {
    const { expression, region } = await request.json();
    
    if (!expression) {
      return NextResponse.json(
        { error: 'Expression is required' },
        { status: 400 }
      );
    }

    const result = await checkSpelling(expression, region);
    
    // 强制转换LLM返回的建议和解释为香港繁体
    const convertedResult = {
      ...result,
      suggestions: result.suggestions.map(s => convertToHongKongTraditional(s)),
      explanation: convertToHongKongTraditional(result.explanation)
    };
    
    return NextResponse.json(convertedResult);
  } catch (error) {
    console.error('Error in spell-check API:', error);
    return NextResponse.json(
      { error: 'Failed to check spelling' },
      { status: 500 }
    );
  }
} 