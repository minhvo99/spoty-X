import { Pressable, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import type { ReactNode } from 'react';
import { Image } from 'expo-image';
import { colors } from '../theme';
import { Icon } from './icon';
import type { IconName } from './icon';
export function Button({ children, onPress, primary, disabled, icon, small }: { children: ReactNode; onPress: () => void; primary?: boolean; disabled?: boolean; icon?: IconName; small?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} accessibilityState={{ disabled }} onPress={onPress} style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [s.button, primary && s.primary, small && { paddingVertical: 10, minHeight: 42 }, hovered && { borderColor: colors.muted }, pressed && { opacity: 0.75 }, disabled && { opacity: 0.4 }]}>
    {icon && <Icon name={icon} size={18} color={primary ? colors.canvas : colors.text} />}<Text style={[s.buttonText, primary && { color: colors.canvas }]}>{children}</Text>
  </Pressable>;
}
export function IconButton({ name, label, onPress, disabled, active, large }: { name: IconName; label: string; onPress: () => void; disabled?: boolean; active?: boolean; large?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled, ...(active !== undefined ? { selected: active } : {}) }} disabled={disabled} onPress={onPress} style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [{ width: large ? 48 : 44, height: large ? 48 : 44, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: large ? colors.text : hovered ? colors.raised : 'transparent', opacity: disabled ? 0.32 : pressed ? 0.65 : 1 }]}>
    <Icon name={name} size={large ? 23 : 20} color={large ? colors.canvas : active ? colors.green : colors.muted} />
  </Pressable>;
}
export function Cover({ uri, size = 56 }: { uri?: string; size?: number }) {
  return uri ? <Image source={{ uri }} style={{ width: size, height: size, borderRadius: 6, backgroundColor: colors.raised }} contentFit="cover" accessibilityLabel="Ảnh bìa Spotify" /> : <View style={{ width: size, height: size, borderRadius: 6, backgroundColor: colors.raised, alignItems: 'center', justifyContent: 'center' }}><Icon name="music" size={Math.max(22, size / 3)} /></View>;
}
export function Empty({ title, body, children }: { title: string; body: string; children?: ReactNode }) {
  return <View style={{ paddingVertical: 48, gap: 16, alignItems: 'flex-start', maxWidth: 560 }}><Icon name="music" size={40} color={colors.green} /><Text style={s.heading}>{title}</Text><Text style={s.body}>{body}</Text>{children}</View>;
}
export function Loading() { return <View style={{ padding: 30 }}><ActivityIndicator color={colors.green} accessibilityLabel="Đang tải Spotify" /></View>; }
export const s = StyleSheet.create({
  button: { minHeight: 48, borderRadius: 28, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 23, paddingVertical: 13, alignSelf: 'flex-start', flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center' },
  primary: { backgroundColor: colors.green, borderColor: colors.green }, buttonText: { fontSize: 14, fontWeight: '700', color: colors.text },
  heading: { fontSize: 26, fontWeight: '800', letterSpacing: -0.7, color: colors.text }, body: { fontSize: 15, lineHeight: 24, color: colors.muted },
  caption: { fontSize: 12, color: colors.muted, lineHeight: 19 }, label: { color: colors.text, fontWeight: '600', fontSize: 14 },
  input: { backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.border, color: colors.text, minHeight: 50, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, fontSize: 15 },
});
