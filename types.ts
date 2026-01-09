export interface DrawRecord {
  round: number;
  timestamp: number;
  names: string[];
}

export interface AppState {
  allNames: string[];       // All names imported
  availableNames: string[]; // Names valid for drawing
  drawnRecords: DrawRecord[]; // History of draws
  currentDraw: string[];    // Names currently on screen (or animating)
}

export const DEFAULT_NAMES = [
  "张伟", "李强", "王芳", "赵敏", "刘军", 
  "陈杰", "杨洋", "黄艳", "周涛", "吴刚", 
  "徐磊", "孙静", "马云", "马化腾", "李彦宏", 
  "雷军", "刘强东", "丁磊", "张一鸣", "王兴",
  "教师A", "教师B", "教师C", "教师D", "教师E",
  "教师F", "教师G", "教师H", "教师I", "教师J"
];