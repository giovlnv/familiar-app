import Svg, { Circle, Path } from 'react-native-svg';
import { c } from '../theme';

export default function MoonIcon({ frac, size = 26 }: { frac: number; size?: number }) {
  const r = size / 2 - 1;
  const cx = size / 2;
  const k = Math.cos(2 * Math.PI * frac);
  const rx = Math.abs(k) * r;
  const waxing = frac < 0.5;
  const s1 = waxing ? 1 : 0;
  const s2 = waxing ? (frac < 0.25 ? 0 : 1) : frac > 0.75 ? 1 : 0;
  const d = `M ${cx} ${cx - r} A ${r} ${r} 0 0 ${s1} ${cx} ${cx + r} A ${rx} ${r} 0 0 ${s2} ${cx} ${cx - r} Z`;
  return (
    <Svg width={size} height={size}>
      <Circle cx={cx} cy={cx} r={r} fill={c.raised} stroke={c.line} strokeWidth={1} />
      {frac > 0.02 && frac < 0.98 && <Path d={d} fill={c.gold} />}
    </Svg>
  );
}
