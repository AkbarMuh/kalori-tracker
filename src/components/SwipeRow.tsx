import { useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { DELETE_THRESHOLD, clampRowDrag } from '../lib/gesture';
import { haptic } from '../lib/haptics';
import { Icon } from './Icon';

interface Props {
  onOpen: () => void;
  onDelete: () => void;
  children: ReactNode;
  className?: string;
}

/** A tappable row that can be swiped left to delete. Vertical drags still scroll the page. */
export function SwipeRow({ onOpen, onDelete, children, className }: Props) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const moved = useRef(false);
  const armed = useRef(false);

  function down(e: PointerEvent) {
    start.current = { x: e.clientX, y: e.clientY };
    moved.current = false;
  }

  function move(e: PointerEvent<HTMLButtonElement>) {
    const s = start.current;
    if (!s) return;
    const mx = e.clientX - s.x;
    const my = e.clientY - s.y;
    if (!moved.current) {
      if (Math.abs(my) > 10 && Math.abs(my) > Math.abs(mx)) {
        start.current = null; // vertical: let the page scroll
        return;
      }
      if (Math.abs(mx) < 8) return;
      moved.current = true;
      setDragging(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    const next = clampRowDrag(mx);
    const nowArmed = next <= DELETE_THRESHOLD;
    if (nowArmed !== armed.current) {
      armed.current = nowArmed;
      if (nowArmed) haptic(8);
    }
    setDx(next);
  }

  function up() {
    if (start.current && moved.current && armed.current) onDelete();
    else setDx(0);
    start.current = null;
    armed.current = false;
    setDragging(false);
  }

  return (
    <div className={`swipe-row ${className ?? ''}`}>
      <div className={`swipe-bg ${dx <= DELETE_THRESHOLD ? 'armed' : ''}`} style={{ opacity: Math.min(1, -dx / 60) }}>
        <Icon name="trash" size={20} />
        Hapus
      </div>
      <button
        className="entry"
        style={{ transform: `translateX(${dx}px)`, transition: dragging ? 'none' : undefined }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onClick={() => {
          if (!moved.current) onOpen();
        }}
      >
        {children}
      </button>
    </div>
  );
}
