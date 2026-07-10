export interface PixelCrop {
  x: number;
  y: number;
  width: number;
  height: number;
  unit: 'px' | '%';
}

/** Canvas API로 이미지의 crop 영역을 잘라 blob URL로 반환 */
export async function getCroppedImage(
  image: HTMLImageElement,
  crop: PixelCrop,
): Promise<string> {
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(crop.width * scaleX);
  canvas.height = Math.floor(crop.height * scaleY);

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  return new Promise<string>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error('Canvas is empty'));
        resolve(URL.createObjectURL(blob));
      },
      'image/jpeg',
      0.92,
    );
  });
}
