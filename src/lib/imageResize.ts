/**
 * 웹 브라우저에서 이미지를 Canvas로 리사이즈해 blob URL로 반환.
 * 배경 제거된 PNG(1MB~3MB)를 그대로 저장하면 모바일 브라우저 메모리 부담이 커서
 * 저장 전 700px로 다운샘플한다.
 */

export async function resizeBlobUrl(
  blobUrl: string,
  maxWidth: number,
  format: 'image/png' | 'image/jpeg' = 'image/png',
  quality = 0.9,
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      resolve(blobUrl);
      return;
    }
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round((height / width) * maxWidth);
        width = maxWidth;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('canvas ctx null'));
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('canvas toBlob null'));
          console.log(
            `[imageResize] ${img.width}x${img.height} → ${width}x${height} (${(blob.size / 1024).toFixed(0)}KB)`,
          );
          resolve(URL.createObjectURL(blob));
        },
        format,
        quality,
      );
    };
    img.onerror = (e) => reject(e);
    img.src = blobUrl;
  });
}
