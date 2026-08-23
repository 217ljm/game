export const ROUTES = Object.freeze({
  TITLE: "title",
  NEW_LIFE: "new-life",
  SCENE: "scene",
  MAP: "map",
  CHARACTER: "character",
  RELATIONS: "relations",
  RECORDS: "records",
  RANDOM_EVENT: "random-event",
  QUARTER_RESULT: "quarter-result",
  YEAR_REVIEW: "year-review",
  PERSON: "person",
  ENDING: "ending",
  ERROR: "error",
});

export const MAIN_ROUTES = Object.freeze([
  ROUTES.SCENE,
  ROUTES.MAP,
  ROUTES.CHARACTER,
  ROUTES.RELATIONS,
  ROUTES.RECORDS,
]);

export const FLOW_ROUTES = Object.freeze([
  ROUTES.RANDOM_EVENT,
  ROUTES.QUARTER_RESULT,
  ROUTES.YEAR_REVIEW,
  ROUTES.PERSON,
  ROUTES.ENDING,
]);

const VALID_ROUTES = new Set(Object.values(ROUTES));
const LEGACY_ROUTES = Object.freeze({
  life: ROUTES.SCENE,
  growth: ROUTES.CHARACTER,
  timeline: ROUTES.RECORDS,
  archive: ROUTES.RECORDS,
});

export function parseRouteHash(hash = "") {
  const source = hash.replace(/^#\/?/, "");
  const [path = "", query = ""] = source.split("?");
  const route = LEGACY_ROUTES[path] ?? (VALID_ROUTES.has(path) ? path : ROUTES.TITLE);
  return {
    route,
    params: Object.fromEntries(new URLSearchParams(query)),
  };
}

export function formatRouteHash(route, params = {}) {
  const safeRoute = VALID_ROUTES.has(route) ? route : ROUTES.TITLE;
  const query = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value != null && value !== ""),
  ).toString();
  return `#/${safeRoute}${query ? `?${query}` : ""}`;
}

export function isMainRoute(route) {
  return MAIN_ROUTES.includes(route);
}

export function routeForPending(pending) {
  if (!pending) return ROUTES.SCENE;
  if (["random_life_event", "mainline_event"].includes(pending.kind)) return ROUTES.RANDOM_EVENT;
  if (pending.kind === "year_review") return ROUTES.YEAR_REVIEW;
  return ROUTES.SCENE;
}

export function routeTitle(route) {
  return {
    [ROUTES.TITLE]: "1978—一生",
    [ROUTES.NEW_LIFE]: "人生起点",
    [ROUTES.SCENE]: "生活场景",
    [ROUTES.MAP]: "生活地图",
    [ROUTES.CHARACTER]: "我的人物",
    [ROUTES.RELATIONS]: "人物关系",
    [ROUTES.RECORDS]: "人生记录",
    [ROUTES.RANDOM_EVENT]: "人生事件",
    [ROUTES.QUARTER_RESULT]: "季度收获",
    [ROUTES.YEAR_REVIEW]: "年度回望",
    [ROUTES.PERSON]: "共同记忆",
    [ROUTES.ENDING]: "一生落幕",
    [ROUTES.ERROR]: "出现错误",
  }[route] ?? "人生轨迹";
}
