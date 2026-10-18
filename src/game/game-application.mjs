import {
  applySessionChoice,
  createGameSession,
  migrateGameSession,
  runLifeSession,
  validateGameSession,
} from "./game-engine.mjs";
import { createGameGateway } from "./game-gateway.mjs";

export {
  applySessionChoice,
  createGameSession,
  migrateGameSession,
  runLifeSession,
  validateGameSession,
};

/**
 * 缓存网关实例表（按数据引用复用网关）
 */
const gatewayRegistry = new WeakMap();

/**
 * 获取或创建游戏网关实例
 * @param {Record<string, any>} data
 * @returns {import("./game-gateway.mjs").ReplayGameGateway}
 */
export function getGameGateway(data) {
  let gateway = gatewayRegistry.get(data);
  if (!gateway) {
    gateway = createGameGateway(data);
    gatewayRegistry.set(data, gateway);
  }
  return gateway;
}

/**
 * 恢复并校验会话存档
 * @param {any} rawSession
 * @returns {any}
 */
export function restoreLifeSession(rawSession) {
  const dummyGateway = createGameGateway({});
  return dummyGateway.restoreSession(rawSession);
}

/**
 * 启动一段新的人生
 * @param {Record<string, any>} data
 * @param {Record<string, any>} [config]
 */
export function startLife(data, config) {
  const gateway = getGameGateway(data);
  const { session, result } = gateway.startLife(config);
  return { session, result };
}

/**
 * 从存档继续当前人生
 * @param {Record<string, any>} data
 * @param {any} session
 */
export function resumeLife(data, session) {
  const gateway = getGameGateway(data);
  const { result } = gateway.resumeLife(session);
  return { session, result };
}

/**
 * 提交选择并推进人生
 * @param {Record<string, any>} data
 * @param {any} session
 * @param {any} result
 * @param {string | string[] | { type: "quarter.plan", eventId: string, allocations: Array<{ actionId: string, intensity: string }> }} choice
 */
export function submitLifeChoice(data, session, result, choice) {
  const gateway = getGameGateway(data);
  const res = gateway.submitChoice(session, result?.pendingDecision, choice);
  return {
    session: res.session,
    result: res.result,
  };
}
