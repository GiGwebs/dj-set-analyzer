import { supabase } from './supabase/client';
import { TrackAnalyzer } from './track-analyzer';

export interface Track {
  id: string;
  title: string;
  artist: string;
  bpm: number | null;
  key: string | null;
}

export interface PlaylistTrack extends Track {
  position: number;
}

export interface PlaylistOptions {
  targetLength?: number;
  maxBpmChange?: number;
  preferHarmonicMixing?: boolean;
  energyMode?: 'smooth' | 'dynamic' | 'high';
}

export class PlaylistGenerator {
  private static readonly DEFAULT_OPTIONS: PlaylistOptions = {
    targetLength: 10,
    maxBpmChange: 8,
    preferHarmonicMixing: true,
    energyMode: 'smooth'
  };

  private static readonly COMPATIBLE_KEYS = {
    0: 1.0,   // Same key
    7: 0.8,   // Perfect fifth
    5: 0.8,   // Perfect fourth
    3: 0.7,   // Relative major/minor
    12: 0.6   // Parallel major/minor
  };

  private static readonly ENERGY_PROFILES = {
    smooth: {
      bpmIncrease: 2,
      bpmVariance: 4,
      weight: 1.5
    },
    dynamic: {
      bpmIncrease: 4,
      bpmVariance: 8,
      weight: 1.0
    },
    high: {
      bpmIncrease: 6,
      bpmVariance: 12,
      weight: 2.0
    }
  };

  static async generatePlaylist(
    seedTrackId: string,
    options: PlaylistOptions = {}
  ): Promise<PlaylistTrack[]> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    const playlist: PlaylistTrack[] = [];
    
    const { data: seedTrack } = await supabase
      .from('tracks')
      .select('*')
      .eq('id', seedTrackId)
      .single();

    if (!seedTrack) {
      throw new Error('Seed track not found');
    }

    playlist.push({
      ...seedTrack,
      position: 0
    });

    const { data: tracks } = await supabase
      .from('tracks')
      .select('*');

    const { data: transitions } = await supabase
      .from('transitions')
      .select('*');

    if (!tracks || !transitions) {
      throw new Error('Failed to fetch tracks or transitions');
    }

    const transitionGraph = new Map<string, Map<string, number>>();
    transitions.forEach(t => {
      if (!transitionGraph.has(t.from_track_id)) {
        transitionGraph.set(t.from_track_id, new Map());
      }
      transitionGraph.get(t.from_track_id)?.set(t.to_track_id, t.frequency);
    });

    while (playlist.length < opts.targetLength) {
      const lastTrack = playlist[playlist.length - 1];
      const nextTrack = await this.findNextTrack(
        lastTrack,
        tracks.filter(t => !playlist.some(p => p.id === t.id)),
        transitionGraph,
        opts,
        playlist
      );

      if (!nextTrack) break;

      playlist.push({
        ...nextTrack,
        position: playlist.length
      });
    }

