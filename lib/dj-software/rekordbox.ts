import Database from 'better-sqlite3';
import type { DJSoftwareReader } from './index';
import type { TrackMetadata } from '../track-analyzer';

export class RekordboxReader implements DJSoftwareReader {
  name = 'Rekordbox';
  private dbPath: string;

  constructor() {
    // Determine platform-specific path
    const isWindows = process.platform === 'win32';
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    
    this.dbPath = isWindows
      ? `${homeDir}\\Documents\\Pioneer\\rekordbox\\database.db`
      : `${homeDir}/Library/Pioneer/rekordbox/database.db`;
  }

  async readDatabase(): Promise<TrackMetadata[]> {
    try {
      const db = new Database(this.dbPath, { readonly: true });
      
      const tracks = db.prepare(`
        SELECT 
          Title as title,
          Artist as artist,
          BPM as bpm,
          tonality as key
        FROM djmdTrack
        WHERE Title IS NOT NULL 
        AND Artist IS NOT NULL
      `).all();

      db.close();

      return tracks.map(track => ({
        title: track.title,
        artist: track.artist,
        bpm: track.bpm ? parseFloat(track.bpm) : null,
        key: track.key || null,
        source: 'rekordbox'
      }));
    } catch (error) {
      console.error('Error reading Rekordbox database:', error);
      return [];
    }
  }

  async findTrack(artist: string, title: string): Promise<TrackMetadata | null> {
    try {
      const db = new Database(this.dbPath, { readonly: true });
      
      const track = db.prepare(`
        SELECT 
          Title as title,
          Artist as artist,
          BPM as bpm,
          tonality as key
        FROM djmdTrack
        WHERE LOWER(Title) = LOWER(?)
        AND LOWER(Artist) = LOWER(?)
        LIMIT 1
      `).get(title, artist);

      db.close();

      if (!track) return null;

      return {
        title: track.title,
        artist: track.artist,
        bpm: track.bpm ? parseFloat(track.bpm) : null,
        key: track.key || null,
        source: 'rekordbox'
      };
    } catch (error) {
      console.error('Error finding track in Rekordbox:', error);
      return null;
    }
  }
}