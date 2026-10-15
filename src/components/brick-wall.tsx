import { formatKesShort } from "@/lib/money";

const COLS = 10;
const ROWS = 10;
const BRICK_W = 96;
const BRICK_H = 30;
const GAP = 4;
const WALL_W = COLS * (BRICK_W + GAP) - GAP;
const WALL_H = ROWS * (BRICK_H + GAP) - GAP;

/**
 * The tuition block's progress as a wall of 100 bricks, each worth 1% of the target
 * (KES 1 million for the KES 100M block). The wall is laid from the bottom course up,
 * in running bond, the way the building itself will rise.
 */
export function BrickWall({ pledged, target, className = "" }: { pledged: number; target: number; className?: string }) {
  const perBrick = target / (COLS * ROWS);
  const filled = pledged / perBrick;
  const label = `${formatKesShort(pledged)} pledged of ${formatKesShort(target)}. Each brick is ${formatKesShort(perBrick)}.`;

  const bricks: React.ReactNode[] = [];
  for (let i = 0; i < COLS * ROWS; i++) {
    const course = Math.floor(i / COLS); // 0 = bottom course
    const col = i % COLS;
    const offset = course % 2 === 1 ? -(BRICK_W + GAP) / 2 : 0;
    const x = col * (BRICK_W + GAP) + offset;
    const y = WALL_H - (course + 1) * BRICK_H - course * GAP;
    const fill = Math.max(0, Math.min(1, filled - i));
    bricks.push(
      <g key={i}>
        <rect x={x} y={y} width={BRICK_W} height={BRICK_H} rx={2} fill="var(--color-brick-empty)" />
        {fill > 0 && (
          <rect
            x={x}
            y={y}
            width={BRICK_W * fill}
            height={BRICK_H}
            rx={2}
            fill="var(--color-gold)"
            style={{ animation: `lay-brick 500ms ease-out ${200 + i * 140}ms both` }}
          />
        )}
      </g>,
    );
    // Close the gap at the end of each offset course with a half brick.
    if (course % 2 === 1 && col === COLS - 1) {
      bricks.push(
        <rect
          key={`end-${i}`}
          x={WALL_W - BRICK_W / 2 + GAP / 2}
          y={y}
          width={BRICK_W / 2 - GAP / 2}
          height={BRICK_H}
          rx={2}
          fill="var(--color-brick-empty)"
        />,
      );
    }
  }

  return (
    <svg
      viewBox={`0 0 ${WALL_W} ${WALL_H}`}
      role="img"
      aria-label={label}
      className={`block h-auto w-full ${className}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <title>{label}</title>
      <defs>
        <clipPath id="wall">
          <rect x={0} y={0} width={WALL_W} height={WALL_H} />
        </clipPath>
      </defs>
      <g clipPath="url(#wall)">{bricks}</g>
    </svg>
  );
}
