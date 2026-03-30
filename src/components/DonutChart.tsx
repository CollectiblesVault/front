import { Fragment } from "react";
import Svg, { G, Path } from "react-native-svg";

type Slice = { value: number; color: string };

function donutSlice(
  cx: number,
  cy: number,
  r0: number,
  r1: number,
  a0: number,
  a1: number
) {
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const x0o = cx + r1 * Math.cos(a0);
  const y0o = cy + r1 * Math.sin(a0);
  const x1o = cx + r1 * Math.cos(a1);
  const y1o = cy + r1 * Math.sin(a1);
  const x0i = cx + r0 * Math.cos(a1);
  const y0i = cy + r0 * Math.sin(a1);
  const x1i = cx + r0 * Math.cos(a0);
  const y1i = cy + r0 * Math.sin(a0);
  return `M ${x0o} ${y0o} A ${r1} ${r1} 0 ${large} 1 ${x1o} ${y1o} L ${x0i} ${y0i} A ${r0} ${r0} 0 ${large} 0 ${x1i} ${y1i} Z`;
}

type Props = {
  data: Slice[];
  size: number;
};

/** Matches Figma innerRadius ~60% of outer radius */
export function DonutChart({ data, size }: Props) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total <= 0) return null;

  const cx = size / 2;
  const cy = size / 2;
  const rOuter = size / 2 - 2;
  const rInner = rOuter * 0.6;
  let a = -Math.PI / 2;

  return (
    <Svg width={size} height={size}>
      <G>
        {data.map((d, i) => {
          const sweep = (d.value / total) * 2 * Math.PI;
          const a1 = a + sweep;
          const dPath = donutSlice(cx, cy, rInner, rOuter, a, a1);
          const el = <Path d={dPath} fill={d.color} />;
          a = a1;
          return <Fragment key={`${d.color}-${i}`}>{el}</Fragment>;
        })}
      </G>
    </Svg>
  );
}
