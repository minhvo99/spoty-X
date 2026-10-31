import { View, Text } from "react-native";
import Svg, {
  Rect,
  Circle,
  Path,
  Defs,
  LinearGradient,
  Stop,
} from "react-native-svg";
export function MusicArt({
  color,
  title,
  size = 56,
  wide = false,
}: {
  color: string;
  title: string;
  size?: number;
  wide?: boolean;
}) {
  return (
    <View
      style={{
        width: wide ? "100%" : size,
        aspectRatio: 1,
        borderRadius: wide ? 12 : Math.min(size / 8, 14),
        overflow: "hidden",
        backgroundColor: color,
      }}
      accessibilityLabel={`Ảnh bìa minh họa ${title}`}
    >
      <Svg width="100%" height="100%" viewBox="0 0 300 300">
        <Defs>
          <LinearGradient id={"a" + color.slice(1)} x1="0" y1="0" x2="1" y2="1">
            <Stop stopColor={color} />
            <Stop offset="1" stopColor="#101813" />
          </LinearGradient>
        </Defs>
        <Rect width="300" height="300" fill={`url(#a${color.slice(1)})`} />
        <Circle cx="206" cy="95" r="74" fill="#ffffff" opacity="0.2" />
        <Circle
          cx="206"
          cy="95"
          r="50"
          fill="none"
          stroke="#ffffff"
          strokeWidth="0.8"
          opacity="0.4"
        />
        <Path
          d="M-20 265Q80 100 170 230T340 180V340H-20Z"
          fill="#09120c"
          opacity="0.55"
        />
        <Path
          d="M-20 240Q100 130 180 250T340 200"
          stroke="#ffffff"
          strokeWidth="1"
          fill="none"
          opacity="0.25"
        />
      </Svg>
      {(size >= 120 || wide) && (
        <View
          style={{
            position: "absolute",
            left: 18,
            right: 16,
            bottom: 18,
            gap: 5,
          }}
        >
          <Text
            numberOfLines={2}
            style={{
              color: "#fff",
              fontWeight: "800",
              fontSize: wide ? 20 : Math.min(28, size / 8),
              letterSpacing: -0.7,
            }}
          >
            {title}
          </Text>
          <Text style={{ color: "#e5eae5", fontSize: 10 }}>
            Spoty-X selections
          </Text>
        </View>
      )}
    </View>
  );
}
