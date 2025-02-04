export interface YouTubeConfig {
  apiKey: string;
}

export interface TrackInfo {
  artist: string;
  title: string;
  bpm: number | null;
  key: string | null;
}

export class YouTube {
  private config: YouTubeConfig;

  constructor(config: YouTubeConfig) {
    this.config = config;
  }

  private getVideoId(url: string): string {
    try {
      const urlObj = new URL(url);
      let videoId = '';

      if (urlObj.hostname === 'youtu.be') {
        videoId = urlObj.pathname.slice(1);
      } else if (urlObj.hostname === 'www.youtube.com' || urlObj.hostname === 'youtube.com') {
        videoId = urlObj.searchParams.get('v') || '';
        if (!videoId) {
          throw new Error('Invalid YouTube URL format');
        }
      } else {
        throw new Error('Invalid YouTube URL');
      }

      videoId = videoId.split('&')[0];
      return videoId;
    } catch (error) {
      throw new Error('Invalid URL format');
    }
  }

  async getVideoDetails(url: string): Promise<TrackInfo> {
    try {
      const videoId = this.getVideoId(url);
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${this.config.apiKey}`
      );

      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.items?.[0]) {
        throw new Error('Video not found');
      }

      const video = data.items[0];
      const { title, description } = video.snippet;

      // Extract track information from title/description
      const trackInfo = await this.parseTrackInfo(title, description);

      return trackInfo;
    } catch (error: any) {
      console.error('YouTube API error:', error);
      throw new Error(error.message || 'Failed to get video details');
    }
  }

  private async parseTrackInfo(title: string, description: string): Promise<TrackInfo> {
    // Try to extract artist - title format from the video title
    const titleMatch = title.match(/(.+?)\s*[-–]\s*(.+)/);
    
    let artist = 'Unknown Artist';
    let trackTitle = title.trim();

    if (titleMatch) {
      artist = titleMatch[1].trim();
      trackTitle = titleMatch[2].trim();
    }

    // Try to find track in our database
    const { data: trackData, error } = await supabase
      .from('tracks')
      .select('*')
      .ilike('title', trackTitle)
      .ilike('artist', artist)
      .single();

    if (trackData) {
      return {
        artist: trackData.artist,
        title: trackData.title,
        bpm: trackData.bpm,
        key: trackData.key
      };
    }

    // If not found, create a new track entry
    const { data: newTrack, error: insertError } = await supabase
      .from('tracks')
      .insert([
        {
          title: trackTitle,
          artist: artist,
          bpm: null,
          key: null
        }
      ])
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting track:', insertError);
    }

    return {
      artist,
      title: trackTitle,
      bpm: null,
      key: null
    };
  }
}