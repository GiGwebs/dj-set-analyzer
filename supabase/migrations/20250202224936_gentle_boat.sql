-- Add initial test tracks
INSERT INTO tracks (title, artist, bpm, key)
VALUES
  ('Billie Jean', 'Michael Jackson', 117, 'F#m'),
  ('Beat It', 'Michael Jackson', 139, 'Em'),
  ('Black or White', 'Michael Jackson', 115, 'E'),
  ('Smooth Criminal', 'Michael Jackson', 118, 'Am');

-- Add transitions between tracks
INSERT INTO transitions (from_track_id, to_track_id, frequency)
SELECT 
  t1.id as from_track_id,
  t2.id as to_track_id,
  CASE 
    WHEN t1.title = 'Billie Jean' AND t2.title = 'Beat It' THEN 3
    WHEN t1.title = 'Beat It' AND t2.title = 'Black or White' THEN 2
    ELSE 1
  END as frequency
FROM tracks t1
CROSS JOIN tracks t2
WHERE t1.title != t2.title
AND t1.title IN ('Billie Jean', 'Beat It', 'Black or White')
AND t2.title IN ('Beat It', 'Black or White', 'Smooth Criminal');