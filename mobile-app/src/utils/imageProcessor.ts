import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

export interface ProcessedImage {
  uri: string;
  width: number;
  height: number;
}

/**
 * Handles picking an image from the library and automatically routing it 
 * through the compression pipeline.
 */
export const pickAndProcessImage = async (): Promise<ProcessedImage | null> => {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, // Let users crop the relevant P&L info
      quality: 1, // Start raw
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const originalUri = result.assets[0].uri;

    // Production Compression Pipeline: WebP, max 1200px width, 80% quality
    return await compressForProduction(originalUri);
  } catch (error) {
    console.error("Image pick/process error:", error);
    throw new Error("Failed to process image.");
  }
};

/**
 * Standardized compression function to handle heavy P&L screenshots.
 */
export const compressForProduction = async (uri: string): Promise<ProcessedImage> => {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1200 } }], // maintains aspect ratio
    { compress: 0.8, format: ImageManipulator.SaveFormat.WEBP }
  );

  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
  };
};
