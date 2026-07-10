/** 온도 값으로부터 가감 5도 범위 */
export function deriveTempRange(temp: number): { min: number; max: number } {
  return { min: temp - 5, max: temp + 5 };
}

/**
 * 카테고리 + 계절 → 다중 계절 태그 자동 결정.
 * - 여름 (반팔/반바지 등): 여름 only
 * - 자켓: 봄/가을 + 겨울
 * - 기타 (긴팔): 봄/가을 + 겨울
 */
export function deriveSeasonTags(category: string, season: string): string[] {
  if (season === 'summer') return ['summer'];
  if (category === 'jacket') return ['spring_fall', 'winter'];
  return ['spring_fall', 'winter'];
}

/**
 * 이미지 URI로 djb2 기반 간단 해시 계산.
 * 중복 등록 방지용이며 암호학적 강도는 필요 없음.
 */
export async function computeImageHash(uri: string): Promise<string> {
  const imgRes = await fetch(uri);
  const imgBuf = await imgRes.arrayBuffer();
  const bytes = new Uint8Array(imgBuf);
  let hash = 5381;
  const step = Math.max(1, Math.floor(bytes.length / 2000));
  for (let i = 0; i < bytes.length; i += step) {
    hash = ((hash << 5) + hash + bytes[i]) >>> 0;
  }
  return `img_${hash.toString(36)}`;
}
