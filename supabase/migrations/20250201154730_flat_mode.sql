/*
  # Initial Schema for DJ Set Analyzer
  
  1. New Tables
    - users: Stores user account information
    - playlists: User-created playlists
    - playlist_tracks: Junction table for playlist-track relationships  
    - tracks: Individual tracks with metadata
    - transitions: Track transition data and frequency
    - user_preferences: User export format preferences

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to access their own data
    - Add policies for track/transition data sharing

  3. Notes
    - Using UUID for IDs to ensure uniqueness
    - Timestamps for auditing
    - Foreign key constraints for referential integrity
*/

-- Users table (extends auth.users)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data" 
  ON users
  FOR SELECT 
  TO authenticated 
  USING (auth.uid() = id);

-- Playlists table
CREATE TABLE IF NOT EXISTS playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own playlists"
  ON playlists
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Tracks table
CREATE TABLE IF NOT EXISTS tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  artist text NOT NULL,
  bpm integer,
  key text,
  timestamp timestamptz DEFAULT now()
);

ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tracks are readable by all users"
  ON tracks
  FOR SELECT
  TO authenticated
  USING (true);

-- Playlist_tracks junction table
CREATE TABLE IF NOT EXISTS playlist_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id uuid REFERENCES playlists ON DELETE CASCADE NOT NULL,
  track_id uuid REFERENCES tracks ON DELETE CASCADE NOT NULL,
  position integer NOT NULL
);

ALTER TABLE playlist_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD tracks in own playlists"
  ON playlist_tracks
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM playlists 
      WHERE id = playlist_tracks.playlist_id 
      AND user_id = auth.uid()
    )
  );

-- Transitions table
CREATE TABLE IF NOT EXISTS transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_track_id uuid REFERENCES tracks ON DELETE CASCADE NOT NULL,
  to_track_id uuid REFERENCES tracks ON DELETE CASCADE NOT NULL,
  frequency integer DEFAULT 1 NOT NULL,
  UNIQUE(from_track_id, to_track_id)
);

ALTER TABLE transitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Transitions are readable by all users"
  ON transitions
  FOR SELECT
  TO authenticated
  USING (true);

-- User preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users ON DELETE CASCADE NOT NULL UNIQUE,
  export_format text DEFAULT 'rekordbox' NOT NULL,
  CHECK (export_format IN ('rekordbox', 'virtualdj'))
);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own preferences"
  ON user_preferences
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);