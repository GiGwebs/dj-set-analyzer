/*
  # Create tracks table
  
  1. New Tables
    - `tracks`
      - `id` (uuid, primary key)
      - `title` (text, required)
      - `artist` (text, required) 
      - `bpm` (numeric, optional) - Stored as decimal for precise BPM values
      - `key` (text, optional) - Musical key
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on tracks table
    - Add policies for authenticated users to read tracks
*/

-- Create tracks table
CREATE TABLE tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  artist text NOT NULL,
  bpm numeric,
  key text,
  created_at timestamptz DEFAULT now()
);

-- Add helpful table comment
COMMENT ON TABLE tracks IS 'Stores track metadata including BPM and musical key information';

-- Add column comments
COMMENT ON COLUMN tracks.title IS 'Track title';
COMMENT ON COLUMN tracks.artist IS 'Track artist';
COMMENT ON COLUMN tracks.bpm IS 'Beats per minute (can include decimals)';
COMMENT ON COLUMN tracks.key IS 'Musical key in standard notation';

-- Enable RLS
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Tracks are readable by all users"
  ON tracks
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert tracks"
  ON tracks
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add indexes for common queries
CREATE INDEX idx_tracks_title_artist ON tracks(title, artist);
CREATE INDEX idx_tracks_bpm ON tracks(bpm);
CREATE INDEX idx_tracks_key ON tracks(key);