import { Stack } from "expo-router";
import { MusicProvider } from "../music/provider";
import { SafeAreaProvider } from "react-native-safe-area-context";
export default function Layout() {
  return (
    <SafeAreaProvider>
      <MusicProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "#080a09" },
          }}
        />
      </MusicProvider>
    </SafeAreaProvider>
  );
}