    return playlist;
  }

  private static async findNextTrack(
    currentTrack: Track,
    candidates: Track[],
    transitionGraph: Map<string, Map<string, number>>,
    options: PlaylistOptions,
    currentPlaylist: PlaylistTrack[]
  ): Promise<Track | null> {
    const energyProfile = this.ENERGY_PROFILES[options.energyMode || 'smooth'];
    
    const scores = candidates.map(track => {
      let score = 0;

      // Factor 1: Transition history (weighted heavily)
      const transitionFrequency = transitionGraph.get(currentTrack.id)?.get(track.id) || 0;
      score += Math.log(transitionFrequency + 1) * 3;

      // Factor 2: BPM progression and energy flow
      if (currentTrack.bpm && track.bpm) {
        const bpmDiff = track.bpm - currentTrack.bpm;
        const idealBpmIncrease = energyProfile.bpmIncrease;
        
        // Score based on how close we are to ideal BPM progression
        if (Math.abs(bpmDiff) <= energyProfile.bpmVariance) {
          const progressionScore = 1 - Math.abs(bpmDiff - idealBpmIncrease) / energyProfile.bpmVariance;
          score += progressionScore * energyProfile.weight;
        }

        // Penalize extreme BPM changes
        if (Math.abs(bpmDiff) > options.maxBpmChange!) {
          score -= 2;
        }
      }

      // Factor 3: Key compatibility with enhanced harmonic mixing
      if (options.preferHarmonicMixing && currentTrack.key && track.key) {
        const currentKeyNum = this.keyToNumber(currentTrack.key);
        const nextKeyNum = this.keyToNumber(track.key);
        
        if (currentKeyNum !== null && nextKeyNum !== null) {
          const semitones = (nextKeyNum - currentKeyNum + 12) % 12;
          const compatibility = this.COMPATIBLE_KEYS[semitones as keyof typeof this.COMPATIBLE_KEYS] || 0;
          score += compatibility * 2;
        }
      }

      // Factor 4: Overall energy curve
      const playlistLength = currentPlaylist.length;
      if (playlistLength > 2 && track.bpm) {
        const avgBpm = currentPlaylist.reduce((sum, t) => sum + (t.bpm || 0), 0) / playlistLength;
        const targetBpm = avgBpm + (energyProfile.bpmIncrease * (playlistLength / 5));
        const bpmDiff = Math.abs(track.bpm - targetBpm);
        score += 1 - (bpmDiff / (energyProfile.bpmVariance * 2));
      }

      return { track, score };
    });

    // Sort by score and apply weighted random selection
    scores.sort((a, b) => b.score - a.score);
    const topTracks = scores.slice(0, 3);
    
    if (topTracks.length === 0) return null;

    const totalScore = topTracks.reduce((sum, t) => sum + Math.max(0.1, t.score), 0);
    const random = Math.random() * totalScore;
    let accumulator = 0;

    for (const { track, score } of topTracks) {
      accumulator += Math.max(0.1, score);
      if (random <= accumulator) {
        return track;
      }
    }

    return topTracks[0].track;
  }

  private static keyToNumber(key: string): number | null {
    const normalized = TrackAnalyzer.normalizeKey(key);
    const match = normalized.match(/^(\d{1,2})([AB])$/);
    
    if (!match) return null;
    
    const [, number, letter] = match;
    const baseNumber = parseInt(number) - 1;
    const isMinor = letter === 'A';
    
    return (baseNumber * 2) + (isMinor ? 0 : 1);
  }

  static async savePlaylist(
    name: string,
    tracks: PlaylistTrack[],
    userId: string
  ): Promise<string> {
    const { data: playlist, error: playlistError } = await supabase
      .from('playlists')
      .insert([{ name, user_id: userId }])
      .select()
      .single();

    if (playlistError || !playlist) {
      throw new Error('Failed to create playlist');
    }

    const { error: tracksError } = await supabase
      .from('playlist_tracks')
      .insert(
        tracks.map(track => ({
          playlist_id: playlist.id,
          track_id: track.id,
          position: track.position
        }))
      );

    if (tracksError) {
      throw new Error('Failed to add tracks to playlist');
    }

    return playlist.id;
  }

  static async exportPlaylist(
    tracks: PlaylistTrack[],
    format: 'rekordbox' | 'virtualdj' | 'm3u'
  ): Promise<string> {
    switch (format) {
      case 'rekordbox':
        return this.exportToRekordbox(tracks);
      case 'virtualdj':
        return this.exportToVirtualDJ(tracks);
      case 'm3u':
        return this.exportToM3U(tracks);
      default:
        throw new Error('Unsupported export format');
    }
  }

  private static async exportToRekordbox(tracks: PlaylistTrack[]): Promise<string> {
    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<DJ_PLAYLISTS Version="1.0.0">',
      '  <COLLECTION Entries="' + tracks.length + '">',
      ...tracks.map((track, index) => `
        <TRACK TrackID="${index + 1}"
               Name="${this.escapeXml(track.title)}"
               Artist="${this.escapeXml(track.artist)}"
               ${track.bpm ? `Tempo="${track.bpm}"` : ''}
               ${track.key ? `Tonality="${this.escapeXml(track.key)}"` : ''}
        />`),
      '  </COLLECTION>',
      '</DJ_PLAYLISTS>'
    ].join('\n');

    return xml;
  }

  private static async exportToVirtualDJ(tracks: PlaylistTrack[]): Promise<string> {
    const csv = [
      'Title,Artist,BPM,Key',
      ...tracks.map(track => 
        `"${this.escapeCsv(track.title)}","${this.escapeCsv(track.artist)}",${track.bpm || ''},${track.key || ''}`
      )
    ].join('\n');

    return csv;
  }

  private static async exportToM3U(tracks: PlaylistTrack[]): Promise<string> {
    return [
      '#EXTM3U',
      ...tracks.map(track => [
        `#EXTINF:-1,${track.artist} - ${track.title}`,
        `#EXTALB:${track.bpm || ''} BPM, Key: ${track.key || 'Unknown'}`
      ]).flat()
    ].join('\n');
  }

  private static escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private static escapeCsv(str: string): string {
    return str.replace(/"/g, '""');
  }
}