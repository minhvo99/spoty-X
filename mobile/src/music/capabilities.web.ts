// iOS browsers require physical device volume controls (expo-audio documents this limitation).
export const canControlVolume = () =>
  !/iPad|iPhone|iPod/.test(navigator.userAgent);
