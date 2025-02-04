export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          created_at: string
        }
        Insert: {
          id: string
          email: string
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          created_at?: string
        }
      }
      playlists: {
        Row: {
          id: string
          user_id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          created_at?: string
        }
      }
      tracks: {
        Row: {
          id: string
          title: string
          artist: string
          bpm: number | null
          key: string | null
          timestamp: string
        }
        Insert: {
          id?: string
          title: string
          artist: string
          bpm?: number | null
          key?: string | null
          timestamp?: string
        }
        Update: {
          id?: string
          title?: string
          artist?: string
          bpm?: number | null
          key?: string | null
          timestamp?: string
        }
      }
      playlist_tracks: {
        Row: {
          id: string
          playlist_id: string
          track_id: string
          position: number
        }
        Insert: {
          id?: string
          playlist_id: string
          track_id: string
          position: number
        }
        Update: {
          id?: string
          playlist_id?: string
          track_id?: string
          position?: number
        }
      }
      transitions: {
        Row: {
          id: string
          from_track_id: string
          to_track_id: string
          frequency: number
        }
        Insert: {
          id?: string
          from_track_id: string
          to_track_id: string
          frequency?: number
        }
        Update: {
          id?: string
          from_track_id?: string
          to_track_id?: string
          frequency?: number
        }
      }
      user_preferences: {
        Row: {
          id: string
          user_id: string
          export_format: string
        }
        Insert: {
          id?: string
          user_id: string
          export_format?: string
        }
        Update: {
          id?: string
          user_id?: string
          export_format?: string
        }
      }
    }
  }
}