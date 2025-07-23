import { NextRequest, NextResponse } from 'next/server';
import { generateDefinitions } from '@/lib/llm';

export async function POST(request: NextRequest) {
  try {
    const { expression, region, context } = await request.json();
    
    if (!expression) {
      return NextResponse.json(
        { error: 'Expression is required' },
        { status: 400 }
      );
    }

    const definitions = await generateDefinitions(expression, region, context);
    
    return NextResponse.json({ definitions });
  } catch (error) {
    console.error('Error in definitions API:', error);
    return NextResponse.json(
      { error: 'Failed to generate definitions' },
      { status: 500 }
    );
  }
} 