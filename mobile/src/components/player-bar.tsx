import { Text, View } from 'react-native';
import { colors } from '../theme';
import { formatTime } from '../spotify/data';
import { Cover, IconButton, s } from './ui';
import type { usePlayer } from '../spotify/use-player';
export function PlayerBar({ player, compact, onDevices }: { player: ReturnType<typeof usePlayer>; compact: boolean; onDevices: () => void }) {
  const state = player.playback;
  const track = state?.item;
  const disabled = !track || player.busy;
  const disallowed = state?.actions?.disallows ?? {};
  return <View style={{ backgroundColor: colors.canvas, borderTopWidth: 1, borderColor: colors.border, paddingVertical: compact ? 10 : 16, paddingHorizontal: compact ? 16 : 24, gap: 10 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: compact ? 12 : 30 }}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', flex: 1, minWidth: 0 }}><Cover uri={track?.album?.images?.[0]?.url} size={compact ? 42 : 52} /><View style={{ flex: 1, gap: 4, minWidth: 0 }}><Text numberOfLines={1} style={s.label}>{track?.name ?? 'Chưa có bài đang phát'}</Text><Text numberOfLines={1} style={s.caption}>{track?.artists?.map(a => a.name).join(', ') ?? 'Kết nối Spotify để bắt đầu nghe'}</Text></View></View>
      <View style={{ flex: compact ? undefined : 1.5, alignItems: 'center', gap: 6 }}>
        <View style={{ flexDirection: 'row', gap: compact ? 0 : 6, alignItems: 'center' }}>
          {!compact && <IconButton name="shuffle" label="Bật/tắt phát ngẫu nhiên" disabled={disabled || disallowed.toggling_shuffle} active={state?.shuffle_state} onPress={() => void player.command('/me/player/shuffle?state=' + !state?.shuffle_state)} />}
          {!compact && <IconButton name="previous" label="Bài trước" disabled={disabled || disallowed.skipping_prev} onPress={() => void player.command('/me/player/previous', 'POST')} />}
          <IconButton large name={state?.is_playing ? 'pause' : 'play'} label={state?.is_playing ? 'Tạm dừng' : 'Phát tiếp'} disabled={disabled || (state?.is_playing ? disallowed.pausing : disallowed.resuming)} onPress={() => void player.command(state?.is_playing ? '/me/player/pause' : '/me/player/play')} />
          <IconButton name="next" label="Bài tiếp theo" disabled={disabled || disallowed.skipping_next} onPress={() => void player.command('/me/player/next', 'POST')} />
          {!compact && <IconButton name="repeat" label="Chuyển chế độ lặp lại" disabled={disabled || disallowed.toggling_repeat_context} active={state?.repeat_state !== undefined && state.repeat_state !== 'off'} onPress={() => void player.command('/me/player/repeat?state=' + (state?.repeat_state === 'off' ? 'context' : state?.repeat_state === 'context' ? 'track' : 'off'))} />}
        </View>
        {!compact && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%', maxWidth: 520 }}><Text style={s.caption}>{formatTime(state?.progress_ms)}</Text><View accessibilityLabel="Tiến trình phát nhạc" style={{ height: 3, flex: 1, backgroundColor: colors.raised, borderRadius: 2 }}><View style={{ height: 3, width: `${track ? Math.min(100, Math.max(0, (state?.progress_ms ?? 0) / (track.duration_ms || 1) * 100)) : 0}%`, backgroundColor: colors.green, borderRadius: 2 }} /></View><Text style={s.caption}>{formatTime(track?.duration_ms)}</Text></View>}
      </View>
      {!compact && <View style={{ flex: 1, alignItems: 'flex-end' }}><IconButton name="device" label="Chọn thiết bị và điều khiển phát nhạc" onPress={onDevices} active={Boolean(state?.device?.id)} /><Text numberOfLines={1} style={s.caption}>{state?.device?.name ?? 'Chọn thiết bị'}</Text></View>}
    </View>
    {compact && <View style={{ height: 2, backgroundColor: colors.raised }}><View style={{ height: 2, backgroundColor: colors.green, width: `${track ? Math.min(100, (state?.progress_ms ?? 0) / (track.duration_ms || 1) * 100) : 0}%` }} /></View>}
  </View>;
}
