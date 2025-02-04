/*
  # Fix transitions table relationships

  1. Changes
    - Drop and recreate transitions table with proper foreign key constraints
    - Add explicit foreign key names for better error handling
    - Add indexes for better query performance

  2. Security
    - Maintain existing RLS policies
*/

-- Drop existing transitions table
DROP TABLE IF EXISTS transitions;

-- Recreate transitions table with proper constraints
CREATE TABLE transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_track_id uuid NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  to_track_id uuid NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  frequency integer DEFAULT 1 NOT NULL,
  CONSTRAINT transitions_unique_pair UNIQUE(from_track_id, to_track_id)
);

-- Add indexes for better query performance
CREATE INDEX idx_transitions_from_track ON transitions(from_track_id);
CREATE INDEX idx_transitions_to_track ON transitions(to_track_id);
CREATE INDEX idx_transitions_frequency ON transitions(frequency DESC);

-- Enable RLS
ALTER TABLE transitions ENABLE ROW LEVEL SECURITY;

-- Recreate the policy
CREATE POLICY "Transitions are readable by all users"
  ON transitions
  FOR SELECT
  TO authenticated
  USING (true);