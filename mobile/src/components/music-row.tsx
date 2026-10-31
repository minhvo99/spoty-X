import { Pressable, Text, View } from "react-native";
import type { Track } from "../music/types";
import { useMusic } from "../music/provider";
import { formatTime } from "../music/model";
import { MusicArt } from "./music-art";
import { Icon } from "./icon";
import { IconButton, s } from "./ui";
import { colors } from "../theme";
export function MusicRow({
  track,
  index = 0,
  ids,
  onAdd,
  onRemove,
  beforePlay,
  compact = false,
}: {
  track: Track;
  index?: number;
  ids?: string[];
  onAdd?: () => void;
  onRemove?: () => void;
  beforePlay?: () => void;
  compact?: boolean;
}) {
  const music = useMusic();
  const active = music.activeTrack?.id === track.id;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: compact ? 2 : 8,
        borderRadius: 8,
        backgroundColor: active ? "#173121" : "transparent",
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Phát ${track.title}`}
        accessibilityState={{ selected: active }}
        onPress={() => {
          beforePlay?.();
          music.play(track, ids);
        }}
        style={({
          pressed,
          hovered,
        }: {
          pressed: boolean;
          hovered?: boolean;
        }) => ({
          flex: 1,
          minWidth: 0,
          flexDirection: "row",
          alignItems: "center",
          gap: compact ? 12 : 16,
          paddingVertical: 11,
          paddingHorizontal: compact ? 4 : 12,
          borderRadius: 8,
          backgroundColor: pressed || hovered ? colors.raised : "transparent",
        })}
      >
        {!compact && (
          <View style={{ width: 22, alignItems: "center" }}>
            {active ? (
              <Icon name="music" color={colors.green} size={16} />
            ) : (
              <Text style={s.caption}>{index + 1}</Text>
            )}
          </View>
        )}
        <MusicArt color={track.color} title={track.title} size={44} />
        <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
          <Text
            numberOfLines={1}
            style={[s.label, active && { color: colors.green }]}
          >
            {track.title}
          </Text>
          <Text numberOfLines={1} style={s.caption}>
            {track.artist}
          </Text>
        </View>
        {!compact && (
          <Text numberOfLines={1} style={[s.caption, { width: "20%" }]}>
            {track.collection}
          </Text>
        )}
        {!compact && (
          <Text style={s.caption}>
            {track.duration === undefined ? "—" : formatTime(track.duration)}
          </Text>
        )}
      </Pressable>
      <IconButton
        name="heart"
        label={
          music.library.favorites.includes(track.id)
            ? `Bỏ thích ${track.title}`
            : `Thích ${track.title}`
        }
        active={music.library.favorites.includes(track.id)}
        disabled={!music.ready}
        onPress={() => void music.like(track.id)}
      />
      {onAdd && (
        <IconButton
          name="plus"
          label={`Thêm ${track.title} vào playlist`}
          onPress={onAdd}
        />
      )}
      {onRemove && (
        <IconButton
          name="close"
          label={`Gỡ ${track.title} khỏi danh sách`}
          onPress={onRemove}
        />
      )}
    </View>
  );
}
