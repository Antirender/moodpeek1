// src/utils/tags.ts
import { Mood } from "../types";
import { moodScoreMap } from "./series";

type EntryLite = { tags?: string[]; mood: Mood };

export function computeTagContrib(entries: EntryLite[], minCount=2, topK=5){
  const agg = new Map<string, {sum:number,count:number}>();
  for (const e of entries){
    const tags = (e.tags ?? []).filter(Boolean);
    for (const raw of tags){
      const t = raw.trim().toLowerCase();
      if (!t) continue;
      if (!agg.has(t)) agg.set(t, {sum:0, count:0});
      const a = agg.get(t)!;
      a.sum += moodScoreMap[e.mood]; a.count++;
    }
  }
  const rows = [...agg.entries()]
    .filter(([,v])=>v.count>=minCount)
    .map(([tag,v])=>({ tag, value: v.sum/v.count, count: v.count }))
    .sort((a,b)=> b.value - a.value);

  const positives = rows.filter(r=>r.value>=0).slice(0, topK);
  const negatives = rows.filter(r=>r.value<0).sort((a,b)=>a.value-b.value).slice(0, topK);
  return {positives, negatives, rowsAll:[...negatives, ...positives]};
}