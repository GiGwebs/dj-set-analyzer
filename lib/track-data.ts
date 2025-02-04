import { supabase } from './supabase/client';

export async function addTrackAndTransition() {
  try {
    // 1. Add a new track
    const { data: newTrack, error: trackError } = await supabase
      .from('tracks')
      .insert([
        {
          title: 'Smooth Criminal',
          artist: 'Michael Jackson',
          bpm: 118,
          key: 'Am'
        }
      ])
      .select()
      .single();

    if (trackError) {
      console.error('Error adding track:', trackError);
      throw trackError;
    }

    console.log('Successfully added track:', newTrack);

    // 2. Get the "Black or White" track ID
    const { data: fromTrack, error: fromTrackError } = await supabase
      .from('tracks')
      .select('id')
      .eq('title', 'Black or White')
      .single();

    if (fromTrackError) {
      console.error('Error finding source track:', fromTrackError);
      throw fromTrackError;
    }

    // 3. Create a transition between the tracks
    const { data: transition, error: transitionError } = await supabase
      .from('transitions')
      .insert([
        {
          from_track_id: fromTrack.id,
          to_track_id: newTrack.id,
          frequency: 1
        }
      ])
      .select();

    if (transitionError) {
      console.error('Error creating transition:', transitionError);
      throw transitionError;
    }

    console.log('Successfully created transition:', transition);
    return { newTrack, transition };
  } catch (error) {
    console.error('Error in addTrackAndTransition:', error);
    throw error;
  }
}

// Execute the function
addTrackAndTransition()
  .then(result => {
    console.log('Operation completed successfully:', result);
  })
  .catch(error => {
    console.error('Operation failed:', error);
  });