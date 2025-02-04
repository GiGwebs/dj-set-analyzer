import { RekordboxReader } from './rekordbox';
import { SeratoReader } from './serato';
import { VirtualDJReader } from './virtualdj';
import type { TrackMetadata } from '../track-analyzer';

export interface DJSoftwareReader {
  name: string;
  readDatabase(): Promise<TrackMetadata[]>;
  findTrack(artist: string, title: string): Promise<TrackMetadata | null>;
}

export const readers: DJSoftwareReader[] = [
  new RekordboxReader(),
  new SeratoReader(),
  new VirtualDJReader()
];