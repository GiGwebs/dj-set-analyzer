import { Music2 } from 'lucide-react';
import { supabase } from './supabase/client';

export interface TrackMetadata {
  artist: string;
  title: string;
  bpm: number | null;
  key: string | null;
  source?: string;
}

export interface BatchProcessResult {
  processed: TrackMetadata[];
  failed: { artist: string; title: string; error: string }[];
}

export class TrackAnalyzer {
  // Camelot wheel mappings
  private static readonly CAMELOT_MAPPINGS = {
    // Major keys (all map to B notation)
    'B': '1B', 'Gb': '2B', 'Db': '3B', 'Ab': '4B', 
    'Eb': '5B', 'Bb': '6B', 'F': '7B', 'C': '8B', 
    'G': '9B', 'D': '10B', 'A': '11B', 'E': '12B',
    // Minor keys (all map to A notation)
    'Abm': '1A', 'Ebm': '2A', 'Bbm': '3A', 'Fm': '4A',
    'Cm': '5A', 'Gm': '6A', 'Dm': '7A', 'Am': '8A',
    'Em': '9A', 'Bm': '10A', 'F#m': '11A', 'C#m': '12A',
    // Alternative notations
    'F#': '2B', 'C#': '3B', 'G#': '4B',
    'D#': '5B', 'A#': '6B',
    'G#m': '1A', 'D#m': '2A', 'A#m': '3A',
    // Add conversions from B to A notation
    '1B': '4A', '2B': '5A', '3B': '6A', '4B': '7A',
    '5B': '8A', '6B': '9A', '7B': '10A', '8B': '11A',
    '9B': '12A', '10B': '1A', '11B': '2A', '12B': '3A'
  };

  /**
   * Normalize musical key notation to Camelot wheel format (1A notation)
   */
  static normalizeKey(key: string): string {
    if (!key) return '';

    // Clean and standardize the input
    const cleanKey = key.trim()
      .replace(/\s+/g, '')  // Remove spaces
      .replace(/major/i, '')
      .replace(/minor/i, 'm')
      .replace(/maj/i, '')
      .replace(/min/i, 'm');

    // If it's already in Camelot notation
    if (/^([1-9]|1[0-2])[AB]$/i.test(cleanKey)) {
      const upperKey = cleanKey.toUpperCase();
      // If it's already in A notation, return as is
      if (upperKey.endsWith('A')) {
        return upperKey;
      }
      // Convert B notation to A notation
      return this.CAMELOT_MAPPINGS[upperKey] || upperKey;
    }

    // Handle flats and sharps
    const withSharps = cleanKey
      .replace(/bb/g, 'b')
      .replace(/♭/g, 'b')
      .replace(/♯/g, '#');
    
    // Get the initial Camelot notation
    const camelotKey = this.CAMELOT_MAPPINGS[withSharps];
    if (!camelotKey) return cleanKey.toUpperCase();

    // Convert to A notation if it's in B notation
    return camelotKey.endsWith('B') 
      ? this.CAMELOT_MAPPINGS[camelotKey] 
      : camelotKey;
  }

  /**
   * Process multiple tracks in batch
   */
  static async processBatch(
    tracks: { artist: string; title: string }[]
  ): Promise<BatchProcessResult> {
    const result: BatchProcessResult = {
      processed: [],
      failed: []
    };

    // Process tracks in parallel with a concurrency limit of 5
    const concurrencyLimit = 5;
    const chunks = this.chunkArray(tracks, concurrencyLimit);

    for (const chunk of chunks) {
      const promises = chunk.map(async ({ artist, title }) => {
        try {
          const track = await this.findTrackInfo(artist, title);
          if (track) {
            result.processed.push(track);
          } else {
            result.failed.push({
              artist,
              title,
              error: 'Track information not found'
            });
          }
        } catch (error) {
          result.failed.push({
            artist,
            title,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      });

      await Promise.all(promises);
    }

    return result;
  }

  private static chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  static async findTrackInfo(
    artist: string,
    title: string
  ): Promise<TrackMetadata | null> {
    // Check our Supabase database
    const { data: trackData } = await supabase
      .from('tracks')
      .select('*')
      .ilike('title', title)
      .ilike('artist', artist)
      .single();

    if (trackData) {
      return {
        artist: trackData.artist,
        title: trackData.title,
        bpm: trackData.bpm,
        key: trackData.key ? this.normalizeKey(trackData.key) : null,
        source: 'database'
      };
    }

    // If no matches found, create a new entry
    const { data: newTrack, error: insertError } = await supabase
      .from('tracks')
      .insert([
        {
          title,
          artist,
          bpm: null,
          key: null
        }
      ])
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting track:', insertError);
      return null;
    }

    return {
      artist: newTrack.artist,
      title: newTrack.title,
      bpm: newTrack.bpm,
      key: newTrack.key,
      source: 'new'
    };
  }

  private static async saveToDatabase(track: TrackMetadata) {
    const { error } = await supabase
      .from('tracks')
      .insert([
        {
          title: track.title,
          artist: track.artist,
          bpm: track.bpm,
          key: track.key
        }
      ]);

    if (error) {
      console.error('Error saving track to database:', error);
    }
  }
}