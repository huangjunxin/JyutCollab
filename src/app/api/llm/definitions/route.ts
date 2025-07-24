import { NextRequest, NextResponse } from 'next/server';
import { generateDefinitions } from '@/lib/llm';
import { convertToHongKongTraditional } from '@/lib/textConversion';

export async function POST(request: NextRequest) {
  try {
    const { expression, region, context, referenceExpressions } = await request.json();
    
    if (!expression) {
      return NextResponse.json(
        { error: 'Expression is required' },
        { status: 400 }
      );
    }

    const definitions = await generateDefinitions(expression, region, context, referenceExpressions);
    
    // 强制转换LLM返回的释义和使用说明为香港繁体
    const convertedDefinitions = {
      ...definitions,
      definition: convertToHongKongTraditional(definitions.definition),
      usage_notes: convertToHongKongTraditional(definitions.usage_notes),
    };
    
    return NextResponse.json(convertedDefinitions);
  } catch (error) {
    console.error('Error in definitions API:', error);
    return NextResponse.json(
      { error: 'Failed to generate definitions' },
      { status: 500 }
    );
  }
} 