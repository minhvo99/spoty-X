export interface Cover { url: string; }
export interface Track { id: string; uri: string; name: string; type: string; duration_ms: number; is_local?: boolean; is_playable?: boolean; artists?: { name: string }[]; album?: { name: string; images: Cover[] }; external_urls?: { spotify?: string }; }
export interface Playlist { id: string; uri: string; name: string; description?: string; images?: Cover[]; owner?: { id?: string; display_name?: string }; items?: { total: number }; tracks?: { total: number }; external_urls?: { spotify?: string }; }
export interface Profile { id: string; display_name?: string; images?: Cover[]; }
export interface Page<T> { items: T[]; next: string | null; total: number; }
export interface PlaylistItem { item?: Track | null; track?: Track | null; }
export interface Device { id: string | null; name: string; type: string; is_active: boolean; is_restricted?: boolean; }
export interface Playback { item: Track | null; is_playing: boolean; progress_ms: number | null; shuffle_state: boolean; repeat_state: 'off' | 'context' | 'track'; device?: Device; actions?: { disallows?: Record<string, boolean> }; }
