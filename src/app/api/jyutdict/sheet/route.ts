import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('query');
  const isHeaderRequest = searchParams.has('header');
  
  // For header requests, query can be empty
  // For regular requests, query is required
  if (!isHeaderRequest && !query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  try {
    let jyutdictUrl;
    
    if (isHeaderRequest) {
      // Header request - query can be empty
      jyutdictUrl = `https://jyutdict.org/api/v0.9/sheet?query=${encodeURIComponent(query || '')}&header`;
    } else {
      // Regular query request
      jyutdictUrl = `https://jyutdict.org/api/v0.9/sheet?query=${encodeURIComponent(query!)}&fuzzy`;
    }
    
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
    console.error('Failed to fetch from Jyutdict sheet API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data from Jyutdict' },
      { status: 500 }
    );
  }
} 