import crypto from 'crypto';

export interface ACRCloudConfig {
  host: string;
  accessKey: string;
  secretKey: string;
}

export class ACRCloud {
  private config: ACRCloudConfig;

  constructor(config: ACRCloudConfig) {
    this.config = config;
  }

  private buildSignature(stringToSign: string, secretKey: string): string {
    const hmac = crypto.createHmac('sha1', secretKey);
    hmac.update(stringToSign);
    return hmac.digest('base64');
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

  async identifyByUrl(url: string) {
    try {
      const videoId = this.getVideoId(url);
      const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

      const currentTime = Math.floor(Date.now() / 1000);
      const stringToSign = `POST\n/v1/identify\n${this.config.accessKey}\n${currentTime}`;
      const signature = this.buildSignature(stringToSign, this.config.secretKey);

      const response = await fetch(`https://${this.config.host}/v1/identify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: new URLSearchParams({
          access_key: this.config.accessKey,
          timestamp: currentTime.toString(),
          signature,
          url: youtubeUrl,
          data_type: 'url',
        }).toString(),
      });

      if (!response.ok) {
        throw new Error(`ACRCloud API error: ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Invalid response format from ACRCloud');
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('ACRCloud identification error:', error);
      throw new Error(error.message || 'Failed to identify track');
    }
  }
}