/** @imgly/background-removal 라이브러리를 로드할 CDN 목록. 순서대로 시도. */
export const CDN_URLS = [
  'https://esm.sh/@imgly/background-removal@1.7.0',
  'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm',
];

/** 처리 전 이미지 최대 크기(px). 작을수록 배경 제거가 빨라짐. */
export const MAX_DIMENSION = 512;

export function isMobileUA(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '');
}
