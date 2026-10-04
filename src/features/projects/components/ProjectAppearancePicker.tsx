import { Check, Sparkles } from 'lucide-react';
import { type KeyboardEvent, type ReactNode, useRef } from 'react';

import {
  PROJECT_COLOR_LABELS,
  PROJECT_COLORS,
  PROJECT_ICON_LABELS,
  PROJECT_ICON_NAMES,
  type ProjectColor,
  type ProjectIconName,
} from '@/domain/project/appearance';
import { cn } from '@/lib/cn';

import { ProjectIconGlyph } from './ProjectIcon';

export interface ProjectAppearance {
  /** null — цвет выберет сервер (только при создании). */
  color: ProjectColor | null;
  /** null — иконка по умолчанию. */
  icon: ProjectIconName | null;
}

interface ProjectAppearancePickerProps {
  value: ProjectAppearance;
  onChange: (value: ProjectAppearance) => void;
  /** Показывать вариант «Автоматически» для цвета; при редактировании цвет уже есть. */
  allowAutoColor?: boolean;
  /** Цвет, которым рисуются иконки, пока цвет не выбран. */
  previewColor: string;
  disabled?: boolean;
}

interface Choice<T> {
  value: T;
  label: string;
  render: (selected: boolean) => ReactNode;
}

/** Радиогруппа с перемещением стрелками; Tab попадает только в выбранный вариант. */
function ChoiceGroup<T>({
  label,
  choices,
  value,
  onChange,
  disabled,
}: {
  label: string;
  choices: Choice<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedIndex = Math.max(
    0,
    choices.findIndex((choice) => choice.value === value),
  );

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const delta =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? -1
          : 0;
    if (delta === 0) return;
    event.preventDefault();
    const next = (index + delta + choices.length) % choices.length;
    const choice = choices[next];
    if (!choice) return;
    onChange(choice.value);
    refs.current[next]?.focus();
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
        {choices.map((choice, index) => {
          const selected = index === selectedIndex;
          return (
            <button
              key={choice.label}
              ref={(element) => {
                refs.current[index] = element;
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={choice.label}
              title={choice.label}
              tabIndex={selected ? 0 : -1}
              disabled={disabled}
              onClick={() => onChange(choice.value)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className="rounded-lg outline-none transition-transform duration-150 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 motion-safe:active:scale-95"
            >
              {choice.render(selected)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ProjectAppearancePicker({
  value,
  onChange,
  allowAutoColor = false,
  previewColor,
  disabled,
}: ProjectAppearancePickerProps) {
  const colorChoices: Choice<ProjectColor | null>[] = [
    ...(allowAutoColor
      ? [
          {
            value: null,
            label: 'Автоматически',
            render: (selected: boolean) => (
              <span
                className={cn(
                  'flex size-8 items-center justify-center rounded-full border border-dashed text-muted-foreground',
                  selected && 'border-solid border-foreground text-foreground',
                )}
              >
                <Sparkles aria-hidden className="size-4" />
              </span>
            ),
          },
        ]
      : []),
    ...PROJECT_COLORS.map((color) => ({
      value: color,
      label: PROJECT_COLOR_LABELS[color],
      render: (selected: boolean) => (
        <span
          className={cn(
            'flex size-8 items-center justify-center rounded-full text-white ring-offset-2 ring-offset-background',
            selected && 'ring-2 ring-foreground',
          )}
          style={{ backgroundColor: `#${color}` }}
        >
          {selected ? <Check aria-hidden className="size-4" /> : null}
        </span>
      ),
    })),
  ];

  const iconColor = value.color ? `#${value.color}` : previewColor;
  const iconChoices: Choice<ProjectIconName | null>[] = [
    { value: null, label: 'По умолчанию', name: null },
    ...PROJECT_ICON_NAMES.map((name) => ({ value: name, label: PROJECT_ICON_LABELS[name], name })),
  ].map(({ value: iconValue, label, name }) => ({
    value: iconValue,
    label,
    render: (selected: boolean) => (
      <span
        className={cn(
          'flex size-9 items-center justify-center rounded-lg border transition-colors',
          selected ? 'border-transparent' : 'border-border hover:bg-muted',
        )}
        style={selected ? { backgroundColor: `${iconColor}1A`, color: iconColor } : undefined}
      >
        <ProjectIconGlyph icon={name ? { kind: 'lucide', name } : { kind: 'default' }} />
      </span>
    ),
  }));

  return (
    <div className="grid gap-4">
      <ChoiceGroup
        label="Цвет"
        choices={colorChoices}
        value={value.color}
        onChange={(color) => onChange({ ...value, color })}
        disabled={disabled}
      />
      <ChoiceGroup
        label="Иконка"
        choices={iconChoices}
        value={value.icon}
        onChange={(icon) => onChange({ ...value, icon })}
        disabled={disabled}
      />
    </div>
  );
}
