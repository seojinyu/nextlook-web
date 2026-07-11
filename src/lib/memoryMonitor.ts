/**
 * 브라우저 메모리 사용량 진단 도구.
 *
 * Chromium 계열(크롬·삼성 인터넷·네이버 인앱·엣지)에서만 지원되는
 * performance.memory API를 활용해 실시간 힙 사용량을 로그로 남긴다.
 *
 * 사용 시나리오:
 *  - 옷장/추천 화면 진입 시 → 초기 메모리 확인
 *  - 크래시 재현 시 → 마지막 로그를 확인해 메모리 임계 도달 여부 판단
 *
 * Safari에는 없으므로 undefined 체크로 안전하게 스킵.
 */

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

function toMB(bytes: number): number {
  return Math.round(bytes / 1024 / 1024);
}

/** 메모리 상태를 콘솔에 남긴다. 라벨은 어느 지점 로그인지 구분용. */
export function logMemory(label: string) {
  if (typeof performance === 'undefined') return;
  const mem = (performance as any).memory as MemoryInfo | undefined;
  if (!mem) return;
  const used = toMB(mem.usedJSHeapSize);
  const limit = toMB(mem.jsHeapSizeLimit);
  const pct = Math.round((mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100);
  const warn = pct > 80 ? '⚠️ ' : '';
  console.log(`${warn}[Memory:${label}] ${used}MB / ${limit}MB (${pct}%)`);
}

/** 위험 수준(80% 이상)이면 true. 미리 정리해야 함을 알리는 데 사용. */
export function isMemoryPressure(): boolean {
  if (typeof performance === 'undefined') return false;
  const mem = (performance as any).memory as MemoryInfo | undefined;
  if (!mem) return false;
  return mem.usedJSHeapSize / mem.jsHeapSizeLimit > 0.8;
}
