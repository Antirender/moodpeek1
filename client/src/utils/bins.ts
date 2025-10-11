// src/utils/bins.ts
import { Mood } from "../types";

export const tempBins = [-10, 0, 5, 10, 15, 20, 25, 30, 35, 40]; // °C 阶梯
export function binTemp(t: number) {
  for (let i = 0; i < tempBins.length - 1; i++) {
    if (t >= tempBins[i] && t < tempBins[i+1]) return `${tempBins[i]}~${tempBins[i+1]}`;
  }
  return t < tempBins[0] ? `<${tempBins[0]}` : `≥${tempBins.at(-1)}`;
}
export const moods: Mood[] = ['happy', 'calm', 'neutral', 'sad', 'stressed'];

export function tempMoodMatrix(entries: { weather: { tempC: number }, mood: Mood }[]) {
  const groups = new Map<string, { total: number, counts: Record<Mood, number> }>();
  for (const e of entries) {
    const k = binTemp(e.weather?.tempC ?? 0);
    if (!groups.has(k)) groups.set(k, { total: 0, counts: { happy: 0, calm: 0, neutral: 0, sad: 0, stressed: 0 } });
    const g = groups.get(k)!; 
    g.total++; 
    g.counts[e.mood]++; 
  }
  
  // 展开为 cell 数组：x=tempBin，y=mood，value=该温度区间里该情绪占比
  const cells: { x: string, y: Mood, value: number }[] = [];
  for (const [bin, g] of groups) {
    for (const m of moods) {
      cells.push({ x: bin, y: m, value: g.total ? g.counts[m] / g.total : 0 });
    }
  }
  
  // x 轴顺序排序
  const ordered = cells.sort((a, b) => {
    const ax = parseFloat(a.x); 
    const bx = parseFloat(b.x);
    if (isNaN(ax) || isNaN(bx)) return a.x.localeCompare(b.x);
    return ax - bx;
  });
  
  return ordered;
}