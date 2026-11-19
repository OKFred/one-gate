import type { ReactNode } from 'react';
import { Box, Button, Chip, Switch, Tooltip, Typography } from '@mui/material';
import {
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import type { ProjectedCardField, ProjectedTableColumn } from '@hodor/contracts/frontend';
import type { TableColUiSpec } from '@hodor/contracts/types';
import type { CardField, TableColumn } from '@/components/Responsive/ResponsiveList';
import type { CrudHelpers } from '../types';
import type { CrudExtensions } from './types';
import {
  evaluateCondition,
  getValueByPath,
  interpolateTemplate,
  parseJsonStringArray,
  resolveColorHash,
  stripHtmlTags,
} from './utils';

function renderEnumOrBooleanTag(
  row: Record<string, unknown>,
  ui: TableColUiSpec,
  fieldName: string,
  t: (key: string) => string,
  overrideHideWhenFalse?: boolean,
  overrideTrueLabelKey?: string,
  overrideColor?: TableColUiSpec['color'],
): ReactNode {
  const path = ui.dataPath ?? fieldName;
  const val = getValueByPath(row, path);
  const renderer = ui.renderer ?? 'text';

  if (renderer === 'booleanChip') {
    const boolVal = Boolean(val);
    if ((overrideHideWhenFalse ?? ui.hideWhenFalse) && !boolVal) {
      return null;
    }
    const label = boolVal
      ? t(overrideTrueLabelKey ?? ui.trueLabelKey ?? 'status.enabled')
      : t(ui.falseLabelKey ?? 'status.disabled');
    const color = boolVal
      ? (overrideColor ?? ui.trueColor ?? 'success')
      : (ui.falseColor ?? 'default');
    const chip = (
      <Chip
        icon={ui.showIcon ? boolVal ? <SuccessIcon /> : <ErrorIcon /> : undefined}
        label={label}
        color={color}
        size="small"
        variant={ui.variant ?? 'filled'}
      />
    );
    if (!boolVal && ui.falseTooltipField) {
      const tipVal = getValueByPath(row, ui.falseTooltipField);
      if (tipVal) {
        return <Tooltip title={String(tipVal)}>{chip}</Tooltip>;
      }
    }
    return chip;
  }

  if (renderer === 'enumChip') {
    const matched = ui.options?.find(
      (opt) => opt.value === val || String(opt.value) === String(val),
    );
    let color = matched?.color ?? ui.color ?? 'default';
    if (ui.rangeColors && typeof val === 'number') {
      const range = ui.rangeColors.find(
        (r) =>
          (r.min === undefined || val >= r.min) &&
          (r.max === undefined || val <= r.max) &&
          (r.maxExclusive === undefined || val < r.maxExclusive),
      );
      if (range) color = range.color;
    } else if (ui.hashColor) {
      color = resolveColorHash(String(val ?? ''));
    }
    const label = matched?.labelKey
      ? t(matched.labelKey)
      : (matched?.label ??
        (val === null || val === undefined ? (ui.fallback ?? '-') : String(val)));
    return (
      <Chip
        label={label}
        color={color}
        size="small"
        variant={matched?.variant ?? ui.variant ?? 'outlined'}
      />
    );
  }

  if (renderer === 'jsonArrayChips') {
    const items = parseJsonStringArray(val);
    if (items.length === 0) return null;
    return (
      <>
        {items.map((item) => {
          const matched = ui.options?.find((opt) => String(opt.value) === item);
          const label = matched?.labelKey ? t(matched.labelKey) : (matched?.label ?? item);
          return (
            <Chip
              key={item}
              label={label}
              size="small"
              color={ui.color ?? 'default'}
              variant={ui.variant ?? 'outlined'}
            />
          );
        })}
      </>
    );
  }

  return null;
}

export function renderCellValue(
  row: Record<string, unknown>,
  fieldName: string,
  ui: TableColUiSpec,
  t: (key: string) => string,
): ReactNode {
  if (ui.visibleWhen && !evaluateCondition(ui.visibleWhen, row, true)) {
    return ui.fallbackKey ? t(ui.fallbackKey) : (ui.fallback ?? '-');
  }

  const path = ui.dataPath ?? fieldName;
  const val = getValueByPath(row, path);
  const renderer = ui.renderer ?? 'text';
  const fallback = ui.fallbackKey ? t(ui.fallbackKey) : (ui.fallback ?? '-');

  switch (renderer) {
    case 'booleanChip': {
      const tag = renderEnumOrBooleanTag(row, ui, fieldName, t);
      return (
        tag ?? (
          <Box component="span" sx={{ color: 'text.secondary' }}>
            {fallback}
          </Box>
        )
      );
    }
    case 'booleanText': {
      const boolVal = Boolean(val);
      return boolVal ? t(ui.trueLabelKey ?? 'column.yes') : t(ui.falseLabelKey ?? 'column.no');
    }
    case 'booleanSwitch': {
      return <Switch size="small" checked={Boolean(val)} readOnly />;
    }
    case 'enumChip': {
      return renderEnumOrBooleanTag(row, ui, fieldName, t);
    }
    case 'enumText': {
      const matched = ui.options?.find(
        (opt) => opt.value === val || String(opt.value) === String(val),
      );
      if (matched?.labelKey) return t(matched.labelKey);
      if (matched?.label) return matched.label;
      return val === null || val === undefined || val === '' ? fallback : String(val);
    }
    case 'datetime': {
      if (val === null || val === undefined || val === '') return fallback;
      const numVal = typeof val === 'number' ? val : Number(val);
      if (!Number.isFinite(numVal) && typeof val !== 'string') return fallback;
      return dayjs(Number.isFinite(numVal) ? numVal : String(val)).format(
        ui.format ?? 'YYYY-MM-DD HH:mm:ss',
      );
    }
    case 'code': {
      const str = ui.template
        ? interpolateTemplate(ui.template, row)
        : val === null || val === undefined || val === ''
          ? fallback
          : String(val);
      return (
        <Box
          component="code"
          sx={{
            fontFamily: 'monospace',
            fontSize: '0.85rem',
            maxWidth: ui.maxWidth,
            overflow: ui.ellipsis ? 'hidden' : undefined,
            textOverflow: ui.ellipsis ? 'ellipsis' : undefined,
            whiteSpace: ui.ellipsis ? 'nowrap' : undefined,
            display: ui.ellipsis ? 'inline-block' : undefined,
          }}
        >
          {str}
        </Box>
      );
    }
    case 'jsonArrayChips': {
      const items = parseJsonStringArray(val);
      if (items.length === 0) {
        return (
          <Box component="span" sx={{ color: 'text.secondary' }}>
            {fallback}
          </Box>
        );
      }
      return (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {renderEnumOrBooleanTag(row, ui, fieldName, t)}
        </Box>
      );
    }
    case 'jsonText': {
      if (val === null || val === undefined) return fallback;
      const str = typeof val === 'string' ? val : JSON.stringify(val);
      return (
        <Box
          component="span"
          sx={{
            fontFamily: 'monospace',
            fontSize: '0.8rem',
            maxWidth: ui.maxWidth ?? 240,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'inline-block',
          }}
        >
          {str}
        </Box>
      );
    }
    case 'linkButton': {
      const href = ui.hrefField ? getValueByPath(row, ui.hrefField) : val;
      if (!href) return fallback;
      return (
        <Button
          size="small"
          variant="outlined"
          href={String(href)}
          target="_blank"
          rel="noopener noreferrer"
          startIcon={<OpenInNewIcon fontSize="small" />}
        >
          {t(ui.labelKey ?? 'common.view')}
        </Button>
      );
    }
    case 'stackedText':
    case 'mediaStackedText': {
      const primary = ui.primaryTemplate
        ? interpolateTemplate(ui.primaryTemplate, row)
        : String(getValueByPath(row, ui.primaryField ?? path) ?? fallback);
      const secondary = ui.secondaryTemplate
        ? interpolateTemplate(ui.secondaryTemplate, row)
        : ui.secondaryField
          ? String(getValueByPath(row, ui.secondaryField) ?? '')
          : '';
      const imgUrl =
        renderer === 'mediaStackedText' && ui.imageField
          ? getValueByPath(row, ui.imageField)
          : undefined;
      const size = ui.imageSize ?? 32;
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {typeof imgUrl === 'string' && imgUrl && (
            <Box
              component="img"
              src={imgUrl}
              alt={primary}
              sx={{ width: size, height: size, borderRadius: 1, objectFit: 'cover', flexShrink: 0 }}
            />
          )}
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>
              {primary}
            </Typography>
            {secondary && (
              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                {secondary}
              </Typography>
            )}
          </Box>
        </Box>
      );
    }
    case 'text':
    default: {
      let textStr = ui.template
        ? interpolateTemplate(ui.template, row)
        : val === null || val === undefined || val === ''
          ? ''
          : String(val);

      if (textStr && ui.stripHtml) {
        textStr = stripHtmlTags(textStr);
      }
      if (!textStr) {
        return fallback;
      }
      const decorated = `${ui.prefix ?? ''}${textStr}${ui.suffix ?? ''}`;
      const truncated =
        ui.truncate && decorated.length > ui.truncate
          ? `${decorated.slice(0, ui.truncate)}...`
          : decorated;

      const node = (
        <Typography
          variant="body2"
          component="span"
          sx={{
            fontWeight: ui.bold ? 600 : undefined,
            maxWidth: ui.maxWidth,
            overflow: ui.ellipsis ? 'hidden' : undefined,
            textOverflow: ui.ellipsis ? 'ellipsis' : undefined,
            whiteSpace: ui.ellipsis ? 'nowrap' : undefined,
            display: ui.ellipsis ? 'inline-block' : undefined,
          }}
        >
          {truncated}
        </Typography>
      );

      if (ui.tooltip || (ui.truncate && decorated.length > ui.truncate)) {
        return <Tooltip title={decorated}>{node}</Tooltip>;
      }
      return node;
    }
  }
}

