import { Pressable, Text, View } from 'react-native';
import { colors } from '../theme';
import { formatTime, isPlayable } from '../spotify/data';
import type { Track } from '../spotify/types';
import { Cover, s } from './ui';
import { Icon } from './icon';
export function TrackRow({ track, index, active, onPlay, compact }: { track: Track; index: number; active: boolean; onPlay: () => void; compact: boolean }) {
  const disabled = !isPlayable(track);
  return <Pressable accessibilityRole="button" accessibilityLabel={`Phát ${track.name}, ${track.artists?.map(a => a.name).join(', ') ?? ''}`} accessibilityState={{ disabled, selected: active }} disabled={disabled} onPress={onPlay} style={({ hovered, pressed }: { pressed: boolean; hovered?: boolean }) => [{ flexDirection: 'row', gap: 16, paddingVertical: 11, paddingHorizontal: compact ? 0 : 12, alignItems: 'center', borderRadius: 8, backgroundColor: active ? '#173222' : hovered || pressed ? colors.raised : 'transparent', opacity: disabled ? 0.4 : 1 }]}>
    {!compact && <View style={{ width: 24, alignItems: 'center' }}>{active ? <Icon name="music" size={16} color={colors.green} /> : <Text style={s.caption}>{index + 1}</Text>}</View>}
    <Cover uri={track.album?.images?.[0]?.url} size={44} />
    <View style={{ flex: 1, minWidth: 0, gap: 5 }}><Text numberOfLines={1} style={[s.label, active && { color: colors.green }]}>{track.name}</Text><Text numberOfLines={1} style={s.caption}>{track.artists?.map(a => a.name).join(', ') || 'Nghệ sĩ chưa xác định'}</Text></View>
    {!compact && <Text numberOfLines={1} style={[s.caption, { width: '28%' }]}>{track.album?.name ?? ''}</Text>}
    <Text style={[s.caption, { fontVariant: ['tabular-nums'] }]}>{formatTime(track.duration_ms)}</Text>
  </Pressable>;
}
