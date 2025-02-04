import * as NodeID3 from 'node-id3';
import * as mm from 'music-metadata-browser';
import type { TrackMetadata } from '../track-analyzer';

export async function readFileMetadata(file: File): Promise<TrackMetadata | null> {
  try {
    // Use music-metadata-browser for browser environment
    const metadata = await mm.parseBlob(file);
    
    const title = metadata.common.title;
    const artist = metadata.common.artist;
    
    if (!title || !artist) {
      return null;
    }

    // Extract BPM and key from common tags
    const bpm = metadata.common.bpm || null;
    const key = metadata.common.key || null;

    return {
      title,
      artist,
      bpm,
      key,
      source: 'file'
    };
  } catch (error) {
    console.error('Error reading file metadata:', error);
    return null;
  }
}