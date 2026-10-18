const DATA_FILES = {
  quarterlyAge6: "data/gameplay/quarterly_age6_1984.json",
  annualOperations: "data/annual_life_operations.json",
  quarterlyLife: "data/quarterly_life_content.json",
  childhoodPlay: "data/childhood_play_content.json",
  youthMainlinePayoffs: "data/youth_mainline_payoffs.json",
  timeline: "data/calibration/timeline_1978_2026.json",
  socialCharacters: "data/social_character_catalog.json",
  birth: "data/calibration/birth_1978_1982.json",
  childhood: "data/calibration/childhood_1978_1988.json",
  childhoodEvents: "data/childhood_events.json",
  primary: "data/calibration/primary_education_1984_1996.json",
  primaryEvents: "data/primary_education_events.json",
  adolescence: "data/calibration/adolescence_education_1986_2000.json",
  adolescenceEvents: "data/adolescence_events.json",
  youth: "data/calibration/youth_entry_1992_2006.json",
  youthEvents: "data/youth_entry_events.json",
  entryJobs: "data/entry_job_catalog.json",
  adult: "data/calibration/adult_life_1992_2025.json",
  adultEvents: "data/adult_life_events.json",
  adultJobs: "data/adult_job_catalog.json",
};

export async function loadGameData(baseUrl = "./") {
  const entries = await Promise.all(
    Object.entries(DATA_FILES).map(async ([key, relativePath]) => {
      const response = await fetch(new URL(relativePath, baseUrl));
      if (!response.ok) throw new Error(`读取 ${relativePath} 失败：HTTP ${response.status}`);
      return [key, await response.json()];
    }),
  );
  return Object.fromEntries(entries);
}

export { DATA_FILES };
