/** @imgly/background-removal 라이브러리를 로드할 CDN 목록. 순서대로 시도. */
export const CDN_URLS = [
  'https://esm.sh/@imgly/background-removal@1.7.0',
  'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm',
];

/**
 * 처리 전 이미지 최대 크기(px).
 * 512에서 768로 상향 조정 — 옷 상단(어깨/목선)이 배경으로 잘못 인식되어
 * 잘려나가던 문제 해결. 해상도가 낮으면 옷과 배경의 경계 판단이 부정확해짐.
 */
export const MAX_DIMENSION = 768;

export function isMobileUA(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '');
}
