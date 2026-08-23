export const CHARACTER_ATLAS_COLUMNS = 4;
export const CHARACTER_ATLAS_ROWS = 2;
export const CHARACTER_ATLAS_URL = "/public/assets/life-stage/character-age-atlas-v1.webp";

export function characterAgeBand(age) {
  if (age <= 11) return { id: "child", label: "童年", column: 0 };
  if (age <= 24) return { id: "youth", label: "青年", column: 1 };
  if (age <= 59) return { id: "adult", label: "成年", column: 2 };
  return { id: "elder", label: "晚年", column: 3 };
}

export function characterEraBand(calendarYear) {
  if (calendarYear <= 1989) return { id: "reform_beginning", label: "改革开放初期" };
  if (calendarYear <= 2007) return { id: "opening_accelerates", label: "开放与流动加速" };
  if (calendarYear <= 2024) return { id: "connected_life", label: "互联生活扩展" };
  return { id: "future_scenario", label: "未来情景" };
}

export function characterAtlasCell(age, sex) {
  const ageBand = characterAgeBand(age);
  const normalizedSex = sex === "female" ? "female" : "male";
  const row = normalizedSex === "female" ? 1 : 0;
  return {
    row,
    column: ageBand.column,
    x: ageBand.column / CHARACTER_ATLAS_COLUMNS,
    y: row / CHARACTER_ATLAS_ROWS,
    width: 1 / CHARACTER_ATLAS_COLUMNS,
    height: 1 / CHARACTER_ATLAS_ROWS,
    backgroundPositionX: ageBand.column * 100 / (CHARACTER_ATLAS_COLUMNS - 1),
    backgroundPositionY: row * 100,
    ageBand,
    sex: normalizedSex,
    sexLabel: normalizedSex === "female" ? "女性" : "男性",
  };
}

export function buildCharacterVisualView(result, age, calendarYear) {
  const person = result.profile.person;
  const cell = characterAtlasCell(age, person.sex);
  return {
    atlasUrl: CHARACTER_ATLAS_URL,
    atlasColumns: CHARACTER_ATLAS_COLUMNS,
    atlasRows: CHARACTER_ATLAS_ROWS,
    cell,
    ageBand: cell.ageBand,
    eraBand: characterEraBand(calendarYear),
    sex: cell.sex,
    sexLabel: cell.sexLabel,
    residence: result.currentState?.residence ?? person.residence,
    ariaLabel: `${age}岁${cell.sexLabel}角色形象 · ${cell.ageBand.label} · ${characterEraBand(calendarYear).label}`,
  };
}
