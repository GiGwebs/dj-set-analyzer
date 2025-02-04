import { readFile } from 'fs/promises';
import type { DJSoftwareReader } from './index';
import type { TrackMetadata } from '../track-analyzer';

interface SeratoTrack {
  filePath: string;
  title: string;
  artist: string;
  bpm: number | null;
  key: string | null;
}

export class SeratoReader implements DJSoftwareReader {
  name = 'Serato';
  private dbPath: string;

  constructor() {
    const isWindows = process.platform === 'win32';
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    
    this.dbPath = isWindows
      ? `${homeDir}\\Music\\_Serato_\\database V2`
      : `${homeDir}/Music/_Serato_/database V2`;
  }

  async readDatabase(): Promise<TrackMetadata[]> {
    try {
      const buffer = await readFile(this.dbPath);
      const tracks = this.parseSeratoDatabase(buffer);
      
      return tracks.map(track => ({
        title: track.title,
        artist: track.artist,
        bpm: track.bpm,
        key: track.key,
        source: 'serato'
      }));
    } catch (error) {
      console.error('Error reading Serato database:', error);
      return [];
    }
  }

  async findTrack(artist: string, title: string): Promise<TrackMetadata | null> {
    try {
      const buffer = await readFile(this.dbPath);
      const tracks = this.parseSeratoDatabase(buffer);
      
      const track = tracks.find(t => 
        t.title.toLowerCase() === title.toLowerCase() &&
        t.artist.toLowerCase() === artist.toLowerCase()
      );

      if (!track) return null;

      return {
        title: track.title,
        artist: track.artist,
        bpm: track.bpm,
        key: track.key,
        source: 'serato'
      };
    } catch (error) {
      console.error('Error finding track in Serato:', error);
      return null;
    }
  }

  private parseSeratoDatabase(buffer: Buffer): SeratoTrack[] {
    const tracks: SeratoTrack[] = [];
    let offset = 0;

    // Serato database V2 format parsing
    // Header: 4 bytes signature "Vrsn" + 4 bytes version
    if (buffer.toString('ascii', 0, 4) !== 'Vrsn') {
      throw new Error('Invalid Serato database format');
    }

    offset = 8; // Skip header

    while (offset < buffer.length) {
      try {
        // Each track entry starts with size (4 bytes)
        const entrySize = buffer.readUInt32BE(offset);
        offset += 4;

        if (entrySize === 0) break;

        // Parse track entry
        const track = this.parseTrackEntry(buffer.slice(offset, offset + entrySize));
        if (track) {
          tracks.push(track);
        }

        offset += entrySize;
      } catch (error) {
        console.error('Error parsing track entry:', error);
        break;
      }
    }

    return tracks;
  }

  private parseTrackEntry(buffer: Buffer): SeratoTrack | null {
    try {
      let offset = 0;

      // Read string length + string for each field
      const readString = () => {
        const length = buffer.readUInt16BE(offset);
        offset += 2;
        const value = buffer.toString('utf8', offset, offset + length);
        offset += length;
        return value;
      };

      const filePath = readString();
      const title = readString();
      const artist = readString();
      
      // Read BPM (stored as fixed-point number)
      const bpmRaw = buffer.readUInt32BE(offset);
      offset += 4;
      const bpm = bpmRaw > 0 ? bpmRaw / 100 : null;

      // Read key
      const key = readString();

      return {
        filePath,
        title,
        artist,
        bpm,
        key: key || null
      };
    } catch (error) {
      console.error('Error parsing track entry:', error);
      return null;
    }
  }
}