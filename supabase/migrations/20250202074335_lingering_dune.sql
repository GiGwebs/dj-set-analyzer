/*
  # Fix transitions table foreign key relationships

  1. Changes
    - Drop and recreate transitions table with named foreign key constraints
    - Add proper indexes for performance
    - Enable RLS with appropriate policies
    - Add explicit foreign key names for PostgREST

  2. Security
    - Maintain existing RLS policies
    - Ensure proper cascade behavior on deletes
*/

-- Drop existing transitions table
DROP TABLE IF EXISTS transitions CASCADE;

-- Recreate transitions table with explicit foreign key constraints
CREATE TABLE transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_track_id uuid NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  to_track_id uuid NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  frequency integer DEFAULT 1 NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT transitions_unique_pair UNIQUE (from_track_id, to_track_id)
);

-- Add explicit foreign key names for PostgREST
ALTER TABLE transitions 
  DROP CONSTRAINT transitions_from_track_id_fkey,
  ADD CONSTRAINT fk_from_track 
    FOREIGN KEY (from_track_id) 
    REFERENCES tracks(id) 
    ON DELETE CASCADE;

ALTER TABLE transitions 
  DROP CONSTRAINT transitions_to_track_id_fkey,
  ADD CONSTRAINT fk_to_track 
    FOREIGN KEY (to_track_id) 
    REFERENCES tracks(id) 
    ON DELETE CASCADE;

-- Add indexes for better query performance
CREATE INDEX idx_transitions_from_track ON transitions(from_track_id);
CREATE INDEX idx_transitions_to_track ON transitions(to_track_id);
CREATE INDEX idx_transitions_frequency ON transitions(frequency DESC);

-- Enable RLS
ALTER TABLE transitions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Transitions are readable by all users"
  ON transitions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert transitions"
  ON transitions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update transition frequency"
  ON transitions
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);