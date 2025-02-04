import { supabase } from './supabase/client';
import { PlaylistGenerator, PlaylistTrack } from './playlist-generator';
import { TrackAnalyzer } from './track-analyzer';

export interface AIPlaylistOptions {
  targetLength?: number;
  maxBpmChange?: number;
  preferHarmonicMixing?: boolean;
  energyMode?: 'smooth' | 'dynamic' | 'high';
  style?: 'balanced' | 'experimental' | 'safe';
  mood?: 'energetic' | 'chill' | 'progressive';
  transitionComplexity?: 'simple' | 'moderate' | 'complex';
}

interface TransitionInsight {
  fromTrack: PlaylistTrack;
  toTrack: PlaylistTrack;
  confidence: number;
  reasons: {
    type: 'bpm' | 'key' | 'history' | 'energy';
    score: number;
    description: string;
  }[];
  alternatives: {
    track: PlaylistTrack;
    score: number;
    reasons: string[];
  }[];
}

export class AIPlaylistGenerator {
  static async generateAIPlaylist(
    seedTrackId: string,
    options: AIPlaylistOptions = {}
  ): Promise<PlaylistTrack[]> {
    // First generate a base playlist
    const basePlaylist = await PlaylistGenerator.generatePlaylist(seedTrackId, {
      targetLength: options.targetLength,
      maxBpmChange: options.maxBpmChange,
      preferHarmonicMixing: options.preferHarmonicMixing,
      energyMode: options.energyMode
    });

    // Apply AI enhancements based on style and mood
    const enhancedPlaylist = await this.enhancePlaylist(basePlaylist, options);

    return enhancedPlaylist;
  }

  static async getPlaylistInsights(
    playlist: PlaylistTrack[]
  ): Promise<TransitionInsight[]> {
    const insights: TransitionInsight[] = [];

    for (let i = 0; i < playlist.length - 1; i++) {
      const current = playlist[i];
      const next = playlist[i + 1];

      // Get transition analysis
      const analysis = await this.analyzeTransition(current, next);
      
      // Get alternative transitions
      const alternatives = await this.findAlternativeTransitions(current, playlist);

      insights.push({
        fromTrack: current,
        toTrack: next,
        confidence: analysis.confidence,
        reasons: analysis.reasons,
        alternatives
      });
    }

    return insights;
  }

  private static async enhancePlaylist(
    playlist: PlaylistTrack[],
    options: AIPlaylistOptions
  ): Promise<PlaylistTrack[]> {
    const enhanced = [...playlist];

    // Apply style-based modifications
    switch (options.style) {
      case 'experimental':
        // Increase variety in transitions
        enhanced.sort((a, b) => 
          (b.bpm || 0) - (a.bpm || 0)
        );
        break;
      case 'safe':
        // Prioritize proven transitions
        enhanced.sort((a, b) => 
          (a.bpm || 0) - (b.bpm || 0)
        );
        break;
    }

    // Apply mood-based adjustments
    switch (options.mood) {
      case 'energetic':
        // Front-load high energy tracks
        enhanced.sort((a, b) => 
          (b.bpm || 0) - (a.bpm || 0)
        );
        break;
      case 'chill':
        // Maintain consistent, lower energy
        enhanced.sort((a, b) => 
          (a.bpm || 0) - (b.bpm || 0)
        );
        break;
      case 'progressive':
        // Gradual energy build
        // Already handled by base playlist generator
        break;
    }

    // Reposition tracks based on transition complexity
    if (options.transitionComplexity === 'complex') {
      // Add more dramatic transitions
      enhanced.sort((a, b) => 
        ((b.bpm || 0) - (a.bpm || 0)) * 
        (Math.random() > 0.5 ? 1 : -1)
      );
    }

    // Update positions
    return enhanced.map((track, index) => ({
      ...track,
      position: index
    }));
  }

