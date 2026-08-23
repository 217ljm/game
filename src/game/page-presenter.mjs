import { buildTimeline, presentGame } from "./presenter.mjs";
import { routeForPending } from "../app/routes.mjs";
import { lifeMainlineTimelineEntries } from "../simulation/life-mainline-system.mjs";
import { buildWorldMapView } from "./world-map-presenter.mjs";

function groupTimeline(entries) {
  const groups = [];
  for (const entry of entries) {
    let group = groups.at(-1);
    if (!group || group.year !== entry.year) {
      group = {
        year: entry.year,
        age: entry.age,
        stageLabel: entry.stageLabel,
        annualEntries: [],
        quarterEntries: [],
      };
      groups.push(group);
    }
    (entry.quarter ? group.quarterEntries : group.annualEntries).push(entry);
  }
  return groups.reverse();
}

export function buildPageViewModels(result, data, session = null) {
  const game = presentGame(result, data);
  const completedQuarter = [...game.quarterProgress.quarters]
    .reverse()
    .find((quarter) => quarter.status === "completed") ?? null;
  return {
    game,
    nextRoute: result.status === "completed" ? "ending" : routeForPending(game.pending),
    life: {
      year: game.year,
      age: game.age,
      stageLabel: game.stageLabel,
      dataStatus: game.dataStatus,
      dataStatusLabel: game.dataStatusLabel,
      situation: game.situation,
      quarterProgress: game.quarterProgress,
      pending: game.pending,
      mainline: game.mainline,
    },
    map: buildWorldMapView(result, game),
    growth: {
      stats: game.stats,
      characterStates: game.characterStates,
      interests: game.interests,
      childhoodGrowth: game.childhoodGrowth,
      childhoodMemories: game.childhoodMemories,
      yearLedger: game.yearLedger,
      facts: game.facts,
      latestGrowth: game.latestQuarterOutcome,
      mainline: game.mainline,
    },
    relations: {
      people: game.people,
    },
    timeline: {
      groups: groupTimeline([
        ...buildTimeline(result),
        ...lifeMainlineTimelineEntries(game.mainline),
      ].sort((left, right) => left.year - right.year || (left.quarter ?? 5) - (right.quarter ?? 5))),
    },
    quarterResult: {
      year: game.childhoodExperience?.calendarYear ?? game.year,
      age: game.childhoodExperience?.age ?? game.age,
      quarter: game.childhoodExperience?.quarter ?? completedQuarter?.quarter ?? null,
      label: game.childhoodExperience?.label ?? completedQuarter?.label ?? "本季度",
      plan: completedQuarter?.plan ?? "生活按既定节奏推进",
      detail: completedQuarter?.detail ?? "本季度经历已写入人生档案",
      experience: game.childhoodExperience,
      latestDecision: game.latestDecision,
      outcome: game.latestQuarterOutcome,
      outcomes: game.quarterOutcomes,
    },
    yearReview: {
      year: game.year,
      age: game.age,
      facts: game.facts,
      ledger: game.yearLedger,
      pending: game.pending?.kind === "year_review" ? game.pending : null,
      latestDecision: game.latestDecision,
      mainline: game.mainline,
    },
    archive: {
      birthYear: result.profile.person.birthYear,
      seed: session?.seed ?? "未载入",
      introduction: game.introduction,
      year: game.year,
      age: game.age,
      stageLabel: game.stageLabel,
    },
  };
}
