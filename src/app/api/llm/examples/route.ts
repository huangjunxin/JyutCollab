import { NextRequest, NextResponse } from 'next/server';
import { generateExamples } from '@/lib/llm';

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
    
    return NextResponse.json({ examples });
  } catch (error) {
    console.error('Error in examples API:', error);
    return NextResponse.json(
      { error: 'Failed to generate examples' },
      { status: 500 }
    );
  }
} 