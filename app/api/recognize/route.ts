import { NextResponse } from 'next/server';
import { YouTube } from '@/lib/youtube';

interface TrackResponse {
  data?: {
    title: string;
    artist: string;
    bpm: number | null;
    key: string | null;
  };
  error?: string;
}

export async function POST(request: Request) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Content-Type': 'application/json',
  };

  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { headers });
  }

  try {
    const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
    
    if (!YOUTUBE_API_KEY) {
      return NextResponse.json<TrackResponse>(
        { error: 'YouTube API configuration is missing' },
        { status: 500, headers }
      );
    }

    let requestBody;
    try {
      requestBody = await request.json();
    } catch (e) {
      return NextResponse.json<TrackResponse>(
        { error: 'Invalid request body' },
        { status: 400, headers }
      );
    }

    const { url } = requestBody;
  
    if (!url) {
      return NextResponse.json<TrackResponse>(
        { error: 'URL is required' },
        { status: 400, headers }
      );
    }

    const youtube = new YouTube({
      apiKey: YOUTUBE_API_KEY
    });

    const track = await youtube.getVideoDetails(url);
    
    return NextResponse.json<TrackResponse>(
      { data: track },
      { status: 200, headers }
    );
  } catch (error: any) {
    console.error('Error processing track:', error);
    
    return NextResponse.json<TrackResponse>(
      { error: error.message || 'Failed to process track' },
      { status: 500, headers }
    );
  }
}