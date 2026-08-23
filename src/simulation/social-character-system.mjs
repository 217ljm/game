import { clamp, randomInt } from "./random.mjs";

function choose(random, values) {
  return values[Math.min(values.length - 1, Math.floor(random() * values.length))];
}

function makeName(catalog, sex, random) {
  return `${choose(random, catalog.surnamePool)}${choose(random, catalog.givenNamePoolBySex[sex])}`;
}

function makePerson(state, record, roleId, catalog, random) {
  const role = catalog.roles[roleId];
  const sex = random() < 0.5 ? "female" : "male";
  const birthYear = state.birthYear + randomInt(
    random,
    role.birthYearOffsetMin ?? -1,
    role.birthYearOffsetMax ?? 1,
  );
  const temperament = choose(
    random,
    role.temperamentPool ?? catalog.temperamentPool ?? ["性格还不熟悉"],
  );
  return {
    id: `fictional-${roleId}-${state.personId}-${record.calendarYear}`,
    displayName: makeName(catalog, sex, random),
    fictional: true,
    sex,
    birthYear,
    roleId,
    roleLabel: role.label,
    metYear: record.calendarYear,
    metAge: record.age,
    lastContactYear: record.calendarYear,
    sharedYears: 1,
    closeness: role.initialCloseness,
    familiarity: role.initialFamiliarity ?? Math.max(20, role.initialCloseness - 8),
    trust: role.initialTrust ?? Math.max(20, role.initialCloseness - 12),
    conflict: 0,
    temperament,
    sharedMemories: [],
    active: true,
  };
}

export function ensureSocialCharacter({
  state,
  record,
  catalog,
  roleId,
  random,
  addFact,
}) {
  if (!catalog || !roleId || !catalog.roles[roleId]) return null;
  state.socialNetwork ??= [];
  let person = state.socialNetwork.find((entry) => entry.roleId === roleId && entry.active) ?? null;
  if (person || state.socialNetwork.length >= catalog.rules.maximumRecurringPeople) return person;
  person = makePerson(state, record, roleId, catalog, random);
  state.socialNetwork.push(person);
  addFact(record, "recurring_person_met", {
    personId: person.id,
    displayName: person.displayName,
    fictional: true,
    roleId: person.roleId,
    roleLabel: person.roleLabel,
    birthYear: person.birthYear,
    temperament: person.temperament,
    note: "该人物为游戏生成的虚构角色。",
  });
  return person;
}

export function recordSharedActivity({
  person,
  record,
  activityId,
  activityLabel,
  quarter,
  response,
  closenessChange = 1,
  trustChange = 1,
  conflictChange = 0,
  addFact,
}) {
  if (!person) return null;
  person.closeness = clamp((person.closeness ?? 40) + closenessChange, 0, 100);
  person.familiarity = clamp((person.familiarity ?? 35) + 2, 0, 100);
  person.trust = clamp((person.trust ?? 30) + trustChange, 0, 100);
  person.conflict = clamp((person.conflict ?? 0) + conflictChange, 0, 100);
  person.lastContactYear = record.calendarYear;
  person.sharedMemories ??= [];
  const memory = {
    calendarYear: record.calendarYear,
    age: record.age,
    quarter,
    activityId,
    title: activityLabel,
    response,
  };
  person.sharedMemories.push(memory);
  person.sharedMemories = person.sharedMemories.slice(-10);
  addFact(record, "child_person_shared_activity", {
    personId: person.id,
    displayName: person.displayName,
    roleId: person.roleId,
    roleLabel: person.roleLabel,
    activityId,
    activityLabel,
    quarter,
    response,
    closenessAfter: person.closeness,
    trustAfter: person.trust,
    conflictAfter: person.conflict,
  });
  return memory;
}

function mostRelevantPerson(network, roleId) {
  return [...network]
    .filter((person) => person.active)
    .sort((left, right) => (
      Number(right.roleId === roleId) - Number(left.roleId === roleId)
      || right.closeness - left.closeness
      || right.lastContactYear - left.lastContactYear
    ))[0] ?? null;
}

export function updateSocialCharacters({
  state,
  record,
  catalog,
  roleId,
  operationId,
  createByDefault = false,
  random,
  addFact,
}) {
  if (!catalog || !roleId || !catalog.roles[roleId]) return null;
  state.socialNetwork ??= [];
  const focused = catalog.focusedContactOperationIds.includes(operationId);

  for (const person of state.socialNetwork) {
    if (!person.active || person.lastContactYear === record.calendarYear) continue;
    person.closeness = clamp(
      person.closeness - catalog.rules.passiveAnnualDecay,
      catalog.rules.minimumCloseness,
      catalog.rules.maximumCloseness,
    );
  }

  let person = state.socialNetwork.find((entry) => entry.roleId === roleId && entry.active) ?? null;
  if (
    !person
    && (focused || createByDefault)
    && state.socialNetwork.length < catalog.rules.maximumRecurringPeople
  ) {
    person = ensureSocialCharacter({ state, record, catalog, roleId, random, addFact });
  }

  if (focused) {
    person = mostRelevantPerson(state.socialNetwork, roleId) ?? person;
    if (person) {
      person.closeness = clamp(
        person.closeness + catalog.rules.focusedContactIncrease,
        catalog.rules.minimumCloseness,
        catalog.rules.maximumCloseness,
      );
      person.lastContactYear = record.calendarYear;
      person.sharedYears += person.metYear === record.calendarYear ? 0 : 1;
      addFact(record, "recurring_person_contact", {
        personId: person.id,
        displayName: person.displayName,
        fictional: true,
        roleId: person.roleId,
        roleLabel: person.roleLabel,
        sharedYears: person.sharedYears,
        contactReasonOperationId: operationId,
      });
    }
  }
  return person;
}
