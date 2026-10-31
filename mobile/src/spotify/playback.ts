export interface PlaybackSession {
  connect(): Promise<void>;
  activate(): Promise<void>;
  disconnect(): void;
}
export function createPlayback(onDevice: (id: string | null) => void, onChange: () => void, onError: (message: string) => void): PlaybackSession {
  return { connect: async () => { onDevice(null); }, activate: async () => {}, disconnect: () => {} };
}
