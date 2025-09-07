# 响应式布局系统使用指南

本项目提供了一套完整的响应式布局系统，可以大大减少重复的移动端适配代码，提高开发效率。

## 核心概念

### 1. 响应式Provider (ResponsiveProvider)
在应用的根布局中已经集成了 `ResponsiveProvider`，它为整个应用提供了统一的响应式状态。

### 2. 响应式Hook (useResponsive)
```tsx
import { useResponsive } from '@/layout/responsive';

function MyComponent() {
  const { isMobile, isTablet, isDesktop, breakpoint } = useResponsive();
  
  return (
    <div>
      {isMobile && <p>移动端内容</p>}
      {isDesktop && <p>桌面端内容</p>}
    </div>
  );
}
```

## 响应式组件

### 1. PageLayout - 页面布局组件
替代重复的页面标题和容器配置：

```tsx
import { PageLayout, ResponsiveButton } from '@/layout/responsive';

export default function MyPage() {
  return (
    <PageLayout 
      title="页面标题"
      actions={
        <ResponsiveButton>
          新增按钮
        </ResponsiveButton>
      }
    >
      {/* 页面内容 */}
    </PageLayout>
  );
}
```

**替代了以下重复代码：**
```tsx
// 之前需要重复写的代码
<Container maxWidth="lg" sx={{ py: { xs: 2, md: 3 } }}>
  <Box
    display="flex"
    flexDirection={{ xs: 'column', sm: 'row' }}
    justifyContent="space-between"
    alignItems={{ xs: 'stretch', sm: 'center' }}
    mb={3}
    gap={{ xs: 2, sm: 0 }}
  >
    <Typography
      variant={isMobile ? 'h5' : 'h4'}
      component="h1"
      sx={{ textAlign: { xs: 'center', sm: 'left' } }}
    >
      页面标题
    </Typography>
    <Button fullWidth={isMobile}>新增按钮</Button>
  </Box>
  {/* 内容 */}
</Container>
```

### 2. ResponsiveTypography - 响应式文字
```tsx
import { ResponsiveTitle, ResponsiveSubtitle, ResponsiveTypography } from '@/layout/responsive';

// 预定义的标题组件
<ResponsiveTitle>自动响应式标题</ResponsiveTitle>
<ResponsiveSubtitle>自动响应式副标题</ResponsiveSubtitle>

// 自定义响应式文字
<ResponsiveTypography 
  variants={{ xs: 'body1', md: 'h6' }}
  mobileAlign="center"
  desktopAlign="left"
>
  自定义响应式文字
</ResponsiveTypography>
```

### 3. ResponsiveGrid - 响应式网格
```tsx
import { ResponsiveGrid, CardGrid, DashboardGrid } from '@/layout/responsive';

// 预定义的卡片网格 (1列->2列->3列->4列)
<CardGrid>
  {items.map(item => <Card key={item.id}>...</Card>)}
</CardGrid>

// 预定义的仪表板网格 (1列->2列->2列->4列)
<DashboardGrid>
  {stats.map(stat => <StatCard key={stat.id}>...</StatCard>)}
</DashboardGrid>

// 自定义网格
<ResponsiveGrid 
  columns={{ xs: 1, sm: 2, lg: 4 }}
  gap={3}
>
  {children}
</ResponsiveGrid>
```

### 4. ResponsiveButton - 响应式按钮
```tsx
import { ResponsiveButton, ResponsiveButtonGroup } from '@/layout/responsive';

// 移动端自动全宽的按钮
<ResponsiveButton>自动适配按钮</ResponsiveButton>

// 按钮组
<ResponsiveButtonGroup>
  <ResponsiveButton>按钮1</ResponsiveButton>
  <ResponsiveButton>按钮2</ResponsiveButton>
</ResponsiveButtonGroup>
```

### 5. SectionLayout - 区块布局
```tsx
import { SectionLayout } from '@/layout/responsive';

<SectionLayout title="区块标题">
  {/* 区块内容 */}
</SectionLayout>
```

## 迁移指南

### 原有页面重构步骤

1. **替换页面容器**
```tsx
// 之前
<Container maxWidth="lg" sx={{ py: { xs: 2, md: 3 } }}>
  <Typography variant={isMobile ? 'h5' : 'h4'}>页面标题</Typography>
  {/* 内容 */}
</Container>

// 之后
<PageLayout title="页面标题">
  {/* 内容 */}
</PageLayout>
```

2. **替换响应式检测**
```tsx
// 之前
const theme = useTheme();
const isMobile = useMediaQuery(theme.breakpoints.down('md'));

// 之后
const { isMobile } = useResponsive();
```

3. **替换网格布局**
```tsx
// 之前
<Box
  sx={{
    display: 'grid',
    gridTemplateColumns: {
      xs: '1fr',
      sm: 'repeat(2, 1fr)',
      md: 'repeat(3, 1fr)',
    },
    gap: { xs: 2, md: 3 },
  }}
>

// 之后
<CardGrid>
```

4. **替换按钮适配**
```tsx
// 之前
<Button fullWidth={isMobile}>按钮</Button>

// 之后
<ResponsiveButton>按钮</ResponsiveButton>
```

## 优势

1. **减少重复代码**：避免每个组件都重复写移动端适配逻辑
2. **统一设计规范**：确保整个应用的响应式行为一致
3. **提高开发效率**：新页面可以快速使用预定义组件
4. **易于维护**：响应式逻辑集中管理，修改更方便
5. **TypeScript支持**：完整的类型定义，开发体验更好

## 最佳实践

1. **优先使用预定义组件**：如 `PageLayout`、`CardGrid` 等
2. **合理使用自定义组件**：对于特殊需求，使用 `ResponsiveTypography` 等灵活组件
3. **保持一致性**：在同一个项目中使用统一的响应式断点
4. **逐步迁移**：可以逐个页面进行重构，不需要一次性全部修改

通过使用这套响应式系统，可以将原本需要在每个组件中重复的移动端适配代码减少80%以上。
