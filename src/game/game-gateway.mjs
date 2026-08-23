import {
  applySessionChoice,
  createGameSession,
  migrateGameSession,
  runLifeSession,
  validateGameSession,
} from "./game-engine.mjs";

/**
 * 确定性重放游戏网关 (ReplayGameGateway)
 * 封装确定性状态机与应用层之间的交互，提供统一的命令提交、状态快照与等待决策获取。
 */
export class ReplayGameGateway {
  /**
   * @param {Record<string, any>} data 完整游戏数据包
   * @param {Record<string, any>} [options]
   */
  constructor(data, options = {}) {
    if (!data || typeof data !== "object") {
      throw new TypeError("GameGateway 初始化必须提供完整游戏数据对象。");
    }
    this.data = data;
    this.options = options;
  }

  /**
   * 恢复并校验原始存档（自动执行多版本平滑迁移）
   * @param {any} rawSession
   * @returns {any}
   */
  restoreSession(rawSession) {
    const session = migrateGameSession(rawSession);
    validateGameSession(session);
    return session;
  }

  /**
   * 开始新的人生
   * @param {Record<string, any>} [config] 出生配置（seed, birthYear, mortality 等）
   * @returns {{ session: any, result: any, gateway: ReplayGameGateway }}
   */
  startLife(config = {}) {
    const session = createGameSession(config);
    const result = runLifeSession(this.data, session, { autoChoose: false, ...this.options });
    return {
      session,
      result,
      gateway: this,
    };
  }

  /**
   * 恢复并继续进行已有的人生
   * @param {any} session
   * @returns {{ session: any, result: any, gateway: ReplayGameGateway }}
   */
  resumeLife(session) {
    validateGameSession(session);
    const result = runLifeSession(this.data, session, { autoChoose: false, ...this.options });
    return {
      session,
      result,
      gateway: this,
    };
  }

  /**
   * 提交玩家对当前待决事件的选择并推进至下一个等待节点
   * @param {any} session 当前存档会话
   * @param {any} pendingDecision 当前等待处理的决策事件
   * @param {string | string[]} choice 选中的选项 ID 或活动 ID 列表
   * @returns {{ session: any, result: any, gateway: ReplayGameGateway }}
   */
  submitChoice(session, pendingDecision, choice) {
    if (!pendingDecision) {
      throw new Error("当前没有处于等待状态的决策，无法提交选择。");
    }
    const nextSession = applySessionChoice(session, pendingDecision, choice);
    const result = runLifeSession(this.data, nextSession, { autoChoose: false, ...this.options });
    return {
      session: nextSession,
      result,
      gateway: this,
    };
  }
}

/**
 * 创建标准游戏网关实例
 * @param {Record<string, any>} data
 * @param {Record<string, any>} [options]
 * @returns {ReplayGameGateway}
 */
export function createGameGateway(data, options = {}) {
  return new ReplayGameGateway(data, options);
}
