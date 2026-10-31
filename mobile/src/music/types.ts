export interface Track {
  id: string;
  title: string;
  artist: string;
  collection: string;
  genre: string;
  color: string;
  source: string | number;
  duration?: number;
  imported?: boolean;
  credit?: string;
}
export interface ImportedTrack {
  id: string;
  title: string;
  artist: string;
  collection: string;
  genre: string;
  color: string;
  fileName: string;
}
export interface Playlist {
  id: string;
  name: string;
  trackIds: string[];
}
export interface Library {
  favorites: string[];
  playlists: Playlist[];
  recentSearches: string[];
  recentlyPlayed: string[];
  imports: ImportedTrack[];
  volume: number;
}
export type SearchFilter = "all" | "songs" | "artists" | "collections";
export type RepeatMode = "off" | "all" | "one";
