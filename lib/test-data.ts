import { supabase } from './supabase/client';

export async function addTestData() {
  try {
    // 1. Add test tracks
    const { data: track1, error: error1 } = await supabase
      .from('tracks')
      .insert([
        {
          title: 'Billie Jean',
          artist: 'Michael Jackson',
          bpm: 117,
          key: 'F#m'
        }
      ])
      .select()
      .single();

    if (error1) throw error1;
    console.log('Added track 1:', track1);

    const { data: track2, error: error2 } = await supabase
      .from('tracks')
      .insert([
        {
          title: 'Beat It',
          artist: 'Michael Jackson',
          bpm: 139,
          key: 'Em'
        }
      ])
      .select()
      .single();

    if (error2) throw error2;
    console.log('Added track 2:', track2);

    // 2. Create a transition between them
    const { data: transition, error: transitionError } = await supabase
      .from('transitions')
      .insert([
        {
          from_track_id: track1.id,
          to_track_id: track2.id,
          frequency: 3
        }
      ])
      .select();

    if (transitionError) throw transitionError;
    console.log('Added transition:', transition);

    return { track1, track2, transition };
  } catch (error) {
    console.error('Error adding test data:', error);
    throw error;
  }
}

// Execute the function
addTestData()
  .then(result => {
    console.log('Successfully added test data:', result);
  })
  .catch(error => {
    console.error('Failed to add test data:', error);
  });