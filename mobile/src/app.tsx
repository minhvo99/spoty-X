import { useCallback, useEffect, useState } from 'react';
import { Image } from 'expo-image';
import { FlatList, Linking, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { client } from './spotify/client';
import { finishLogin, isWeb, login, redirectUri } from './spotify/auth';
import { usePage } from './spotify/use-resource';
import { usePlayer } from './spotify/use-player';
import { formatTime, tracksFromItems } from './spotify/data';
import type { Page, Playlist, PlaylistItem, Profile, Track } from './spotify/types';
import { colors } from './theme';
import { Icon, Mark, RecordArt } from './components/icon';
import type { IconName } from './components/icon';
import { Button, Cover, Empty, IconButton, Loading, s } from './components/ui';
import { TrackRow } from './components/track-row';
import { PlayerBar } from './components/player-bar';

type Screen = 'home' | 'library' | 'search' | 'account' | 'devices';
const tabs: { id: Screen; label: string; icon: IconName }[] = [
  { id: 'home', label: 'Trang chủ', icon: 'home' }, { id: 'search', label: 'Tìm kiếm', icon: 'search' }, { id: 'library', label: 'Thư viện', icon: 'library' }, { id: 'account', label: 'Tài khoản', icon: 'user' },
];
let bootPromise: Promise<{ clientId: string; connected: boolean; error: string }> | null = null;
function bootstrap() {
  if (!bootPromise) bootPromise = (async () => {
    let error = '';
    try { await finishLogin(); } catch (e) { error = (e as Error).message; }
    return { clientId: process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID ?? await client.clientId(), connected: await client.hasSession(), error };
  })();
  return bootPromise;
}
const openSpotify = () => { void Linking.openURL('https://open.spotify.com/'); };
function ContentLink({ url }: { url?: string }) {
  if (!url?.startsWith('https://open.spotify.com/')) return null;
  return <Button icon="external" small onPress={() => { void Linking.openURL(url); }}>Mở trên Spotify</Button>;
}

export default function App() {
  return <SafeAreaProvider><SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.canvas }}><StatusBar style="light" /><Workspace /></SafeAreaView></SafeAreaProvider>;
}
function Workspace() {
  const { width } = useWindowDimensions();
  const compact = width < 800;
  const [screen, setScreen] = useState<Screen>('home');
  const [connected, setConnected] = useState(false);
  const [booting, setBooting] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [clientId, setClientId] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Playlist | null>(null);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [searchResult, setSearchResult] = useState<Page<Track> | null>(null);
  const [searchError, setSearchError] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchRevision, setSearchRevision] = useState(0);
  const reportError = useCallback((message: string) => setError(message), []);
  const player = usePlayer(connected, reportError);
  const library = usePage<Playlist>(connected ? '/me/playlists?limit=50' : null);
  const playlist = usePage<PlaylistItem>(connected && selected ? `/playlists/${encodeURIComponent(selected.id)}/items?limit=50` : null);
  const tracks = tracksFromItems(playlist.data);

  useEffect(() => {
    let active = true;
    bootstrap().then(result => { if (active) { setClientId(result.clientId); setConnected(result.connected); setError(result.error); if (result.error) setScreen('account'); } }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setBooting(false); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    let active = true;
    if (!connected) { setProfile(null); return; }
    client.request<Profile>('/me').then(value => { if (active) setProfile(value); }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [connected]);
  useEffect(() => {
    setSearchResult(null); setSearchError('');
    if (!connected || !query.trim() || screen !== 'search') { setSearchLoading(false); return; }
    setSearchLoading(true);
    const timer = setTimeout(() => setSearch(query.trim()), 400);
    return () => clearTimeout(timer);
  }, [query, connected, screen]);
  useEffect(() => {
    let active = true;
    if (!connected || !search || query.trim() !== search || screen !== 'search') return;
    setSearchLoading(true); setSearchError('');
    client.request<{ tracks: Page<Track> }>('/search?' + new URLSearchParams({ q: search, type: 'track', limit: '10' })).then(result => { if (active) setSearchResult(result.tracks); }).catch(e => { if (active) setSearchError(e.message); }).finally(() => { if (active) setSearchLoading(false); });
    return () => { active = false; };
  }, [search, searchRevision, connected, query, screen]);

  const navigate = (target: Screen) => { setSelected(null); setScreen(target); setError(''); };
  const connect = async () => {
    if (loggingIn) return;
    setLoggingIn(true); setError('');
    try { await login(clientId.trim()); if (!isWeb) { setConnected(true); setScreen('home'); } }
    catch (e) { setError((e as Error).message); }
    finally { setLoggingIn(false); }
  };
  const logout = async () => {
    await client.logout(); setConnected(false); setProfile(null); setSelected(null); setSearchResult(null); setQuery(''); setSearch(''); setError(''); setScreen('home');
  };
  const accountBody = <View style={{ gap: 24, maxWidth: 680, paddingBottom: 30 }}>
    <Text accessibilityRole="header" style={s.heading}>{connected ? 'Tài khoản của bạn' : 'Kết nối thư viện của bạn'}</Text>
    <Text style={s.body}>{connected ? `Đang kết nối với ${profile?.display_name || 'tài khoản Spotify'}. Dữ liệu nhạc được cung cấp bởi Spotify.` : 'Đăng nhập trên trang chính thức của Spotify. Spoty-X không nhận hoặc lưu mật khẩu của bạn.'}</Text>
    <View style={{ padding: compact ? 20 : 28, gap: 18, backgroundColor: colors.panel, borderRadius: 16, borderWidth: 1, borderColor: colors.border }}>
      <Text style={s.label}>Spotify Client ID công khai</Text>
      <TextInput accessibilityLabel="Spotify Client ID công khai" value={clientId} onChangeText={setClientId} autoCapitalize="none" autoCorrect={false} placeholder="Dán Client ID từ Spotify Developer" placeholderTextColor={colors.muted} editable={!loggingIn && !connected} style={s.input} />
      <Text style={s.caption}>Client ID xác định ứng dụng của bạn. Không nhập Client Secret, mật khẩu hoặc access token vào đây.</Text>
      <Text style={s.label}>Redirect URI cần đăng ký</Text>
      <Text selectable style={[s.caption, { color: colors.green }]}>{redirectUri()}</Text>
      <Text style={s.body}>Tạo ứng dụng trong Spotify Developer Dashboard, thêm Redirect URI ở trên và cấp quyền cho tài khoản của bạn trong User Management.</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {connected ? <Button icon="logout" onPress={() => void logout()}>Đăng xuất</Button> : <Button primary icon="play" disabled={loggingIn || booting} onPress={() => void connect()}>{loggingIn ? 'Đang kết nối…' : 'Đăng nhập Spotify'}</Button>}
        <Button icon="external" onPress={() => { void Linking.openURL('https://developer.spotify.com/dashboard'); }}>Developer Dashboard</Button>
      </View>
    </View>
    <View style={{ gap: 10 }}><Text style={s.label}>Về tài khoản Premium</Text><Text style={s.body}>Phát nhạc trên web yêu cầu Spotify Premium. Chủ ứng dụng ở Development Mode cũng cần Premium; ứng dụng mới cho phép tối đa 5 tài khoản trong danh sách thử nghiệm. Spoty-X không mở khóa Premium cho tài khoản Free.</Text><Text style={s.caption}>{isWeb ? 'Trên điện thoại, nhấn phát để cho phép trình duyệt phát âm thanh. Nếu trình duyệt không hỗ trợ, bạn có thể chọn thiết bị Spotify khác.' : 'Bản native điều khiển thiết bị Spotify đang hoạt động. Mở ứng dụng Spotify và phát một bài trước khi sử dụng. OAuth cần bản build có scheme riêng, không dùng Expo Go.'}</Text></View>
  </View>;
  const devicesBody = <View style={{ maxWidth: 760, gap: 22, paddingBottom: 30 }}>
    <Text style={s.heading}>Nghe theo cách của bạn</Text>
    <Text style={s.body}>Chọn nơi phát nhạc. Nếu không thấy thiết bị, mở Spotify và phát một bài rồi tải lại danh sách.</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}><Button icon="refresh" disabled={!connected} onPress={() => { void player.refreshDevices().catch(e => setError(e.message)); }}>Tải lại thiết bị</Button><Button icon="external" onPress={openSpotify}>Mở Spotify</Button>{isWeb && <Button disabled={!connected} onPress={player.reconnect}>Kết nối lại trình phát</Button>}</View>
    {isWeb && player.webDeviceId && <Button primary={player.deviceId === player.webDeviceId || !player.deviceId} icon="device" onPress={() => player.setDeviceId(player.webDeviceId)}>Trình duyệt này</Button>}
    {player.devices.map(device => <Button key={device.id} icon="device" primary={player.deviceId === device.id} onPress={() => player.setDeviceId(device.id)}>{device.name}{device.is_active ? ' (đang phát)' : ''}</Button>)}
    <Text style={s.caption}>Thiết bị sẽ được sử dụng khi bạn nhấn phát bài hát hoặc điều khiển nhạc.</Text>
    <Text style={s.heading}>Đang phát</Text>
    {player.playback?.item ? <View style={{ gap: 18 }}><Cover uri={player.playback.item.album?.images?.[0]?.url} size={compact ? 160 : 220} /><Text style={s.label}>{player.playback.item.name}</Text><Text style={s.caption}>{formatTime(player.playback.progress_ms)} / {formatTime(player.playback.item.duration_ms)}</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      <Button disabled={player.busy || player.playback.actions?.disallows?.seeking} onPress={() => void player.command('/me/player/seek?position_ms=' + Math.max(0, (player.playback?.progress_ms ?? 0) - 15000))}>Lùi 15 giây</Button>
      <Button disabled={player.busy || player.playback.actions?.disallows?.seeking} onPress={() => void player.command('/me/player/seek?position_ms=' + Math.min(Math.max(0, (player.playback?.item?.duration_ms ?? 1) - 1), (player.playback?.progress_ms ?? 0) + 15000))}>Tới 15 giây</Button>
      <Button disabled={player.busy || player.playback.actions?.disallows?.toggling_shuffle} onPress={() => void player.command('/me/player/shuffle?state=' + !player.playback?.shuffle_state)}>Ngẫu nhiên: {player.playback.shuffle_state ? 'Bật' : 'Tắt'}</Button>
      <Button disabled={player.busy || player.playback.actions?.disallows?.toggling_repeat_context} onPress={() => void player.command('/me/player/repeat?state=' + (player.playback?.repeat_state === 'off' ? 'context' : player.playback?.repeat_state === 'context' ? 'track' : 'off'))}>Lặp: {player.playback.repeat_state === 'track' ? 'Một bài' : player.playback.repeat_state === 'context' ? 'Danh sách' : 'Tắt'}</Button>
    </View><ContentLink url={player.playback.item.external_urls?.spotify ?? (player.playback.item.id ? 'https://open.spotify.com/track/' + player.playback.item.id : undefined)} /></View> : <Text style={s.body}>Chọn một bài trong thư viện hoặc tìm kiếm để bắt đầu.</Text>}
  </View>;

  const renderDisconnected = () => <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: compact ? 22 : 44, gap: 40 }}>
    <View style={{ flexDirection: compact ? 'column-reverse' : 'row', gap: compact ? 28 : 40, alignItems: compact ? 'flex-start' : 'center', paddingVertical: compact ? 8 : 24 }}>
      <View style={{ flex: 1, gap: 22 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.green }} /><Text style={s.caption}>Một không gian dành riêng cho âm nhạc</Text></View>
        <Text accessibilityRole="header" style={{ fontSize: compact ? 40 : 58, lineHeight: compact ? 46 : 64, fontWeight: '900', letterSpacing: -2, color: colors.text }}>Nhạc của bạn.{ '\n' }Không gian{ '\n' }của bạn.</Text>
        <Text style={[s.body, { maxWidth: 400 }]}>Mang thư viện Spotify vào một giao diện gọn gàng. Những playlist quen thuộc, những bài hát bạn muốn nghe.</Text>
        <Button primary icon="play" disabled={booting} onPress={() => navigate('account')}>Kết nối Spotify</Button>
        <Text style={s.caption}>Nghe nhạc qua Spotify Premium. Không có quảng cáo của Spoty-X.</Text>
      </View>
      <View style={{ width: compact ? '100%' : undefined, alignItems: 'center' }}><RecordArt size={compact ? Math.min(width - 60, 280) : Math.min(340, width * 0.29)} /></View>
    </View>
    <View style={{ height: 1, backgroundColor: colors.border }} />
    <View style={{ flexDirection: compact ? 'column' : 'row', gap: 28, paddingBottom: 12 }}>
      {[['library', 'Thư viện luôn bên bạn', 'Playlist của chính bạn, lấy trực tiếp từ Spotify.'], ['search', 'Tìm đúng bài muốn nghe', 'Tìm theo tên bài hát, nghệ sĩ hoặc album.'], ['device', 'Tiếp nối trên mọi thiết bị', 'Chọn trình duyệt hoặc thiết bị Spotify đang hoạt động.']].map(([icon, title, body]) => <View key={title} style={{ flex: 1, gap: 13 }}><Icon name={icon as IconName} color={colors.green} size={26} /><Text style={s.label}>{title}</Text><Text style={s.body}>{body}</Text></View>)}
    </View>
    <Text style={s.caption}>Spoty-X là ứng dụng độc lập, không phải sản phẩm chính thức của Spotify. Nội dung và quyền phát do Spotify cung cấp.</Text>
  </ScrollView>;

  const renderLibrary = () => {
    const columns = compact ? 2 : width > 1250 ? 4 : 3;
    return <FlatList key={`library-${columns}`} data={library.data} numColumns={columns} keyExtractor={item => item.id} contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: compact ? 20 : 36, gap: 20 }} columnWrapperStyle={{ gap: compact ? 12 : 22 }}
      ListHeaderComponent={<View style={{ gap: 12, paddingBottom: 20 }}><Text style={s.caption}>{profile?.display_name ? `Dành cho ${profile.display_name}` : 'Thư viện Spotify của bạn'}</Text><Text accessibilityRole="header" style={[s.heading, { fontSize: compact ? 32 : 44 }]}>{screen === 'home' ? 'Bật những điều bạn thích.' : 'Playlist của bạn'}</Text><Text style={s.body}>Chọn một playlist để tiếp tục nghe. Nội dung từ Spotify.</Text></View>}
      renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`Mở playlist ${item.name}`} onPress={() => setSelected(item)} style={({ hovered, pressed }: { pressed: boolean; hovered?: boolean }) => [{ flex: 1, maxWidth: `${100 / columns}%`, minWidth: 0, padding: compact ? 10 : 16, borderRadius: 12, backgroundColor: hovered || pressed ? colors.raised : colors.panel, gap: 12 }]}><View style={{ aspectRatio: 1, width: '100%', borderRadius: 8, overflow: 'hidden', backgroundColor: colors.raised }}>{item.images?.[0]?.url ? <PlaylistCover uri={item.images[0].url} /> : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Icon name="music" size={50} /></View>}</View><Text numberOfLines={2} style={s.label}>{item.name}</Text><Text numberOfLines={1} style={s.caption}>{item.owner?.display_name || 'Spotify'}{item.items?.total !== undefined ? ` · ${item.items.total} bài` : ''}</Text></Pressable>}
      ListEmptyComponent={library.loading ? <Loading /> : library.error ? <View /> : <Empty title="Thư viện đang chờ bạn" body="Tạo hoặc lưu một playlist trong Spotify, rồi tải lại thư viện tại đây."><Button icon="refresh" onPress={library.retry}>Tải lại thư viện</Button></Empty>}
      ListFooterComponent={<PageFooter loading={library.loading && library.data.length > 0} error={library.error} hasNext={Boolean(library.next)} retry={library.retry} more={library.loadMore} />}
    />;
  };
  const renderTracks = () => <FlatList data={tracks} keyExtractor={(track, i) => `${track.id}-${i}`} contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: compact ? 20 : 36 }}
    ListHeaderComponent={<View style={{ gap: 24, paddingBottom: 28 }}><Button small icon="arrow" onPress={() => setSelected(null)}>Thư viện</Button><View style={{ flexDirection: compact ? 'column' : 'row', gap: 24, alignItems: compact ? 'flex-start' : 'flex-end' }}><Cover uri={selected?.images?.[0]?.url} size={compact ? 150 : 200} /><View style={{ flex: 1, gap: 14 }}><Text style={s.caption}>Playlist từ Spotify</Text><Text accessibilityRole="header" style={[s.heading, { fontSize: compact ? 32 : 44 }]}>{selected?.name}</Text><Text style={s.body}>{selected?.owner?.display_name || 'Spotify'}</Text><ContentLink url={selected?.external_urls?.spotify} /></View></View><Text style={s.caption}>Bài hát · Nghệ sĩ{!compact && '                                      Album                                     Thời lượng'}</Text></View>}
    renderItem={({ item, index }) => <TrackRow track={item} index={index} compact={compact} active={player.playback?.item?.uri === item.uri} onPlay={() => void player.play(item)} />}
    ListEmptyComponent={playlist.loading ? <Loading /> : playlist.error ? <View /> : <Empty title="Chưa có bài hát khả dụng" body="Playlist có thể đang trống hoặc nội dung không được Spotify API cung cấp. Với Development Mode, chỉ đọc được playlist bạn sở hữu hoặc cộng tác." />}
    ListFooterComponent={<PageFooter loading={playlist.loading && tracks.length > 0} error={playlist.error} hasNext={Boolean(playlist.next)} retry={playlist.retry} more={playlist.loadMore} />}
  />;
  const renderSearch = () => <View style={{ flex: 1 }}><View style={{ paddingHorizontal: compact ? 20 : 36, paddingTop: 24, paddingBottom: 12, gap: 16 }}><Text accessibilityRole="header" style={s.heading}>Hôm nay bạn muốn nghe gì?</Text><TextInput accessibilityLabel="Tìm bài hát trên Spotify" placeholder="Tên bài hát, nghệ sĩ, album…" placeholderTextColor={colors.muted} value={query} onChangeText={setQuery} autoCorrect={false} returnKeyType="search" style={s.input} /></View>
    <FlatList data={searchResult?.items ?? []} keyExtractor={(track, i) => `${track.id}-${i}`} contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: compact ? 20 : 36, paddingBottom: 30 }} renderItem={({ item, index }) => <TrackRow track={item} index={index} compact={compact} active={player.playback?.item?.uri === item.uri} onPlay={() => void player.play(item)} />}
      ListEmptyComponent={searchLoading ? <Loading /> : searchError ? <Empty title="Chưa tải được kết quả" body={searchError}><Button onPress={() => setSearchRevision(n => n + 1)}>Thử lại</Button></Empty> : <Empty title={search ? 'Không tìm thấy bài hát' : 'Bắt đầu từ một giai điệu'} body={search ? 'Thử một tên bài hát hoặc nghệ sĩ khác.' : 'Nhập tên bài hát hoặc nghệ sĩ để tìm trong Spotify.'} />}
      ListFooterComponent={searchResult?.items.length ? <Text style={[s.caption, { paddingVertical: 18 }]}>Hiển thị tối đa 10 kết quả phù hợp nhất. Thêm tên nghệ sĩ để tìm chính xác hơn. Nội dung từ Spotify.</Text> : <View />}
    />
  </View>;
  return <View style={{ flex: 1 }}>
    <View style={{ flex: 1, flexDirection: 'row', padding: compact ? 0 : 8, gap: 8 }}>
      {!compact && <View style={{ width: 236, padding: 24, backgroundColor: colors.panel, borderRadius: 12, gap: 34 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Mark /><Text style={{ fontSize: 24, letterSpacing: -1, fontWeight: '800', color: colors.text }}>Spoty-X</Text></View>
        <View style={{ gap: 8 }}>{tabs.map(tab => <NavItem key={tab.id} tab={tab} active={screen === tab.id} onPress={() => navigate(tab.id)} />)}</View>
        <View style={{ height: 1, backgroundColor: colors.border }} />
        <View style={{ gap: 12 }}><Text style={s.label}>Âm nhạc, theo ý bạn.</Text><Text style={s.caption}>Một nơi yên tĩnh cho những bài hát yêu thích.</Text></View>
        <View style={{ flex: 1 }} />
        <Button icon="device" small onPress={() => navigate('devices')}>Thiết bị</Button>
        <Text style={s.caption}>Kết nối qua Spotify{ '\n' }{connected ? 'Đã đăng nhập' : 'Chưa kết nối'}</Text>
      </View>}
      <View style={{ flex: 1, minWidth: 0, backgroundColor: colors.panel, borderRadius: compact ? 0 : 12, overflow: 'hidden' }}>
        <View style={{ minHeight: 72, paddingHorizontal: compact ? 20 : 36, paddingVertical: 14, borderBottomWidth: 1, borderColor: '#202721', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          {compact ? <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><Mark size={28} /><Text style={[s.label, { fontSize: 20 }]}>Spoty-X</Text></View> : <Text style={s.caption}>{screen === 'devices' ? 'Thiết bị và trình phát' : tabs.find(t => t.id === screen)?.label}</Text>}
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            {compact && <IconButton name="device" label="Thiết bị và trình phát" onPress={() => navigate('devices')} />}
            <Pressable accessibilityRole="button" accessibilityLabel={connected ? 'Tài khoản Spotify' : 'Kết nối tài khoản Spotify'} onPress={() => navigate('account')} style={{ flexDirection: 'row', gap: 8, alignItems: 'center', borderRadius: 24, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 9 }}><View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: connected ? colors.green : colors.muted }} /><Text numberOfLines={1} style={[s.caption, { maxWidth: compact ? 95 : 180 }]}>{connected ? profile?.display_name || 'Đã kết nối' : 'Chưa kết nối'}</Text></Pressable>
          </View>
        </View>
        {error ? <View accessibilityRole="alert" style={{ paddingLeft: 20, paddingRight: 8, paddingVertical: 8, backgroundColor: '#35211f', flexDirection: 'row', gap: 12, alignItems: 'center' }}><Text selectable style={{ flex: 1, color: colors.danger, lineHeight: 22, fontSize: 14 }}>{error}</Text><IconButton name="close" label="Đóng thông báo" onPress={() => setError('')} /></View> : null}
        {booting ? <Loading /> : screen === 'account' ? <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: compact ? 22 : 40 }}>{accountBody}</ScrollView> : screen === 'devices' ? <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: compact ? 22 : 40 }}>{devicesBody}</ScrollView> : !connected ? renderDisconnected() : screen === 'search' ? renderSearch() : selected ? renderTracks() : renderLibrary()}
      </View>
    </View>
    <PlayerBar player={player} compact={compact} onDevices={() => navigate('devices')} />
    {compact && <View style={{ flexDirection: 'row', borderTopWidth: 1, borderColor: colors.border, backgroundColor: colors.canvas, minHeight: 66, paddingHorizontal: 6 }}>{tabs.map(tab => <NavItem key={tab.id} tab={tab} active={screen === tab.id} compact onPress={() => navigate(tab.id)} />)}</View>}
  </View>;
}
function NavItem({ tab, active, onPress, compact }: { tab: { label: string; icon: IconName }; active: boolean; onPress: () => void; compact?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={tab.label} accessibilityState={{ selected: active }} onPress={onPress} style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [{ flex: compact ? 1 : undefined, flexDirection: compact ? 'column' : 'row', gap: compact ? 5 : 14, alignItems: 'center', justifyContent: compact ? 'center' : 'flex-start', paddingVertical: 13, paddingHorizontal: compact ? 4 : 14, borderRadius: 8, backgroundColor: !compact && (active || hovered) ? colors.raised : 'transparent' }]}><Icon name={tab.icon} size={compact ? 21 : 23} color={active ? colors.text : colors.muted} /><Text style={{ color: active ? colors.text : colors.muted, fontSize: compact ? 10 : 14, fontWeight: active ? '700' : '500' }}>{tab.label}</Text></Pressable>;
}
function PageFooter({ loading, error, hasNext, retry, more }: { loading: boolean; error: string; hasNext: boolean; retry: () => void; more: () => Promise<void> }) {
  return <View style={{ gap: 16, paddingVertical: 20 }}>{loading && <Loading />}{error ? <><Text selectable style={[s.body, { color: colors.danger }]}>{error}</Text><Button onPress={hasNext ? () => void more() : retry}>Thử lại</Button></> : hasNext && !loading ? <Button onPress={() => void more()}>Tải thêm</Button> : null}</View>;
}
function PlaylistCover({ uri }: { uri: string }) { return <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" accessibilityLabel="Ảnh bìa playlist Spotify" />; }
