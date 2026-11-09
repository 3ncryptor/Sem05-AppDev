/**
 * pickPhoto: opens the photo library and returns the chosen image as
 * base64, compressed to IMAGE_QUALITY (buildPlan.md 8, Images).
 * Returns null when the user cancels.
 */
import * as ImagePicker from 'expo-image-picker';
import { IMAGE_QUALITY } from '../constants/config';
import { guessMimeType, uploadFileName } from './fileData';
import { log } from './logger';

/**
 * @returns {Promise<{ uri: string, data: string, mimeType: string, fileName: string } | null>}
 */
export async function pickPhoto() {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    base64: true,
    quality: IMAGE_QUALITY,
    allowsMultipleSelection: false,
  });
  if (result.canceled || !result.assets?.length) {
    log.app('photo picker: cancelled');
    return null;
  }
  const asset = result.assets[0];
  if (!asset.base64) throw new Error('The photo could not be read.');
  const fileName = uploadFileName(asset.fileName);
  log.app(`photo picker: ${fileName} ${asset.width}x${asset.height}`);
  return {
    uri: asset.uri,
    data: asset.base64,
    mimeType: asset.mimeType ?? guessMimeType(fileName),
    fileName,
  };
}
