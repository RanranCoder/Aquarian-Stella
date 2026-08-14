import { seededRandom } from "@/lib/utils";
import type { Zodiac } from "@/data/zodiacs";

const ATTRACTION = [
  "你们会被彼此身上与自己不同的那部分吸引——一个负责往前，一个负责停靠。",
  "你们的对话里常常有电流。表达方式的差异，反而让靠近变得有新鲜感。",
  "一个更理性、一个更感性，恰好补上对方容易忽略的那一面。",
  "你们在一起时，会不自觉地变得更像自己，而不是更讨好对方。",
  "共同的好奇心是你们最强的纽带，探索世界的脚步很容易同步。",
];

const MISUNDERSTANDING = [
  "一个习惯直接说出想法，另一个更愿意先感受气氛，容易在「没说明白」上产生误会。",
  "你们对「陪伴」的定义不太一样，一个想要时刻在场，一个想要各自空间。",
  "遇到冲突时，一个想立刻解决，另一个需要先冷静，节奏不同会让彼此觉得没被理解。",
  "你们都容易高估对方「应该知道我的想法」，而低估了把话说清楚的必要性。",
  "当压力来临时，一个向外求助，一个向内消化，可能被误解为「不在乎」。",
];

const GROWTH = [
  "这段关系会教你们：差异不是隔阂，而是看见另一种活法的窗口。",
  "它会练习你们在冲动与谨慎之间，找到属于彼此的节奏。",
  "你们会一起学会：真正的关系，是在分歧里仍然选择靠近。",
  "它会提醒你们，先照顾好自己，才能更好地拥抱对方。",
];

const ADVICE = [
  "把「我以为你知道」换成「我需要你听到」，很多误会会提前消失。",
  "在讨论重要事情前，先确认彼此的心情是放松的，再开口。",
  "定期给彼此一段「只属于我们」的时间，关系需要留白。",
  "学会在对方的节奏里等待，也在自己的边界里坦诚。",
];

export type RelationResult = {
  score: number;
  keywords: string[];
  attraction: string[];
  misunderstanding: string[];
  growth: string;
  advice: string;
};

function pick<T>(pool: T[], r: (n: number) => number, count: number): T[] {
  const copy = [...pool];
  const out: T[] = [];
  for (let i = 0; i < count && copy.length > 0; i++) {
    const idx = Math.floor(r(i + 99) * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

export function getRelation(a: Zodiac, b: Zodiac): RelationResult {
  const seed = a.slug.length * 31 + b.slug.length * 17 + (a.en + b.en).length * 7;
  const r = (n: number) => seededRandom(seed + n * 13.3);

  const score = 58 + Math.floor(r(1) * 40); // 58-97，文案仍以文字为主

  const elementMatch =
    a.element === b.element
      ? "同象相惜"
      : (a.element === "fire" && b.element === "water") ||
          (a.element === "water" && b.element === "fire")
        ? "刚柔互补"
        : "阴阳互补";

  const keywords = [elementMatch, "吸引", "成长"];

  return {
    score,
    keywords,
    attraction: pick(ATTRACTION, r, 3),
    misunderstanding: pick(MISUNDERSTANDING, r, 3),
    growth: pick(GROWTH, r, 1)[0],
    advice: pick(ADVICE, r, 1)[0],
  };
}
