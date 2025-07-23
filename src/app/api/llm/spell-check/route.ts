import { NextRequest, NextResponse } from 'next/server';
import { checkSpelling } from '@/lib/llm';

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
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in spell-check API:', error);
    return NextResponse.json(
      { error: 'Failed to check spelling' },
      { status: 500 }
    );
  }
} 