export function buildContractTableColumns<TRecord extends Record<string, unknown>>(
  projectedColumns: readonly ProjectedTableColumn[],
  t: (key: string) => string,
  extensions?: CrudExtensions<TRecord>,
  helpers?: CrudHelpers<TRecord>,
): TableColumn<TRecord>[] {
  const columns: TableColumn<TRecord>[] = projectedColumns.map((col) => {
    const customRenderer = extensions?.customCells?.[col.name];
    return {
      title: col.title ?? (col.titleKey ? t(col.titleKey) : col.name),
      width: col.ui.width,
      align: col.ui.align,
      fixed: col.ui.fixed,
      render: (row: TRecord) =>
        customRenderer
          ? customRenderer(row, t, helpers)
          : renderCellValue(row, col.name, col.ui, t),
    };
  });

  return extensions?.transformColumns ? extensions.transformColumns(columns, t) : columns;
}

export function buildContractCardFields<TRecord extends Record<string, unknown>>(
  projectedCards: readonly ProjectedCardField[],
  t: (key: string) => string,
  extensions?: CrudExtensions<TRecord>,
): CardField<TRecord>[] {
  if (extensions?.customCardFields) {
    return extensions.customCardFields(t);
  }

  const result: CardField<TRecord>[] = [];
  const tagCards: ProjectedCardField[] = [];

  for (const card of projectedCards) {
    if (card.role === 'hidden') continue;
    if (card.role === 'tag') {
      tagCards.push(card);
      continue;
    }
    const label = card.cardUi.labelKey ? t(card.cardUi.labelKey) : undefined;
    result.push({
      type: card.role,
      label,
      render: (row: TRecord) => {
        if (card.cardUi.template) {
          const text = interpolateTemplate(card.cardUi.template, row);
          return card.cardUi.prefix
            ? `${card.cardUi.prefix}${text}`
            : text || (card.cardUi.fallback ?? '-');
        }
        const ui: TableColUiSpec = card.tableUi ?? {
          renderer: 'text',
          fallback: card.cardUi.fallback,
        };
        const rendered = renderCellValue(row, card.name, ui, t);
        return card.cardUi.prefix ? (
          <>
            {card.cardUi.prefix}
            {rendered}
          </>
        ) : (
          rendered
        );
      },
    });
  }

  if (tagCards.length > 0) {
    result.push({
      type: 'tags',
      render: (row: TRecord) => (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {tagCards.map((tc) => {
            const ui: TableColUiSpec = tc.tableUi ?? { renderer: 'booleanChip' };
            return (
              <Box key={tc.name} component="span" sx={{ display: 'inline-flex' }}>
                {renderEnumOrBooleanTag(
                  row,
                  ui,
                  tc.name,
                  t,
                  tc.cardUi.hideWhenFalse,
                  tc.cardUi.trueLabelKey,
                  tc.cardUi.color,
                )}
              </Box>
            );
          })}
        </Box>
      ),
    });
  }

  return result;
}
