// src/utils/series.ts
import { Mood } from "../types";

export const moodScoreMap: Record<Mood, number> = {
  happy: 2, calm: 1, neutral: 0, sad: -1, stressed: -2,
};

export type EntryLite = { date: string|Date; mood: Mood };

export function groupDailyAvg(entries: EntryLite[]) {
  const dayMap = new Map<string, number[]>();
  for (const e of entries) {
    const d = new Date(e.date);
    const k = d.toISOString().slice(0, 10);
    if (!dayMap.has(k)) dayMap.set(k, []);
    dayMap.get(k)!.push(moodScoreMap[e.mood]);
  }
  
  const rows = [...dayMap.entries()]
    .map(([day, arr]) => ({ day, value: arr.reduce((a, b) => a + b, 0) / arr.length }))
    .sort((a, b) => a.day.localeCompare(b.day));
    
  return rows;
}

export function rollingAvg(rows: { day: string, value: number }[], win = 7) {
  const out: { day: string, value: number }[] = [];
  for (let i = 0; i < rows.length; i++) {
    const s = Math.max(0, i - win + 1);
    const seg = rows.slice(s, i + 1).map(r => r.value);
    out.push({ day: rows[i].day, value: seg.reduce((a, b) => a + b, 0) / seg.length });
  }
  return out;
}