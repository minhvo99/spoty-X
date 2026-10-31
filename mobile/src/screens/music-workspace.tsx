import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Linking,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Host, Slider } from "@expo/ui";
import { useMusic } from "../music/provider";
import { catalog } from "../music/catalog";
import { formatTime, searchLibrary } from "../music/model";
import type { SearchFilter, Track } from "../music/types";
import { MusicArt } from "../components/music-art";
import { MusicRow } from "../components/music-row";
import {
  MusicDock,
  PlaybackControls,
  SeekBar,
} from "../components/music-player";
import { Icon, Mark } from "../components/icon";
import type { IconName } from "../components/icon";
import { Button, Empty, IconButton, Loading, s } from "../components/ui";
import { colors } from "../theme";

type Screen =
  "home" | "search" | "library" | "playlist" | "player" | "add" | "about";
const nav: { id: Screen; label: string; icon: IconName }[] = [
  { id: "home", label: "Trang chủ", icon: "home" },
  { id: "search", label: "Tìm kiếm", icon: "search" },
  { id: "library", label: "Thư viện", icon: "library" },
];
const spacing = (compact: boolean) => (compact ? 20 : 36);
export default function MusicWorkspace() {
  const m = useMusic();
  const router = useRouter();
  const params = useLocalSearchParams<{
    view?: string;
    id?: string;
    track?: string;
  }>();
  const screen: Screen = [
    "home",
    "search",
    "library",
    "playlist",
    "player",
    "add",
    "about",
  ].includes(params.view ?? "")
    ? (params.view as Screen)
    : "home";
  const { width } = useWindowDimensions();
  const compact = width < 800;
  const pad = spacing(compact);
  const [query, setQuery] = useState("");
  const [settled, setSettled] = useState("");
  const [filter, setFilter] = useState<SearchFilter>("all");
  const [playlistName, setPlaylistName] = useState("");
  const [creating, setCreating] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(query), 250);
    return () => clearTimeout(timer);
  }, [query]);
  const results = useMemo(
    () => searchLibrary(m.tracks, settled, filter),
    [m.tracks, settled, filter],
  );
  const collections = [...new Set(catalog.map((t) => t.collection))];
  const go = (target: Screen, id = "", track = "") =>
    router.setParams({ view: target, id, track });
  const add = (track: Track) => go("add", "", track.id);
  const renderTrack = (
    track: Track,
    index: number,
    ids?: string[],
    remove?: () => void,
    beforePlay?: () => void,
  ) => (
    <MusicRow
      key={track.id}
      track={track}
      index={index}
      ids={ids}
      compact={compact}
      onAdd={() => add(track)}
      onRemove={remove}
      beforePlay={beforePlay}
    />
  );
  const create = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const id = await m.createPlaylist(playlistName);
      if (id) {
        setPlaylistName("");
        go("playlist", id);
      }
    } finally {
      setCreating(false);
    }
  };
  const groupCard = (
    title: string,
    subtitle: string,
    color: string,
    onPress: () => void,
    key = title,
  ) => (
    <Pressable
      key={key}
      accessibilityRole="button"
      accessibilityLabel={`Mở ${title}`}
      onPress={onPress}
      style={({
        hovered,
        pressed,
      }: {
        pressed: boolean;
        hovered?: boolean;
      }) => ({
        width: compact ? "47.5%" : "23.2%",
        gap: 10,
        padding: compact ? 10 : 14,
        backgroundColor: hovered || pressed ? colors.raised : colors.panel,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
      })}
    >
      <MusicArt title={title} color={color} wide />
      <Text numberOfLines={2} style={s.label}>
        {title}
      </Text>
      <Text numberOfLines={1} style={s.caption}>
        {subtitle}
      </Text>
    </Pressable>
  );
  const heading = (title: string, body?: string) => (
    <View style={{ gap: 10, paddingBottom: 22 }}>
      <Text
        accessibilityRole="header"
        style={[s.heading, { fontSize: compact ? 30 : 38 }]}
      >
        {title}
      </Text>
      {body && <Text style={s.body}>{body}</Text>}
    </View>
  );

  const home = () => (
    <FlatList
      data={m.tracks}
      keyExtractor={(t) => t.id}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ padding: pad, paddingBottom: 30 }}
      ListHeaderComponent={
        <View style={{ gap: 30, paddingBottom: 24 }}>
          <View
            style={{
              flexDirection: compact ? "column" : "row",
              gap: 28,
              padding: compact ? 22 : 32,
              borderRadius: 18,
              backgroundColor: "#173a27",
              alignItems: compact ? "flex-start" : "center",
            }}
          >
            <View style={{ flex: 1, gap: 18 }}>
              <Text style={{ color: "#badbc5", fontSize: 13 }}>
                Một không gian dành riêng cho âm nhạc
              </Text>
              <Text
                accessibilityRole="header"
                style={{
                  fontSize: compact ? 38 : 52,
                  lineHeight: compact ? 44 : 57,
                  fontWeight: "900",
                  letterSpacing: -1.6,
                  color: colors.text,
                }}
              >
                Nhịp của{"\n"}riêng bạn.
              </Text>
              <Text style={[s.body, { color: "#d0dfd4", maxWidth: 430 }]}>
                Bật một bản nhạc mở, hoặc mang những bài hát của bạn vào đây. Mở
                là nghe.
              </Text>
              <Button
                primary
                icon="play"
                disabled={!m.ready}
                onPress={() =>
                  m.play(
                    m.tracks[0],
                    m.tracks.map((t) => t.id),
                  )
                }
              >
                Nghe ngay
              </Button>
            </View>
            {!compact && (
              <MusicArt
                color={catalog[0].color}
                title="Nhạc cho hôm nay"
                size={220}
              />
            )}
          </View>
          <View style={{ gap: 16 }}>
            <SectionTitle title="Chọn một tâm trạng" />
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: compact ? 14 : 18,
              }}
            >
              {collections.map((name) => {
                const tracks = catalog.filter((t) => t.collection === name);
                return groupCard(
                  name,
                  `${tracks.length} bài hát`,
                  tracks[0].color,
                  () => go("playlist", "collection:" + name),
                );
              })}
            </View>
          </View>
          {m.library.recentlyPlayed.length > 0 && (
            <View style={{ gap: 14 }}>
              <SectionTitle title="Nghe gần đây" />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12 }}
              >
                {m.library.recentlyPlayed.flatMap((id) => {
                  const t = m.tracks.find((t) => t.id === id);
                  return t
                    ? [
                        <Pressable
                          key={id}
                          accessibilityRole="button"
                          accessibilityLabel={`Nghe lại ${t.title}`}
                          onPress={() => m.play(t)}
                          style={{ width: 150, gap: 9 }}
                        >
                          <MusicArt
                            color={t.color}
                            title={t.title}
                            size={145}
                          />
                          <Text numberOfLines={1} style={s.label}>
                            {t.title}
                          </Text>
                        </Pressable>,
                      ]
                    : [];
                })}
              </ScrollView>
            </View>
          )}
          <SectionTitle
            title="Có sẵn để nghe"
            body={`${m.tracks.length} bài hát · Phát trực tiếp trên thiết bị của bạn`}
          />
        </View>
      }
      renderItem={({ item, index }) =>
        renderTrack(
          item,
          index,
          m.tracks.map((t) => t.id),
        )
      }
      ListFooterComponent={
        <View style={{ gap: 16, paddingTop: 30 }}>
          <Button
            icon="plus"
            disabled={m.busy || !m.ready}
            onPress={() => void m.importing()}
          >
            {m.busy ? "Đang nhập nhạc…" : "Nhập nhạc từ thiết bị"}
          </Button>
          <Text style={s.caption}>
            Bộ sưu tập mở của Kevin MacLeod, giấy phép CC BY 4.0. Không cần tài
            khoản. Nhạc đã nhập được giữ trên thiết bị.
          </Text>
        </View>
      }
    />
  );
  const search = () => (
    <View style={{ flex: 1 }}>
      <View
        style={{
          paddingHorizontal: pad,
          paddingTop: 24,
          paddingBottom: 16,
          gap: 18,
        }}
      >
        {heading("Bạn muốn nghe gì?")}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: colors.raised,
            borderRadius: 10,
            paddingLeft: 15,
          }}
        >
          <Icon name="search" color={colors.text} />
          <TextInput
            accessibilityLabel="Tìm kiếm nhạc"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => void m.remember(query)}
            placeholder="Bài hát, nghệ sĩ, bộ sưu tập…"
            placeholderTextColor={colors.muted}
            autoCorrect={false}
            returnKeyType="search"
            style={{
              flex: 1,
              minHeight: 54,
              color: colors.text,
              paddingHorizontal: 12,
              fontSize: 15,
            }}
          />
          {query.length > 0 && (
            <IconButton
              name="close"
              label="Xóa từ khóa"
              onPress={() => setQuery("")}
            />
          )}
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {(
            [
              { id: "all", label: "Tất cả" },
              { id: "songs", label: "Bài hát" },
              { id: "artists", label: "Nghệ sĩ" },
              { id: "collections", label: "Bộ sưu tập" },
            ] as { id: SearchFilter; label: string }[]
          ).map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={`Lọc ${item.label}`}
              accessibilityState={{ selected: filter === item.id }}
              onPress={() => setFilter(item.id)}
              style={{
                borderRadius: 22,
                paddingHorizontal: 15,
                paddingVertical: 10,
                backgroundColor:
                  filter === item.id ? colors.text : colors.raised,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: filter === item.id ? colors.canvas : colors.text,
                }}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      {!query.trim() ? (
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: pad,
            paddingBottom: 28,
            gap: 18,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <SectionTitle title="Tìm kiếm gần đây" />
            {m.library.recentSearches.length > 0 && (
              <Button small onPress={() => void m.clearRecent()}>
                Xóa lịch sử
              </Button>
            )}
          </View>
          {m.library.recentSearches.length ? (
            m.library.recentSearches.map((q) => (
              <View
                key={q}
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Tìm lại ${q}`}
                  onPress={() => setQuery(q)}
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 14,
                    paddingVertical: 14,
                  }}
                >
                  <Icon name="search" />
                  <Text style={s.label}>{q}</Text>
                </Pressable>
                <IconButton
                  name="close"
                  label={`Xóa tìm kiếm ${q}`}
                  onPress={() => void m.removeRecent(q)}
                />
              </View>
            ))
          ) : (
            <Empty
              title="Bắt đầu từ một giai điệu"
              body="Tìm theo tên bài hát, nghệ sĩ hoặc bộ sưu tập. Bạn có thể tìm tiếng Việt có dấu hoặc không dấu."
            />
          )}
          <SectionTitle title="Khám phá theo tâm trạng" />
          <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
            {collections.map((name) => (
              <Button
                key={name}
                onPress={() => {
                  setQuery(name);
                  setFilter("all");
                }}
              >
                {name}
              </Button>
            ))}
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={query === settled ? results : []}
          keyExtractor={(t) => t.id}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: pad, paddingBottom: 24 }}
          ListHeaderComponent={
            <Text
              accessibilityLiveRegion="polite"
              style={[s.caption, { paddingBottom: 14 }]}
            >
              {query !== settled
                ? "Đang tìm…"
                : `${results.length} bài hát trong thư viện`}
            </Text>
          }
          renderItem={({ item, index }) =>
            renderTrack(
              item,
              index,
              results.map((t) => t.id),
              undefined,
              () => void m.remember(query),
            )
          }
          ListEmptyComponent={
            query !== settled ? (
              <Loading />
            ) : (
              <Empty
                title="Không tìm thấy bài hát"
                body="Thử tên bài hoặc nghệ sĩ khác. Muốn nghe nhạc của mình? Hãy nhập tệp vào thư viện."
              >
                <Button
                  icon="plus"
                  disabled={m.busy}
                  onPress={() => void m.importing()}
                >
                  Nhập nhạc
                </Button>
              </Empty>
            )
          }
        />
      )}
    </View>
  );
  const library = () => (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ padding: pad, gap: 26 }}
    >
      {heading("Thư viện của bạn", "Những gì bạn thích, ở ngay đây.")}
      <View style={{ flexDirection: "row", gap: 14, flexWrap: "wrap" }}>
        {groupCard(
          "Bài đã thích",
          `${m.library.favorites.length} bài hát`,
          "#7055b5",
          () => go("playlist", "favorites"),
        )}
        {groupCard(
          "Nhạc đã nhập",
          `${m.library.imports.length} tệp âm thanh`,
          "#b0835c",
          () => go("playlist", "imports"),
        )}
        {m.library.playlists.map((p) =>
          groupCard(
            p.name,
            `${p.trackIds.length} bài hát`,
            "#497b6a",
            () => go("playlist", p.id),
            p.id,
          ),
        )}
      </View>
      <View
        style={{
          padding: compact ? 20 : 28,
          gap: 16,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 14,
          maxWidth: 680,
        }}
      >
        <SectionTitle title="Một playlist mới" />
        <TextInput
          accessibilityLabel="Tên playlist mới"
          placeholder="Đặt tên cho những bài hát bạn chọn"
          placeholderTextColor={colors.muted}
          value={playlistName}
          onChangeText={setPlaylistName}
          maxLength={100}
          onSubmitEditing={() => void create()}
          style={s.input}
        />
        <Button
          primary
          icon="plus"
          disabled={!playlistName.trim() || creating || !m.ready}
          onPress={() => void create()}
        >
          {creating ? "Đang lưu…" : "Tạo playlist"}
        </Button>
      </View>
      <View style={{ gap: 14 }}>
        <SectionTitle title="Mang nhạc của bạn vào" />
        <Text style={s.body}>
          Chọn tệp âm thanh trên thiết bị. Tệp không được gửi lên máy chủ và vẫn
          còn trong thư viện khi mở lại ứng dụng.
        </Text>
        <Button
          icon="plus"
          disabled={m.busy || !m.ready}
          onPress={() => void m.importing()}
        >
          {m.busy ? "Đang nhập nhạc…" : "Nhập nhạc"}
        </Button>
        <Text style={s.caption}>
          Tối đa 10 tệp mỗi lần, 25 MB mỗi tệp. Khả năng phát từng định dạng phụ
          thuộc thiết bị.
        </Text>
      </View>
    </ScrollView>
  );
  const playlist = () => {
    const id = params.id ?? "";
    const custom = m.library.playlists.find((p) => p.id === id);
    const isCollection = id.startsWith("collection:");
    const title =
      id === "favorites"
        ? "Bài đã thích"
        : id === "imports"
          ? "Nhạc đã nhập"
          : isCollection
            ? id.slice(11)
            : (custom?.name ?? "Playlist");
    const tracks =
      id === "favorites"
        ? m.tracks.filter((t) => m.library.favorites.includes(t.id))
        : id === "imports"
          ? m.tracks.filter((t) => t.imported)
          : isCollection
            ? m.tracks.filter((t) => t.collection === id.slice(11))
            : m.tracks
                .filter((t) => custom?.trackIds.includes(t.id))
                .sort(
                  (a, b) =>
                    (custom?.trackIds.indexOf(a.id) ?? 0) -
                    (custom?.trackIds.indexOf(b.id) ?? 0),
                );
    return (
      <FlatList
        data={tracks}
        keyExtractor={(t) => t.id}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: pad, paddingBottom: 30 }}
        ListHeaderComponent={
          <View style={{ gap: 22, paddingBottom: 24 }}>
            <Button icon="arrow" small onPress={() => go("library")}>
              Thư viện
            </Button>
            <View
              style={{
                flexDirection: compact ? "column" : "row",
                alignItems: compact ? "flex-start" : "flex-end",
                gap: 24,
              }}
            >
              <MusicArt
                color={tracks[0]?.color ?? "#5c4c86"}
                title={title}
                size={compact ? 150 : 210}
              />
              <View style={{ gap: 14, flex: 1 }}>
                <Text style={s.caption}>
                  {custom ? "Playlist của bạn" : "Bộ sưu tập Spoty-X"}
                </Text>
                <Text
                  accessibilityRole="header"
                  style={[s.heading, { fontSize: compact ? 32 : 44 }]}
                >
                  {title}
                </Text>
                <Text style={s.body}>
                  {tracks.length} bài hát
                  {tracks.length > 0
                    ? ` · ${formatTime(tracks.reduce((a, t) => a + (t.duration || 0), 0))}`
                    : ""}
                </Text>
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}
                >
                  <Button
                    primary
                    icon="play"
                    disabled={!tracks.length || !m.ready}
                    onPress={() =>
                      m.play(
                        tracks[0],
                        tracks.map((t) => t.id),
                      )
                    }
                  >
                    Phát danh sách
                  </Button>
                  {custom && (
                    <Button
                      icon="trash"
                      onPress={() =>
                        void m.deletePlaylist(id).then((ok) => {
                          if (ok) go("library");
                        })
                      }
                    >
                      Xóa playlist
                    </Button>
                  )}
                </View>
              </View>
            </View>
          </View>
        }
        renderItem={({ item, index }) =>
          renderTrack(
            item,
            index,
            tracks.map((t) => t.id),
            custom
              ? () => void m.remove(id, item.id)
              : item.imported
                ? () => void m.removeImport(item)
                : undefined,
          )
        }
        ListEmptyComponent={
          <Empty
            title="Thêm một bài bạn thích"
            body={
              id === "imports"
                ? "Nhập tệp nhạc trên thiết bị để bắt đầu."
                : "Tìm một bài hát rồi nhấn trái tim hoặc dấu cộng để thêm vào bộ sưu tập."
            }
          >
            <Button
              onPress={() =>
                id === "imports" ? void m.importing() : go("home")
              }
            >
              {id === "imports" ? "Nhập nhạc" : "Khám phá nhạc"}
            </Button>
          </Empty>
        }
      />
    );
  };
  const addToList = () => {
    const track = m.tracks.find((t) => t.id === params.track);
    return (
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: pad, gap: 22 }}
      >
        <Button icon="arrow" small onPress={() => go("home")}>
          Quay lại
        </Button>
        {heading("Thêm vào playlist", track?.title)}
        {track &&
          m.library.playlists.map((p) => (
            <Button
              key={p.id}
              icon={p.trackIds.includes(track.id) ? "check" : "plus"}
              disabled={p.trackIds.includes(track.id)}
              onPress={() =>
                void m.add(p.id, track.id).then((ok) => {
                  if (ok) go("playlist", p.id);
                })
              }
            >
              {p.name}
            </Button>
          ))}
        {!m.library.playlists.length && (
          <Text style={s.body}>Tạo playlist đầu tiên để lưu bài hát này.</Text>
        )}
        <TextInput
          accessibilityLabel="Tên playlist mới"
          placeholder="Tên playlist mới"
          placeholderTextColor={colors.muted}
          value={playlistName}
          onChangeText={setPlaylistName}
          maxLength={100}
          style={s.input}
        />
        <Button
          primary
          disabled={!playlistName.trim() || creating}
          onPress={() => {
            if (!track) return;
            setCreating(true);
            void m
              .createPlaylist(playlistName)
              .then(async (id) => {
                if (id && (await m.add(id, track.id))) {
                  setPlaylistName("");
                  go("playlist", id);
                }
              })
              .finally(() => setCreating(false));
          }}
        >
          Tạo và thêm bài hát
        </Button>
      </ScrollView>
    );
  };
  const player = () => {
    const track = m.activeTrack;
    const queue = m.queue.flatMap((id) => {
      const t = m.tracks.find((t) => t.id === id);
      return t ? [t] : [];
    });
    return (
      <FlatList
        data={queue}
        keyExtractor={(t) => t.id}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: pad, paddingBottom: 30 }}
        ListHeaderComponent={
          <View style={{ gap: 26, paddingBottom: 30 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Button icon="arrow" small onPress={() => go("home")}>
                Khám phá
              </Button>
              <Text style={s.caption}>Đang phát trên thiết bị này</Text>
            </View>
            <View
              style={{
                alignSelf: "center",
                width: "100%",
                maxWidth: 470,
                gap: 24,
              }}
            >
              <MusicArt
                title={track?.title ?? "Âm nhạc của bạn"}
                color={track?.color ?? "#355f46"}
                wide
              />
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 14 }}
              >
                <View style={{ flex: 1, gap: 8 }}>
                  <Text accessibilityRole="header" style={s.heading}>
                    {track?.title ?? "Chọn một bài hát"}
                  </Text>
                  <Text style={s.body}>
                    {track?.artist ?? "Hoặc nhấn phát để nghe bộ sưu tập mở"}
                  </Text>
                </View>
                {track && (
                  <IconButton
                    name="heart"
                    label={
                      m.library.favorites.includes(track.id)
                        ? `Bỏ thích ${track.title}`
                        : `Thích ${track.title}`
                    }
                    active={m.library.favorites.includes(track.id)}
                    onPress={() => void m.like(track.id)}
                  />
                )}
              </View>
              <SeekBar large />
              <PlaybackControls large />
              <View style={{ gap: 6 }}>
                <Text style={s.caption}>
                  {m.canControlVolume
                    ? "Âm lượng"
                    : "Chỉnh âm lượng bằng nút trên thiết bị"}
                </Text>
                {m.canControlVolume && (
                  <Host
                    colorScheme="dark"
                    seedColor={colors.green}
                    style={{ height: 32, width: "100%" }}
                  >
                    <Slider
                      testID="volume-slider"
                      value={m.volume}
                      min={0}
                      max={1}
                      step={0.05}
                      onValueChange={m.setVolume}
                    />
                  </Host>
                )}
              </View>
              {track?.credit && <Text style={s.caption}>{track.credit}</Text>}
            </View>
            <SectionTitle
              title="Hàng đợi phát"
              body={`${queue.length} bài hát`}
            />
          </View>
        }
        renderItem={({ item, index }) => renderTrack(item, index, m.queue)}
        ListEmptyComponent={
          <Button
            primary
            icon="play"
            disabled={!m.ready}
            onPress={() => m.play(m.tracks[0])}
          >
            Phát thư viện
          </Button>
        }
      />
    );
  };
  const about = () => (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: pad, gap: 22, maxWidth: 800 }}
    >
      {heading(
        "Về Spoty-X",
        "Ứng dụng nghe nhạc độc lập, không quảng cáo và không yêu cầu API key.",
      )}
      <Text style={s.body}>
        Nhạc có sẵn là bản ghi đầy đủ được phát hành theo giấy phép mở. Bạn cũng
        có thể nhập nhạc từ thiết bị. Ứng dụng không cung cấp toàn bộ danh mục
        của Spotify và không phải sản phẩm chính thức của Spotify.
      </Text>
      <SectionTitle title="Ghi công âm nhạc" />
      <Text selectable style={s.body}>
        Carefree, Dream Culture, Cipher, Sneaky Snitch, Local Forecast -
        Elevator, Night on the Docks - Sax — Kevin MacLeod (incompetech.com).
        Licensed under Creative Commons: By Attribution 4.0. Audio re-encoded at
        128 kbps.
      </Text>
      <Button
        icon="external"
        onPress={() =>
          void Linking.openURL("https://creativecommons.org/licenses/by/4.0/")
        }
      >
        Giấy phép CC BY 4.0
      </Button>
      <Button
        icon="external"
        onPress={() =>
          void Linking.openURL(
            "https://incompetech.com/music/royalty-free/licenses/",
          )
        }
      >
        Nguồn âm nhạc và ghi công
      </Button>
      <SectionTitle title="Quyền riêng tư" />
      <Text style={s.body}>
        Playlist, yêu thích, tìm kiếm gần đây và nhạc đã nhập được lưu trên
        thiết bị. Không có tài khoản, quảng cáo, analytics hoặc tải tệp cá nhân
        lên máy chủ. Xóa dữ liệu trình duyệt sẽ xóa thư viện cục bộ.
      </Text>
      <SectionTitle title="Bằng chứng tham chiếu tìm kiếm" />
      <Text style={s.body}>
        Phân tích tĩnh IPA Spotify iOS 9.1.94 ghi nhận các chuỗi về lịch sử tìm
        kiếm, bộ lọc và debounce. Đây là cơ sở tham khảo thiết kế; không phải
        quan sát runtime hoặc mã nguồn được sao chép.
      </Text>
      <Button
        icon="external"
        onPress={() =>
          void Linking.openURL(
            "https://github.com/minhvo99/spoty-X/blob/main/docs/evidence/spotify-ios-search.md",
          )
        }
      >
        Xem báo cáo REA và giới hạn
      </Button>
    </ScrollView>
  );
  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={{ flex: 1, backgroundColor: colors.canvas }}
    >
      <StatusBar style="light" />
      <View
        style={{
          flex: 1,
          flexDirection: "row",
          padding: compact ? 0 : 8,
          gap: 8,
        }}
      >
        {!compact && (
          <View
            style={{
              width: 235,
              padding: 24,
              borderRadius: 12,
              backgroundColor: colors.panel,
              gap: 30,
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <Mark />
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: "800",
                  color: colors.text,
                  letterSpacing: -1,
                }}
              >
                Spoty-X
              </Text>
            </View>
            <View style={{ gap: 8 }}>
              {nav.map((item) => (
                <NavButton
                  key={item.id}
                  label={item.label}
                  icon={item.icon}
                  active={screen === item.id}
                  onPress={() => go(item.id)}
                />
              ))}
            </View>
            <View style={{ height: 1, backgroundColor: colors.border }} />
            <Button
              icon="heart"
              small
              onPress={() => go("playlist", "favorites")}
            >
              Bài đã thích
            </Button>
            <View style={{ gap: 10 }}>
              <Text style={s.label}>Playlist của bạn</Text>
              {m.library.playlists.slice(0, 8).map((p) => (
                <Pressable
                  accessibilityRole="button"
                  key={p.id}
                  onPress={() => go("playlist", p.id)}
                  style={{ paddingVertical: 8 }}
                >
                  <Text numberOfLines={1} style={s.caption}>
                    {p.name}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={{ flex: 1 }} />
            <Text style={s.caption}>
              Nhạc mở và nhạc của bạn.{"\n"}Không quảng cáo. Không API key.
            </Text>
            <Button small onPress={() => go("about")}>
              Về Spoty-X
            </Button>
          </View>
        )}
        <View
          style={{
            flex: 1,
            minWidth: 0,
            borderRadius: compact ? 0 : 12,
            overflow: "hidden",
            backgroundColor: colors.panel,
          }}
        >
          <View
            style={{
              minHeight: 72,
              paddingHorizontal: pad,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderColor: colors.border,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            {compact ? (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Mark size={28} />
                <Text style={[s.label, { fontSize: 20 }]}>Spoty-X</Text>
              </View>
            ) : (
              <Text style={s.caption}>
                {nav.find((t) => t.id === screen)?.label ??
                  "Không gian âm nhạc của bạn"}
              </Text>
            )}
            <View
              style={{ flexDirection: "row", gap: 8, alignItems: "center" }}
            >
              {compact ? (
                <>
                  <IconButton
                    name="plus"
                    label="Nhập nhạc từ thiết bị"
                    disabled={m.busy || !m.ready}
                    onPress={() => void m.importing()}
                  />
                  <IconButton
                    name="user"
                    label="Về Spoty-X"
                    onPress={() => go("about")}
                  />
                </>
              ) : (
                <Button
                  small
                  icon="plus"
                  disabled={m.busy || !m.ready}
                  onPress={() => void m.importing()}
                >
                  {m.busy ? "Đang nhập…" : "Nhập nhạc"}
                </Button>
              )}
            </View>
          </View>
          {m.error && (
            <View
              accessibilityRole="alert"
              style={{
                paddingLeft: 20,
                paddingRight: 6,
                paddingVertical: 8,
                backgroundColor: "#35221e",
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
              }}
            >
              <Text
                selectable
                style={{
                  flex: 1,
                  fontSize: 14,
                  lineHeight: 21,
                  color: colors.danger,
                }}
              >
                {m.error}
              </Text>
              <IconButton
                name="close"
                label="Đóng thông báo"
                onPress={() => m.setError("")}
              />
            </View>
          )}
          {screen === "search"
            ? search()
            : screen === "library"
              ? library()
              : screen === "playlist"
                ? playlist()
                : screen === "add"
                  ? addToList()
                  : screen === "player"
                    ? player()
                    : screen === "about"
                      ? about()
                      : home()}
        </View>
      </View>
      {screen !== "player" && (
        <MusicDock
          compact={compact}
          onOpen={() => go("player")}
          onQueue={() => go("player")}
        />
      )}
      {compact && (
        <View
          style={{
            flexDirection: "row",
            minHeight: 66,
            borderTopWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.canvas,
          }}
        >
          {nav.map((item) => (
            <NavButton
              key={item.id}
              label={item.label}
              icon={item.icon}
              active={screen === item.id}
              compact
              onPress={() => go(item.id)}
            />
          ))}
        </View>
      )}
    </SafeAreaView>
  );
}
function SectionTitle({ title, body }: { title: string; body?: string }) {
  return (
    <View style={{ gap: 7 }}>
      <Text
        accessibilityRole="header"
        style={{
          fontSize: 21,
          fontWeight: "800",
          letterSpacing: -0.4,
          color: colors.text,
        }}
      >
        {title}
      </Text>
      {body && <Text style={s.caption}>{body}</Text>}
    </View>
  );
}
function NavButton({
  label,
  icon,
  active,
  onPress,
  compact = false,
}: {
  label: string;
  icon: IconName;
  active: boolean;
  onPress: () => void;
  compact?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ hovered }: { pressed: boolean; hovered?: boolean }) => ({
        flex: compact ? 1 : undefined,
        flexDirection: compact ? "column" : "row",
        alignItems: "center",
        justifyContent: compact ? "center" : "flex-start",
        gap: compact ? 5 : 14,
        paddingHorizontal: compact ? 4 : 14,
        paddingVertical: compact ? 12 : 14,
        borderRadius: 8,
        backgroundColor:
          !compact && (active || hovered) ? colors.raised : "transparent",
      })}
    >
      <Icon name={icon} color={active ? colors.text : colors.muted} size={22} />
      <Text
        style={{
          fontSize: compact ? 11 : 14,
          fontWeight: active ? "700" : "500",
          color: active ? colors.text : colors.muted,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
