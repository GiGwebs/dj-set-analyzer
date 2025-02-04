import { readFile } from 'fs/promises';
import { XMLParser } from 'fast-xml-parser';
import type { DJSoftwareReader } from './index';
import type { TrackMetadata } from '../track-analyzer';

export class VirtualDJReader implements DJSoftwareReader {
  name = 'VirtualDJ';
  private dbPath: string;
  private parser: XMLParser;

  constructor() {
    const isWindows = process.platform === 'win32';
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    
    this.dbPath = isWindows
      ? `${homeDir}\\Documents\\VirtualDJ\\database.xml`
      : `${homeDir}/Documents/VirtualDJ/database.xml`;

    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: ''
    });
  }

  async readDatabase(): Promise<TrackMetadata[]> {
    try {
      const xml = await readFile(this.dbPath, 'utf-8');
      const data = this.parser.parse(xml);
      
      const tracks = data.VirtualDJ_Database.Songs.Song || [];
      return tracks.map((track: any) => ({
        title: track.title || '',
        artist: track.artist || '',
        bpm: track.bpm ? parseFloat(track.bpm) : null,
        key: track.key || null,
        source: 'virtualdj'
      }));
    } catch (error) {
      console.error('Error reading VirtualDJ database:', error);
      return [];
    }
  }

  async findTrack(artist: string, title: string): Promise<TrackMetadata | null> {
    try {
      const xml = await readFile(this.dbPath, 'utf-8');
      const data = this.parser.parse(xml);
      
      const tracks = data.VirtualDJ_Database.Songs.Song || [];
      const track = tracks.find((t: any) => 
        t.title?.toLowerCase() === title.toLowerCase() &&
        t.artist?.toLowerCase() === artist.toLowerCase()
      );

      if (!track) return null;

      return {
        title: track.title,
        artist: track.artist,
        bpm: track.bpm ? parseFloat(track.bpm) : null,
        key: track.key || null,
        source: 'virtualdj'
      };
    } catch (error) {
      console.error('Error finding track in VirtualDJ:', error);
      return null;
    }
  }
}