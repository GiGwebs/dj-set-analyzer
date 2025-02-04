-- Drop existing transitions table
DROP TABLE IF EXISTS transitions CASCADE;

-- Recreate transitions table with proper constraints
CREATE TABLE transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_track_id uuid NOT NULL,
  to_track_id uuid NOT NULL,
  frequency integer DEFAULT 1 NOT NULL,
  CONSTRAINT transitions_from_track_id_fkey FOREIGN KEY (from_track_id) REFERENCES tracks(id) ON DELETE CASCADE,
  CONSTRAINT transitions_to_track_id_fkey FOREIGN KEY (to_track_id) REFERENCES tracks(id) ON DELETE CASCADE,
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