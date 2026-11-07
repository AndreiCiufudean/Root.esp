import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

// On web, shrink the picked photo so it fits comfortably into browser storage.
function shrinkWeb(uri, max = 720) {
  return new Promise((resolve) => {
    try {
      const img = new window.Image();
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.78));
      };
      img.onerror = () => resolve(uri);
      img.src = uri;
    } catch (e) {
      resolve(uri);
    }
  });
}

// Opens the gallery and returns an image uri, or null if cancelled / not allowed.
export async function pickImage({ square = false } = {}) {
  if (Platform.OS !== 'web') {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return null;
  }
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: square,
    aspect: square ? [1, 1] : undefined,
    quality: 0.6,
  });
  if (res.canceled || !res.assets?.length) return null;
  const uri = res.assets[0].uri;
  return Platform.OS === 'web' ? shrinkWeb(uri, square ? 480 : 900) : uri;
}
