import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('query');
  
  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  try {
    const jyutdictUrl = `https://jyutdict.org/api/v0.9/detail?chara=${encodeURIComponent(query)}`;
    
    const response = await fetch(jyutdictUrl, {
      headers: {
        'User-Agent': 'JyutCollab/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Jyutdict API responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to fetch from Jyutdict general API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data from Jyutdict' },
      { status: 500 }
    );
  }
} 