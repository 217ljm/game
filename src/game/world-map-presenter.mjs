const RESIDENCE_LABELS = Object.freeze({
  urban: "城镇生活圈",
  rural: "乡村生活圈",
});

function available(status, unlockHint = null) {
  return { status: status ? "open" : "locked", unlockHint: status ? null : unlockHint };
}

function peopleFor(game, pattern) {
  return game.people
    .filter((person) => pattern.test(`${person.role} ${person.detail}`))
    .slice(0, 3)
    .map((person) => person.name);
}

function currentSchoolLabel(state, age) {
  if (age < 6) return "尚未进入学校生活";
  const education = state.education ?? {};
  if (education.higher?.status === "enrolled") return "当前就读院校";
  if (education.senior?.status === "enrolled") return "当前高中或中职";
  if (education.junior?.status === "enrolled") return "当前初中";
  if (education.primary?.status === "enrolled") return "当前小学";
  return age <= 18 ? "附近学校" : "继续教育场所";
}

function currentWorkLabel(state) {
  const job = state.employment?.currentJob;
  return job ? (job.label ?? job.occupation ?? "当前工作地点") : "就业与生产场所";
}

export function buildWorldMapView(result, game) {
  const state = result.currentState ?? {};
  const age = game.age;
  const residence = state.residence ?? result.profile?.person?.residence ?? "urban";
  const schoolAccess = available(age >= 6, "6岁后随入学与继续教育经历开放");
  const workAccess = available(age >= 16, "16岁后随实际就业、学徒或劳动经历开放");
  const cultureAccess = available(age >= 3, "3岁后随家人陪同与自主活动范围开放");
  const nearbyPeople = peopleFor(game, /邻|同学|朋友|同事/);
  const familyPeople = game.people.slice(0, 3).map((person) => person.name);
  const locations = [
    {
      id: "home",
      label: "住处",
      icon: "ph-house-line",
      status: "current",
      statusLabel: "当前落脚点",
      travel: "不消耗出行时间",
      detail: "休息、家务、照护和许多家庭关系都从这里发生。",
      people: familyPeople,
      opportunities: age <= 5 ? ["探索身边", "回应家人", "休息恢复"] : ["休息恢复", "家务与照护", "陪伴家人"],
    },
    {
      id: "neighborhood",
      label: residence === "rural" ? "村庄与田野" : "街道与邻里",
      icon: "ph-buildings",
      status: age >= 3 ? "open" : "limited",
      statusLabel: age >= 3 ? "可以前往" : "需要照看者陪同",
      travel: "往返约占少量日常时间",
      detail: "熟人、同伴、商店和时代生活在这里彼此交叉。",
      people: nearbyPeople,
      opportunities: age <= 11 ? ["和同伴玩", "观察周围", "认识邻里"] : ["见朋友", "购买日用品", "接触社区机会"],
    },
    {
      id: "school",
      label: currentSchoolLabel(state, age),
      icon: "ph-student",
      status: schoolAccess.status,
      statusLabel: schoolAccess.status === "open" ? "教育场景已开放" : "尚未开放",
      unlockHint: schoolAccess.unlockHint,
      travel: age >= 6 ? "通学时间由居住地与学校决定" : "当前没有通学安排",
      detail: "课程只是其中一部分，同学、教师、考试和兴趣也会留下长期影响。",
      people: peopleFor(game, /同学|老师|学校/),
      opportunities: ["上课与练习", "结识同伴", "发展兴趣"],
    },
    {
      id: "work",
      label: currentWorkLabel(state),
      icon: "ph-briefcase",
      status: workAccess.status,
      statusLabel: workAccess.status === "open" ? "劳动与职业场景已开放" : "尚未开放",
      unlockHint: workAccess.unlockHint,
      travel: state.employment?.currentJob ? "通勤占用已进入季度固定责任" : "尚无固定通勤",
      detail: "岗位、收入、技能、同事和行业变化会共同塑造职业生活。",
      people: peopleFor(game, /同事|工作|伴侣/),
      opportunities: ["完成工作", "提升技能", "经营同事关系"],
    },
    {
      id: "culture",
      label: residence === "rural" ? "集市与文化点" : "商店与文化场所",
      icon: "ph-storefront",
      status: cultureAccess.status,
      statusLabel: cultureAccess.status === "open" ? "可以前往" : "尚未开放",
      unlockHint: cultureAccess.unlockHint,
      travel: "出行成本随年代、地区与交通条件变化",
      detail: "娱乐、消费、见闻和偶然机会常在家庭与单位之外出现。",
      people: nearbyPeople,
      opportunities: ["文化娱乐", "购买与交易", "接触新鲜事物"],
    },
    {
      id: "services",
      label: "医院与公共服务",
      icon: "ph-first-aid-kit",
      status: "open",
      statusLabel: "按需要前往",
      travel: "是否方便取决于地区与当年公共服务条件",
      detail: "就医、办事和公共服务会在真实需要或关键事件中变得重要。",
      people: [],
      opportunities: ["看病与恢复", "处理公共事务", "获取现实信息"],
    },
  ];
  return {
    title: `${RESIDENCE_LABELS[residence] ?? "当前生活圈"} · ${game.year}年`,
    subtitle: `${age}岁可接触${locations.filter((entry) => entry.status !== "locked").length}处场景；地点会改变人物、机会、花费和可执行行动。`,
    residence,
    locations,
  };
}
