import { Alert, Platform } from "react-native";

import { extractUploadedImageUrl, uploadImageFileApi } from "../api/vaultApi";

export type PickedLocalImage = {
  uri: string;
  fileName?: string;
  mimeType?: string;
};

export async function pickImageFromDevice(source: "camera" | "library"): Promise<PickedLocalImage | null> {
  const ImagePicker = await import("expo-image-picker");
  if (source === "camera") {
    if (Platform.OS === "web") {
      Alert.alert("Камера", "В браузере выберите фото через «Галерея / файл».");
      return null;
    }
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.status !== "granted") {
      Alert.alert("Нет доступа к камере", "Дайте разрешение в настройках устройства.");
      return null;
    }
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
    });
    if (res.canceled) return null;
    const a = res.assets?.[0];
    const uri = a?.uri;
    if (!uri) return null;
    return { uri, fileName: a?.fileName ?? undefined, mimeType: a?.mimeType ?? undefined };
  }
  if (Platform.OS !== "web") {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== "granted") {
      Alert.alert("Нет доступа к галерее", "Дайте разрешение в настройках устройства.");
      return null;
    }
  }
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: Platform.OS !== "web",
    quality: 0.85,
  });
  if (res.canceled) return null;
  const a = res.assets?.[0];
  const uri = a?.uri;
  if (!uri) return null;
  return { uri, fileName: a?.fileName ?? undefined, mimeType: a?.mimeType ?? undefined };
}

function defaultNameMime(uri: string, mimeType?: string, fileName?: string) {
  let mime = mimeType ?? "image/jpeg";
  if (!mimeType) {
    const lower = uri.toLowerCase();
    if (lower.includes(".png")) mime = "image/png";
    else if (lower.includes(".webp")) mime = "image/webp";
  }
  let name = fileName;
  if (!name) {
    if (mime.includes("png")) name = "photo.png";
    else if (mime.includes("webp")) name = "photo.webp";
    else name = "photo.jpg";
  }
  return { fileName: name, mimeType: mime };
}

/** Multipart `POST /api/upload` → публичный URL для `image_url` предмета/коллекции. */
export async function uploadImageFromLocalUri(opts: {
  token: string;
  uri: string;
  fileName?: string;
  mimeType?: string;
}): Promise<string> {
  const { fileName, mimeType } = defaultNameMime(opts.uri, opts.mimeType, opts.fileName);
  const raw = await uploadImageFileApi({
    token: opts.token,
    fileUri: opts.uri,
    fileName,
    mimeType,
  });
  const url = extractUploadedImageUrl(raw);
  if (!url) {
    throw new Error("Сервер не вернул URL изображения");
  }
  return url;
}