  private static async analyzeTransition(
    current: PlaylistTrack,
    next: PlaylistTrack
  ): Promise<{
    confidence: number;
    reasons: { type: string; score: number; description: string; }[];
  }> {
    const reasons = [];
    let totalScore = 0;

    // Analyze BPM compatibility
    if (current.bpm && next.bpm) {
      const bpmDiff = Math.abs(current.bpm - next.bpm);
      const bpmScore = Math.max(0, 1 - (bpmDiff / 16));
      reasons.push({
        type: 'bpm',
        score: bpmScore,
        description: `BPM change of ${bpmDiff.toFixed(1)} BPM`
      });
      totalScore += bpmScore;
    }

    // Analyze key compatibility
    if (current.key && next.key) {
      const keyScore = await this.calculateKeyCompatibility(current.key, next.key);
      reasons.push({
        type: 'key',
        score: keyScore,
        description: `Key change from ${current.key} to ${next.key}`
      });
      totalScore += keyScore;
    }

    // Check transition history
    const historyScore = await this.getHistoricalTransitionScore(current.id, next.id);
    reasons.push({
      type: 'history',
      score: historyScore,
      description: historyScore > 0.7 
        ? 'Frequently used transition'
        : historyScore > 0.3
        ? 'Sometimes used transition'
        : 'New transition combination'
    });
    totalScore += historyScore;

    // Calculate energy flow
    const energyScore = this.calculateEnergyFlow(current, next);
    reasons.push({
      type: 'energy',
      score: energyScore,
      description: `Energy progression ${
        energyScore > 0.7 ? 'optimal' : 
        energyScore > 0.4 ? 'acceptable' : 
        'needs improvement'
      }`
    });
    totalScore += energyScore;

    return {
      confidence: totalScore / reasons.length,
      reasons
    };
  }

  private static async findAlternativeTransitions(
    fromTrack: PlaylistTrack,
    currentPlaylist: PlaylistTrack[]
  ): Promise<{
    track: PlaylistTrack;
    score: number;
    reasons: string[];
  }[]> {
    const { data: candidates } = await supabase
      .from('tracks')
      .select('*')
      .not('id', 'in', `(${currentPlaylist.map(t => t.id).join(',')})`)
      .limit(3);

    if (!candidates) return [];

    const alternatives = await Promise.all(
      candidates.map(async (track) => {
        const analysis = await this.analyzeTransition(fromTrack, track as PlaylistTrack);
        
        return {
          track: track as PlaylistTrack,
          score: analysis.confidence,
          reasons: analysis.reasons
            .filter(r => r.score > 0.6)
            .map(r => r.description)
        };
      })
    );

    return alternatives.sort((a, b) => b.score - a.score);
  }

  private static async getHistoricalTransitionScore(
    fromId: string,
    toId: string
  ): Promise<number> {
    const { data } = await supabase
      .from('transitions')
      .select('frequency')
      .eq('from_track_id', fromId)
      .eq('to_track_id', toId)
      .single();

    if (!data) return 0;
    
    // Normalize frequency score between 0 and 1
    return Math.min(1, data.frequency / 10);
  }

  private static calculateEnergyFlow(
    current: PlaylistTrack,
    next: PlaylistTrack
  ): number {
    if (!current.bpm || !next.bpm) return 0.5;

    const bpmDiff = next.bpm - current.bpm;
    
    // Prefer slight increases in energy
    if (bpmDiff > 0 && bpmDiff <= 8) {
      return 0.8 + (0.2 * (1 - bpmDiff / 8));
    }
    
    // Small decreases are okay
    if (bpmDiff < 0 && bpmDiff >= -4) {
      return 0.6 + (0.2 * (1 - Math.abs(bpmDiff) / 4));
    }
    
    // Larger changes reduce the score
    return Math.max(0.2, 1 - Math.abs(bpmDiff) / 16);
  }

  private static async calculateKeyCompatibility(
    key1: string,
    key2: string
  ): Promise<number> {
    const normalized1 = TrackAnalyzer.normalizeKey(key1);
    const normalized2 = TrackAnalyzer.normalizeKey(key2);
    
    if (normalized1 === normalized2) return 1.0;
    
    // Use Camelot wheel for compatibility
    const keyMap: { [key: string]: number } = {
      '1A': 1, '2A': 2, '3A': 3, '4A': 4, '5A': 5, '6A': 6,
      '7A': 7, '8A': 8, '9A': 9, '10A': 10, '11A': 11, '12A': 12
    };
    
    const num1 = keyMap[normalized1];
    const num2 = keyMap[normalized2];
    
    if (!num1 || !num2) return 0.5;
    
    const distance = Math.min(
      Math.abs(num1 - num2),
      12 - Math.abs(num1 - num2)
    );
    
    // Score based on circle of fifths relationships
    switch (distance) {
      case 0: return 1.0;  // Same key
      case 1: return 0.8;  // Adjacent
      case 2: return 0.6;  // Two steps
      case 3: return 0.7;  // Three steps (relative major/minor)
      case 5: return 0.8;  // Five steps (perfect fourth)
      case 7: return 0.8;  // Seven steps (perfect fifth)
      default: return 0.4;
    }
  }
}