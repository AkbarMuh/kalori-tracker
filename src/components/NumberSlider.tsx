import { haptic } from '../lib/haptics';
import { Icon } from './Icon';

interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  onChange: (v: number) => void;
}

const round = (v: number, step: number) => Math.round(v / step) * step;

/** Big number + draggable slider + −/+ buttons, for picking body measurements. */
export function NumberSlider({ label, value, min, max, step = 1, unit, onChange }: Props) {
  const set = (v: number) => onChange(Math.min(max, Math.max(min, round(v, step))));
  const pct = ((value - min) / (max - min)) * 100;
  const shown = step < 1 ? value.toLocaleString('id-ID', { minimumFractionDigits: 1 }) : value.toLocaleString('id-ID');

  return (
    <div className="num-slider">
      <span className="num-slider-label">{label}</span>
      <div className="num-slider-row">
        <button
          className="icon-btn"
          onClick={() => {
            haptic(5);
            set(value - step);
          }}
          aria-label={`Kurangi ${label}`}
        >
          <Icon name="minus" />
        </button>
        <span className="num-slider-value" key={shown}>
          {shown}
          <small>{unit}</small>
        </span>
        <button
          className="icon-btn"
          onClick={() => {
            haptic(5);
            set(value + step);
          }}
          aria-label={`Tambah ${label}`}
        >
          <Icon name="plus" />
        </button>
      </div>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => set(Number(e.target.value))}
        style={{ '--pct': `${pct}%` } as React.CSSProperties}
      />
    </div>
  );
}
