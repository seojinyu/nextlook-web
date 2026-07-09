# NextLook UI 컴포넌트 & 디자인 토큰 사용법

## 1. 디자인 토큰

```tsx
import { colors, spacing, radius, fontSize, fontWeight, shadow } from '../theme/tokens';

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    padding: spacing.lg,          // 16
    borderRadius: radius.lg,      // 16
    ...(shadow.md as object),
  },
  title: {
    fontSize: fontSize.title,     // 20
    fontWeight: fontWeight.bold as any,
    color: colors.ink,
  },
});
```

## 2. 공통 컴포넌트

### Card

```tsx
import { Card } from '../components/ui';

<Card>기본 카드</Card>
<Card variant="elevated" padding="lg">그림자 있는 카드</Card>
<Card variant="outlined" onPress={handlePress}>클릭 가능</Card>
<Card variant="soft" padding="sm">배경만 있는 카드</Card>
```

**variant**: `flat` | `outlined` | `elevated` | `soft`
**padding**: `none` | `sm` | `md` | `lg` | `xl`

### Button

```tsx
import { Button } from '../components/ui';

<Button onPress={save}>저장</Button>
<Button variant="secondary" size="sm">취소</Button>
<Button variant="danger" loading={deleting}>삭제</Button>
<Button variant="outline" fullWidth>전체선택</Button>
<Button variant="ghost">건너뛰기</Button>
```

**variant**: `primary` | `secondary` | `ghost` | `danger` | `outline`
**size**: `sm` | `md` | `lg`

### Chip

```tsx
import { Chip } from '../components/ui';

<Chip selected={isSpring} onPress={() => toggle('spring')}>봄</Chip>
<Chip variant="filled" color="primary">추천</Chip>
<Chip size="sm">상의</Chip>
```

**variant**: `default` | `filled` | `ghost`
**color**: `neutral` | `primary` | `danger` | `success`

### Txt (텍스트)

```tsx
import { Txt } from '../components/ui';

<Txt variant="h1">타이틀</Txt>
<Txt variant="body" color="muted">설명</Txt>
<Txt variant="label" weight="bold">라벨</Txt>
<Txt variant="caption" align="center">가운데 정렬 캡션</Txt>
```

**variant**: `hero` | `h1` | `h2` | `h3` | `title` | `body` | `bodySm` | `label` | `caption`
**color**: `ink` | `inkSoft` | `muted` | `mutedLight` | `primary` | `danger` | `success` | `white`

### Screen

```tsx
import { Screen } from '../components/ui';

<Screen>
  <Txt variant="h1">화면 제목</Txt>
</Screen>

<Screen background="surface" padding="md">
  <Txt>흰 배경 화면</Txt>
</Screen>
```

## 3. 마이그레이션 팁

기존 코드를 한 번에 바꾸지 마세요. 새 화면부터 적용하고,
기존 화면은 리팩터링할 때 자연스럽게 교체하세요.

**Before**
```tsx
<View style={{ backgroundColor: '#fff', padding: 16, borderRadius: 16 }}>
  <Text style={{ fontSize: 20, fontWeight: '800' }}>제목</Text>
</View>
```

**After**
```tsx
<Card padding="lg" radiusSize="lg">
  <Txt variant="title">제목</Txt>
</Card>
```
