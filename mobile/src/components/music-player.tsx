import { Pressable, Text, View } from "react-native";
import { useEffect, useState } from "react";
import { Host, Slider } from "@expo/ui";
import { useMusic } from "../music/provider";
import { advanceQueue, formatTime } from "../music/model";
import { MusicArt } from "./music-art";
import { IconButton, s } from "./ui";
import { colors } from "../theme";
export function SeekBar({ large = false }: { large?: boolean }) {
  const m = useMusic();
  const duration = m.status.duration || m.activeTrack?.duration || 0;
  const [position, setPosition] = useState(m.status.currentTime || 0);
  // Keep controlled range input optimistic between the SDK's 250ms status samples.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronize the native clock and the controlled thumb after a user seek.
    setPosition(m.status.currentTime || 0);
  }, [m.status.currentTime, m.activeTrack?.id]);
  return (
    <View style={{ gap: large ? 6 : 0, width: "100%" }}>
      <Host
        colorScheme="dark"
        seedColor={colors.green}
        style={{ height: 30, width: "100%" }}
      >
        <Slider
          testID="seek-slider"
          value={Math.min(position, duration)}
          min={0}
          max={Math.max(1, duration)}
          step={1}
          disabled={!m.activeTrack || !m.status.isLoaded}
          onValueChange={(value) => {
            setPosition(value);
            void m.seek(value);
          }}
        />
      </Host>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={s.caption}>{formatTime(m.status.currentTime)}</Text>
        <Text style={s.caption}>{formatTime(duration)}</Text>
      </View>
    </View>
  );
}
export function PlaybackControls({
  compact = false,
  large = false,
}: {
  compact?: boolean;
  large?: boolean;
}) {
  const m = useMusic();
  const next = Boolean(
    m.activeTrack &&
    advanceQueue(m.queue, m.activeTrack.id, {
      shuffle: m.shuffle,
      repeat: m.repeat,
    }),
  );
  return (
    <View
      style={{
        flexDirection: "row",
        gap: large ? 14 : compact ? 0 : 6,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {(!compact || large) && (
        <IconButton
          name="shuffle"
          label="Phát ngẫu nhiên"
          active={m.shuffle}
          onPress={m.toggleShuffle}
        />
      )}
      <IconButton
        name="previous"
        label="Bài trước"
        disabled={!m.activeTrack}
        onPress={() => m.next(-1)}
      />
      <IconButton
        large
        name={m.status.playing ? "pause" : "play"}
        label={m.status.playing ? "Tạm dừng" : "Phát nhạc"}
        disabled={!m.ready}
        onPress={m.togglePlay}
      />
      <IconButton
        name="next"
        label="Bài tiếp theo"
        disabled={!next}
        onPress={() => m.next(1)}
      />
      {(!compact || large) && (
        <IconButton
          name="repeat"
          label={
            m.repeat === "one"
              ? "Lặp một bài"
              : m.repeat === "all"
                ? "Lặp danh sách"
                : "Bật lặp lại"
          }
          active={m.repeat !== "off"}
          onPress={m.toggleRepeat}
        />
      )}
    </View>
  );
}
export function MusicDock({
  compact,
  onOpen,
  onQueue,
}: {
  compact: boolean;
  onOpen: () => void;
  onQueue: () => void;
}) {
  const m = useMusic();
  const track = m.activeTrack;
  return (
    <View
      style={{
        backgroundColor: colors.canvas,
        borderTopWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: compact ? 12 : 26,
        paddingVertical: compact ? 10 : 14,
        gap: 7,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: compact ? 6 : 28,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mở trình phát"
          onPress={onOpen}
          style={{
            flex: 1,
            minWidth: 0,
            flexDirection: "row",
            gap: 12,
            alignItems: "center",
          }}
        >
          <MusicArt
            title={track?.title ?? "Spoty-X"}
            color={track?.color ?? "#244532"}
            size={compact ? 42 : 52}
          />
          <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
            <Text numberOfLines={1} style={s.label}>
              {track?.title ?? "Một bài hát cho hôm nay"}
            </Text>
            <Text numberOfLines={1} style={s.caption}>
              {track?.artist ?? "Nhấn phát để bắt đầu nghe"}
            </Text>
          </View>
        </Pressable>
        <View
          style={{
            flex: compact ? undefined : 1.5,
            alignItems: "center",
            gap: 2,
          }}
        >
          <PlaybackControls compact={compact} />
          {!compact && <SeekBar />}
        </View>
        {!compact && (
          <View style={{ flex: 1, alignItems: "flex-end" }}>
            <IconButton name="queue" label="Hàng đợi phát" onPress={onQueue} />
            <Text style={s.caption}>Nhạc phát trên thiết bị này</Text>
          </View>
        )}
      </View>
      {compact && (
        <View style={{ height: 2, backgroundColor: colors.raised }}>
          <View
            style={{
              height: 2,
              backgroundColor: colors.green,
              width: `${Math.max(0, Math.min(100, ((m.status.currentTime || 0) / (m.status.duration || 1)) * 100))}%`,
            }}
          />
        </View>
      )}
    </View>
  );
}
