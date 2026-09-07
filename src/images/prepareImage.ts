export interface CropRegion {
  x: number;
  y: number;
  side: number;
  outputSize: number;
}
export function centerCrop(width: number, height: number, maxSize = 1024): CropRegion {
  if (width <= 0 || height <= 0 || !Number.isFinite(width + height))
    throw new Error('У картинки нет размера.');
  const side = Math.min(width, height);
  return {
    x: (width - side) / 2,
    y: (height - side) / 2,
    side,
    outputSize: Math.min(maxSize, side),
  };
}
export interface PreparedImage {
  image: Blob;
  thumbnail: Blob;
  width: number;
  height: number;
}
function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error('Не удалось сохранить картинку. Попробуйте другую фотографию.')),
      'image/jpeg',
      quality,
    ),
  );
}
export async function prepareImage(file: File): Promise<PreparedImage> {
  if (file.size > 30 * 1024 * 1024)
    throw new Error('Эта картинка больше 30 МБ. Выберите фотографию поменьше.');
  if (file.type && !file.type.startsWith('image/'))
    throw new Error('Выберите файл с изображением.');
  const url = URL.createObjectURL(file);
  const image = new Image();
  const canvas = document.createElement('canvas');
  const preview = document.createElement('canvas');
  try {
    // Modern Safari's image decoder applies EXIF orientation before Canvas draws it.
    image.src = url;
    try {
      await image.decode();
    } catch {
      throw new Error('Этот формат не открылся. Попробуйте JPEG, PNG или снимок экрана.');
    }
    if (image.naturalWidth * image.naturalHeight > 60_000_000)
      throw new Error('У картинки очень большое разрешение. Выберите уменьшенную копию.');
    const crop = centerCrop(image.naturalWidth, image.naturalHeight);
    canvas.width = canvas.height = crop.outputSize;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Не удалось обработать фотографию. Попробуйте ещё раз.');
    context.fillStyle = '#f9f7f2';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(
      image,
      crop.x,
      crop.y,
      crop.side,
      crop.side,
      0,
      0,
      canvas.width,
      canvas.height,
    );
    const optimized = await toBlob(canvas, 0.84);
    preview.width = preview.height = Math.min(320, crop.outputSize);
    const previewContext = preview.getContext('2d');
    if (!previewContext) throw new Error('Не удалось подготовить предпросмотр.');
    previewContext.drawImage(canvas, 0, 0, preview.width, preview.height);
    return {
      image: optimized,
      thumbnail: await toBlob(preview, 0.78),
      width: crop.outputSize,
      height: crop.outputSize,
    };
  } finally {
    URL.revokeObjectURL(url);
    image.src = '';
    canvas.width = canvas.height = preview.width = preview.height = 0;
  }
}
