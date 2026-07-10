/**
 * Canvas 기반 이미지 리사이즈.
 * 배경 제거 전 이미지 크기를 줄여 처리 속도를 3~4배 향상시킨다.
 */
export async function resizeImage(uri: string, maxDim: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height / width) * maxDim);
          width = maxDim;
        } else {
          width = Math.round((width / height) * maxDim);
          height = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('canvas ctx null'));
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('blob null'));
          console.log(
            `[bgRemove] Resized: ${img.width}x${img.height} → ${width}x${height} (${(blob.size / 1024).toFixed(0)}KB)`,
          );
          resolve(blob);
        },
        'image/jpeg',
        0.92,
      );
    };
    img.onerror = reject;
    img.src = uri;
  });
}
