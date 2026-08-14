import { seededRandom } from "@/lib/utils";
import type { Zodiac } from "@/data/zodiacs";

type Theme = {
  key: string;
  core: string; // 一句话共鸣
  expand: string; // 展开说明
  actions: { yes: string; no: string };
  question: string;
};

export const THEMES: Theme[] = [
  {
    key: "边界",
    core: "今天，慢一点也没关系。",
    expand:
      "有些事情并不是没有答案，只是现在还没有到必须做决定的时候。今天更适合整理自己的情绪，而不是急着回应别人。",
    actions: {
      yes: "整理思绪，把悬而未决的事列出来",
      no: "为了获得别人的认可而勉强自己",
    },
    question: "今天有没有一件事，其实你可以晚一点回答？",
  },
  {
    key: "沉淀",
    core: "今天，把脚步放轻，让思绪沉淀下来。",
    expand:
      "你最近吸收了很多信息，也接住了很多情绪。今天不适合向外索取答案，适合向内，听一听自己真正的声音。",
    actions: {
      yes: "留一段不被打扰的时间给自己",
      no: "用忙碌逃避需要面对的念头",
    },
    question: "如果把今天的烦躁翻译成一句话，它会是什么？",
  },
  {
    key: "重新开始",
    core: "今天，允许自己重新开始。",
    expand:
      "过去的选择不必定义你。此刻的你，随时可以调整方向。重新开始不是否定过去，而是把经验装进新的行囊。",
    actions: {
      yes: "给一个旧目标写下新的第一步",
      no: "反复责备过去的自己",
    },
    question: "如果重新开始，你最想先放下的是什么？",
  },
  {
    key: "表达",
    core: "今天，把心里的话，轻轻说出口。",
    expand:
      "你习惯了把情绪藏起来自己消化。但真正在意你的人，愿意听你说。表达不是示弱，而是让关系有机会更靠近。",
    actions: {
      yes: "对一个人说出你的真实感受",
      no: "用沉默测试对方的在乎",
    },
    question: "最近有没有一句没说出口的话，值得被听见？",
  },
  {
    key: "靠近",
    core: "今天，值得为喜欢的人多走一步。",
    expand:
      "关系不会凭空变得亲密，它靠一次次微小的靠近积累。主动不是掉价，是你对自己的心意诚实。",
    actions: {
      yes: "主动联系一个你在意的人",
      no: "在等待里猜测对方的心意",
    },
    question: "你希望靠近谁，又因为什么在犹豫？",
  },
  {
    key: "休息",
    core: "今天，允许自己好好休息。",
    expand:
      "你不是一台永远运转的机器。疲惫是身体在提醒你：该充电了。休息不是浪费时间，是让你走得更远的方式。",
    actions: {
      yes: "放下手机，好好睡一个完整的觉",
      no: "因为没「产出」而苛责自己",
    },
    question: "你最近一次真正放松，是什么时候？",
  },
  {
    key: "专注",
    core: "今天，把心放在眼前这一件事上。",
    expand:
      "你想做的事很多，能同时做好的却只有一件。专注不是错过，而是认真对待此刻值得的每一分钟。",
    actions: {
      yes: "一次只做一件事，做完再开始下一件",
      no: "同时打开十个窗口却一件也没完成",
    },
    question: "如果今天只做一件事，你会选哪件？",
  },
  {
    key: "温柔",
    core: "今天，对自己温柔一点。",
    expand:
      "你习惯了对别人温柔，却常常忘了对自己。允许自己犯错，允许自己不完美，允许自己需要被照顾。",
    actions: {
      yes: "做一件让你感到被善待的小事",
      no: "用最挑剔的话批评自己",
    },
    question: "如果安慰一个朋友，你会怎么对他说？试着对自己说一遍。",
  },
  {
    key: "勇气",
    core: "今天，你有力量跨出那一步。",
    expand:
      "勇气不是不害怕，而是害怕了仍然愿意往前走。你比自己以为的更强大，那件让你犹豫的事，值得你去试一次。",
    actions: {
      yes: "直面一件让你有点害怕的事",
      no: "因为想象中的失败而提前放弃",
    },
    question: "你在害怕的，是事情本身，还是失败后的评价？",
  },
  {
    key: "整理",
    core: "今天，适合把混乱整理成秩序。",
    expand:
      "无论是房间、计划还是情绪，整理都能带来掌控感。你不需要一次解决所有，只要从一小块开始。",
    actions: {
      yes: "整理一处混乱，让空间和心都清爽",
      no: "让待办清单无限膨胀",
    },
    question: "目前最让你觉得乱的一处，是什么？",
  },
  {
    key: "等待",
    core: "今天，学会等待也是一种行动。",
    expand:
      "不是所有答案都会立刻到来。有些事需要时间发酵，有些决定需要过程成熟。等不是停滞，是给事物以空间。",
    actions: {
      yes: "把暂时无法决定的事安心放一放",
      no: "用反复纠结消耗自己",
    },
    question: "有没有一件事，你可以交给时间去回答？",
  },
  {
    key: "感恩",
    core: "今天，记得你已经拥有的。",
    expand:
      "在追逐未来的路上，别忽略眼前的拥有。一句问候、一顿好饭、一个还在身边的人，都值得被认真看见。",
    actions: {
      yes: "对一个人表达感谢",
      no: "只盯着还没得到的东西",
    },
    question: "此刻你最想感谢的人或事，是什么？",
  },
];

const DIMENSION_KEYS = [
  { key: "情绪", weight: 0 },
  { key: "爱情", weight: 1 },
  { key: "创造力", weight: 2 },
  { key: "人际", weight: 3 },
  { key: "事业", weight: 4 },
] as const;

export type DailyHoroscope = {
  date: string;
  theme: Theme;
  keywords: string[];
  dimensions: { key: string; score: number }[]; // 1-5
  signName: string;
  signSymbol: string;
};

function seededScore(seed: number, idx: number): number {
  const r = seededRandom(seed * 1.7 + idx * 3.1);
  return 2 + Math.floor(r * 4); // 2-5
}

/** 生成某星座在指定日期的今日星语（稳定可复现） */
export function getDailyHoroscope(
  sign: Zodiac,
  dateStr: string,
): DailyHoroscope {
  const dateSeed = dateStr
    .split("-")
    .map(Number)
    .reduce((a, b) => a * 13 + b, 0);
  const seed = dateSeed + sign.slug.length * 7919;

  const themeIdx = Math.floor(seededRandom(seed) * THEMES.length);
  const theme = THEMES[themeIdx];

  // 3 个关键词：主题 + 星座关键词中取 2 个
  const kwShift = Math.floor(seededRandom(seed + 5) * sign.keywords.length);
  const kws = [theme.key];
  for (let i = 0; i < 2; i++) {
    const kw = sign.keywords[(kwShift + i) % sign.keywords.length];
    if (!kws.includes(kw)) kws.push(kw);
  }

  const dimensions = DIMENSION_KEYS.map((d, i) => ({
    key: d.key,
    score: seededScore(seed + 11, i),
  }));

  return {
    date: dateStr,
    theme,
    keywords: kws,
    dimensions,
    signName: sign.name,
    signSymbol: sign.symbol,
  };
}
