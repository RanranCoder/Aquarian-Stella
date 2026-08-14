export type City = {
  name: string;
  lat: number;
  lon: number;
  tz: number; // UTC 偏移（小时）
};

/** 城市 → 经纬度 / 时区（主要中国城市 + 部分海外），用于上升星座计算 */
export const CITIES: City[] = [
  // 直辖市
  { name: "北京", lat: 39.9042, lon: 116.4074, tz: 8 },
  { name: "上海", lat: 31.2304, lon: 121.4737, tz: 8 },
  { name: "天津", lat: 39.1256, lon: 117.1902, tz: 8 },
  { name: "重庆", lat: 29.563, lon: 106.5516, tz: 8 },
  // 省会 / 计划单列市
  { name: "广州", lat: 23.1291, lon: 113.2644, tz: 8 },
  { name: "深圳", lat: 22.5431, lon: 114.0579, tz: 8 },
  { name: "成都", lat: 30.5728, lon: 104.0668, tz: 8 },
  { name: "杭州", lat: 30.2741, lon: 120.1551, tz: 8 },
  { name: "武汉", lat: 30.5928, lon: 114.3055, tz: 8 },
  { name: "西安", lat: 34.3416, lon: 108.9398, tz: 8 },
  { name: "南京", lat: 32.0603, lon: 118.7969, tz: 8 },
  { name: "郑州", lat: 34.7466, lon: 113.6254, tz: 8 },
  { name: "长沙", lat: 28.2282, lon: 112.9388, tz: 8 },
  { name: "沈阳", lat: 41.8057, lon: 123.4315, tz: 8 },
  { name: "大连", lat: 38.914, lon: 121.6147, tz: 8 },
  { name: "青岛", lat: 36.0671, lon: 120.3826, tz: 8 },
  { name: "济南", lat: 36.6512, lon: 117.1201, tz: 8 },
  { name: "哈尔滨", lat: 45.8038, lon: 126.535, tz: 8 },
  { name: "长春", lat: 43.8171, lon: 125.3235, tz: 8 },
  { name: "石家庄", lat: 38.0428, lon: 114.5149, tz: 8 },
  { name: "太原", lat: 37.8706, lon: 112.5489, tz: 8 },
  { name: "呼和浩特", lat: 40.8426, lon: 111.7492, tz: 8 },
  { name: "兰州", lat: 36.0611, lon: 103.8343, tz: 8 },
  { name: "西宁", lat: 36.6171, lon: 101.7782, tz: 8 },
  { name: "银川", lat: 38.4872, lon: 106.2309, tz: 8 },
  { name: "乌鲁木齐", lat: 43.8256, lon: 87.6168, tz: 8 },
  { name: "拉萨", lat: 29.652, lon: 91.1721, tz: 8 },
  { name: "昆明", lat: 25.0389, lon: 102.7183, tz: 8 },
  { name: "贵阳", lat: 26.647, lon: 106.6302, tz: 8 },
  { name: "南宁", lat: 22.817, lon: 108.3665, tz: 8 },
  { name: "海口", lat: 20.0442, lon: 110.1999, tz: 8 },
  { name: "福州", lat: 26.0745, lon: 119.2965, tz: 8 },
  { name: "厦门", lat: 24.4798, lon: 118.0894, tz: 8 },
  { name: "南昌", lat: 28.682, lon: 115.8579, tz: 8 },
  { name: "合肥", lat: 31.8206, lon: 117.2272, tz: 8 },
  { name: "香港", lat: 22.3193, lon: 114.1694, tz: 8 },
  { name: "澳门", lat: 22.1987, lon: 113.5439, tz: 8 },
  { name: "台北", lat: 25.033, lon: 121.5654, tz: 8 },
  // 其他主要城市
  { name: "三亚", lat: 18.2528, lon: 109.5119, tz: 8 },
  { name: "桂林", lat: 25.2736, lon: 110.2901, tz: 8 },
  { name: "珠海", lat: 22.271, lon: 113.5767, tz: 8 },
  { name: "东莞", lat: 23.0207, lon: 113.7518, tz: 8 },
  { name: "佛山", lat: 23.0215, lon: 113.1214, tz: 8 },
  { name: "宁波", lat: 29.8683, lon: 121.544, tz: 8 },
  { name: "无锡", lat: 31.4912, lon: 120.3119, tz: 8 },
  { name: "温州", lat: 28.0027, lon: 120.6988, tz: 8 },
  { name: "泉州", lat: 24.8741, lon: 118.6757, tz: 8 },
  { name: "汕头", lat: 23.3535, lon: 116.682, tz: 8 },
  // 海外
  { name: "东京", lat: 35.6762, lon: 139.6503, tz: 9 },
  { name: "首尔", lat: 37.5665, lon: 126.978, tz: 9 },
  { name: "新加坡", lat: 1.3521, lon: 103.8198, tz: 8 },
  { name: "曼谷", lat: 13.7563, lon: 100.5018, tz: 7 },
  { name: "纽约", lat: 40.7128, lon: -74.006, tz: -5 },
  { name: "洛杉矶", lat: 34.0522, lon: -118.2437, tz: -8 },
  { name: "旧金山", lat: 37.7749, lon: -122.4194, tz: -8 },
  { name: "伦敦", lat: 51.5074, lon: -0.1278, tz: 0 },
  { name: "巴黎", lat: 48.8566, lon: 2.3522, tz: 1 },
  { name: "悉尼", lat: -33.8688, lon: 151.2093, tz: 10 },
  { name: "墨尔本", lat: -37.8136, lon: 144.9631, tz: 10 },
  { name: "温哥华", lat: 49.2827, lon: -123.1207, tz: -8 },
  { name: "多伦多", lat: 43.6532, lon: -79.3832, tz: -5 },
  { name: "柏林", lat: 52.52, lon: 13.405, tz: 1 },
  { name: "迪拜", lat: 25.2048, lon: 55.2708, tz: 4 },
];

export function findCity(name?: string): City | undefined {
  if (!name) return undefined;
  const n = name.trim();
  if (!n) return undefined;
  return (
    CITIES.find((c) => c.name === n) ??
    CITIES.find((c) => n.includes(c.name) || c.name.includes(n))
  );
}
