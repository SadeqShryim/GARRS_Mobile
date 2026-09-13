// src/ocr/capture.ts
// Spec §8 — takes a still, crops it to the VIN guide (mapped through cropRectFor), and upsizes the crop
// so tesseract has enough pixels to read. No React; `camera` is a structural ref, not expo-camera's type,
// so this stays testable without a real CameraView.

import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { cropRectFor, orientationOf, type Rect, type Size } from './crop';

export type CameraLike = {
  takePictureAsync: (o: { quality: number; skipProcessing: boolean; base64: boolean; exif: boolean }) => Promise<{
    uri: string;
    width: number;
    height: number;
    exif?: { Orientation?: number } | null;
  }>;
};

export async function captureVin(
  camera: CameraLike,
  guide: Rect,
  preview: Size
): Promise<{ base64: string; width: number; height: number; crop: Rect }> {
  // §8: skipProcessing false so Android hands back an already-upright image; exif true so iOS's rotation
  // tag (left in EXIF rather than baked into pixels, 57.0.3+) is available to cropRectFor. base64 false —
  // only the final, cropped/resized JPEG needs to carry base64 data.
  const photo = await camera.takePictureAsync({ quality: 0.85, skipProcessing: false, base64: false, exif: true });

  const crop = cropRectFor(guide, preview, { w: photo.width, h: photo.height }, { orientation: orientationOf(photo.exif) });

  const rendered = await ImageManipulator.manipulate(photo.uri)
    .crop({ originX: crop.x, originY: crop.y, width: crop.w, height: crop.h })
    .resize({ width: 1400 }) // upscaling short crops is what makes tesseract read them (§8); height auto
    .renderAsync();
  const result = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.9, base64: true });

  if (!result.base64) throw new Error('no-base64');

  return { base64: result.base64, width: result.width, height: result.height, crop };
}
