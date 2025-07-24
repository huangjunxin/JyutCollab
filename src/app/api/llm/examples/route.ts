import { NextRequest, NextResponse } from 'next/server';
import { generateExamples } from '@/lib/llm';
import { convertToHongKongTraditional } from '@/lib/textConversion';

export async function POST(request: NextRequest) {
  try {
    const { expression, definition, region } = await request.json();
    
    if (!expression || !definition) {
      return NextResponse.json(
        { error: 'Expression and definition are required' },
        { status: 400 }
      );
    }

    const examples = await generateExamples(expression, definition, region);
    
    // 强制转换LLM返回的例句和解释为香港繁体
    const convertedExamples = examples.map(example => ({
      ...example,
      sentence: convertToHongKongTraditional(example.sentence),
      explanation: convertToHongKongTraditional(example.explanation),
      scenario: convertToHongKongTraditional(example.scenario),
    }));
    
    return NextResponse.json({ examples: convertedExamples });
  } catch (error) {
    console.error('Error in examples API:', error);
    return NextResponse.json(
      { error: 'Failed to generate examples' },
      { status: 500 }
    );
  }
} 