// One icon component for the whole app. Icons are vector shapes (Material Design Icons) drawn with
// react-native-svg, so they show up immediately in the APK, on web and in Expo Go, with no icon font to load.
// To add a new icon name, run: python tools/build-icons.py <folder with MDI .svg files>
import React from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import PATHS from './iconPaths';
import { colors } from './theme';

export default function Icon({ name, size = 20, color, style }) {
  const d = PATHS[name] || PATHS['circle-outline'] || PATHS.sprout;
  return <View pointerEvents="none" style={[{ width: size, height: size }, style]}>
    <Svg width={size} height={size} viewBox="0 0 24 24"><Path d={d} fill={color || colors.soil} /></Svg>
  </View>;
}
// True when a stored "look" value is an icon name rather than a legacy emoji.
export const isIconName = (v) => typeof v === 'string' && /^[a-z][a-z0-9-]*$/.test(v);
