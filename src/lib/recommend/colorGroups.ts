/**
 * 색상 조합 규칙.
 * - 뉴트럴은 모든 색과 매칭
 * - 같은 그룹끼리 매칭 (톤온톤)
 * - 관대 모드에서는 웜↔어스, 쿨↔어스 조화도 허용
 */

export const COLOR_GROUPS: Record<string, string[]> = {
  neutral: ['#000000', '#FFFFFF', '#888888', '#D7C9AA', '#CCCCCC', '#444444', '#FFFDD0'],
  cool: ['#1B2A4A', '#2962FF', '#82B1FF', '#7B1FA2', '#98FF98'],
  warm: ['#D32F2F', '#EF6C00', '#FDD835', '#F48FB1', '#722F37'],
  earth: ['#5D4037', '#6B7B3A', '#2E7D32'],
};

const GROUP_KR: Record<string, string> = {
  neutral: '뉴트럴',
  cool: '쿨톤',
  warm: '웜톤',
  earth: '어스톤',
};

export function getColorGroup(hex: string): string {
  for (const [group, colors] of Object.entries(COLOR_GROUPS)) {
    if (colors.includes(hex)) return group;
  }
  return 'neutral';
}

export function groupName(group: string): string {
  return GROUP_KR[group] ?? group;
}

/**
 * 색상 매칭 검사
 * @param strict true (기본): 뉴트럴 또는 같은 그룹만
 *               false (관대): + 인접 톤(웜↔어스, 쿨↔어스) 허용
 */
export function colorsMatch(a: string, b: string, strict = true): boolean {
  const ga = getColorGroup(a);
  const gb = getColorGroup(b);
  if (ga === 'neutral' || gb === 'neutral') return true;
  if (ga === gb) return true;

  if (!strict) {
    if ((ga === 'warm' && gb === 'earth') || (ga === 'earth' && gb === 'warm')) return true;
    if ((ga === 'cool' && gb === 'earth') || (ga === 'earth' && gb === 'cool')) return true;
  }
  return false;
}
