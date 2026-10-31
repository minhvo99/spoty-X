import Svg, { Path, Circle, Rect, Line } from 'react-native-svg';
import { colors } from '../theme';
export type IconName = 'home' | 'search' | 'library' | 'user' | 'play' | 'pause' | 'next' | 'previous' | 'shuffle' | 'repeat' | 'device' | 'arrow' | 'close' | 'music' | 'check' | 'refresh' | 'external' | 'logout';
const paths: Record<Exclude<IconName, 'play' | 'pause' | 'music'>, string> = {
  home: 'M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z',
  search: 'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  library: 'M4 3v18M9 3v18M14 4l4-1 4 17-4 1Z',
  user: 'M4 21v-2a8 8 0 0 1 16 0v2M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  next: 'm5 4 12 8-12 8ZM20 4v16', previous: 'm19 4-12 8 12 8ZM4 4v16',
  shuffle: 'M3 5h3c5 0 7 14 12 14h3m-4-4 4 4-4 4M3 19h3c2 0 3-2 4-4m4-6c1-2 2-4 4-4h3m-4-4 4 4-4 4',
  repeat: 'm17 2 4 4-4 4M3 11V8a2 2 0 0 1 2-2h16M7 22l-4-4 4-4m14-1v3a2 2 0 0 1-2 2H3',
  device: 'M3 3h18v12H3ZM8 21h8m-4-6v6', arrow: 'm15 5-7 7 7 7', close: 'm6 6 12 12M6 18 18 6',
  check: 'm5 12 4 4L20 5', refresh: 'M20 8a8 8 0 1 0 0 8m0-13v5h-5', external: 'M14 3h7v7m0-7L10 14M10 3H3v18h18v-7', logout: 'M9 3H3v18h6m6-14 5 5-5 5m-7-5h12',
};
export function Icon({ name, size = 22, color = colors.muted }: { name: IconName; size?: number; color?: string }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {name === 'play' ? <Path d="m7 4 14 8-14 8Z" fill={color} strokeWidth={0} /> : name === 'pause' ? <><Rect x={6} y={4} width={4} height={16} fill={color} strokeWidth={0} /><Rect x={14} y={4} width={4} height={16} fill={color} strokeWidth={0} /></> : name === 'music' ? <><Path d="M9 18V5l12-2v13M9 8l12-2" /><Circle cx={6} cy={18} r={3} /><Circle cx={18} cy={16} r={3} /></> : <Path d={paths[name]} />}
  </Svg>;
}
export function Mark({ size = 35 }: { size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden><Circle cx={20} cy={20} r={20} fill={colors.green} /><Path d="M11 16c5-5 13-5 18 0M11 22c5-5 13-5 18 0M15 28c3-3 7-3 10 0" stroke={colors.canvas} strokeWidth={3} strokeLinecap="round" /></Svg>;
}
export function RecordArt({ size = 300 }: { size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 360 360" aria-hidden>
    <Rect width={360} height={360} rx={24} fill="#193b29" />
    <Path d="M-20 280 280-20h100L80 380H-20Z" fill="#205034" />
    <Circle cx={180} cy={180} r={139} fill="#0a110d" />
    {[128, 118, 108, 98, 88, 78].map(r => <Circle key={r} cx={180} cy={180} r={r} fill="none" stroke="#29382e" strokeWidth={1} />)}
    <Path d="M80 87a137 137 0 0 1 183 0L180 180ZM80 273a137 137 0 0 0 183 0l-83-93Z" fill="#17241b" />
    <Circle cx={180} cy={180} r={53} fill={colors.green} /><Circle cx={180} cy={180} r={7} fill="#0a110d" />
    <Path d="M159 158h13m-13 7h20m22 28h-13m13 7h-20" stroke="#0c4622" strokeWidth={3} strokeLinecap="round" />
  </Svg>;
}
