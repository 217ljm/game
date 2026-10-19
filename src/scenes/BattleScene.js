/**
 * @file BattleScene.js
 * @description 核心战斗场景：
 * 包含 1920x1080 竞技场、WASD空间走位、鼠标瞄准、多波次敌人推进、
 * Telegraph 攻击前摇红圈预警避险、受击闪白/顿帧/震屏/暴击跳字全链路打击感、
 * 掉落物磁吸拾取、波次 3 选 1 肉鸽技能进化与 Boss 多阶段战
 */

import Phaser from 'phaser';
import { CANVAS_WIDTH, CANVAS_HEIGHT, LAYER_DEPTH, GAME_EVENTS } from '../config/GameConfig.js';
import { SKILL_CONFIG } from '../config/SkillData.js';
import { ENEMY_TYPES, WAVE_CONFIGS } from '../config/EnemyData.js';
import { Player } from '../entities/Player.js';
import { Enemy } from '../entities/Enemy.js';
import { Projectile } from '../entities/Projectile.js';
import { CombatSystem } from '../systems/CombatSystem.js';
import { VFXManager } from '../systems/VFXManager.js';

export class BattleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BattleScene' });
  }

  create() {
    // 1. 设置世界物理边界与全屏竞技场背景
    this.physics.world.setBounds(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    const bg = this.add.image(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 'bg_dungeon_arena');
    bg.setDisplaySize(CANVAS_WIDTH, CANVAS_HEIGHT);
    bg.setDepth(LAYER_DEPTH.BACKGROUND);

    // 2. 初始化打击感与特效系统
    this.vfxManager = new VFXManager(this);

    // 3. 统计数据追踪
    this.battleStats = {
      kills: 0,
      totalDamage: 0,
      gold: 0,
      wave: 1,
    };

    // 4. 初始化物理管理组
    this.enemies = this.physics.add.group({ runChildUpdate: true });
    this.projectiles = this.physics.add.group({ runChildUpdate: true });
    this.drops = this.physics.add.group();

    // 5. 创建玩家主角
    this.createPlayer();

    // 6. 注册输入监听 (鼠标与键盘技能)
    this.bindInputs();

    // 7. 启动波次管理器 (Wave System)
    this.currentWaveIndex = 0;
    this.isWaveTransitioning = false;
    this.bossEntity = null;

    this.time.delayedCall(800, () => {
      this.startNextWave();
    });

    // 8. 物理碰撞与重叠检测配置
    this.setupCollisions();

    // 9. 相机入场淡入
    this.cameras.main.fadeIn(400, 0, 0, 0);
  }

  /**
   * 创建玩家实体
   */
  createPlayer() {
    this.player = new Player(this, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(LAYER_DEPTH.CHARACTERS);

    // 监听玩家事件
    this.player.on('player:damage_taken', (data) => {
      this.events.emit('player:health_change', {
        hp: this.player.hp,
        maxHp: this.player.maxHp,
        shield: this.player.shield,
      });
      this.vfxManager.spawnFloatingText(this.player.x, this.player.y, data.damage, false, 'damage');
      this.cameras.main.shake(60, 0.006);

      if (this.player.hp <= 0) {
        this.handlePlayerDeath();
      }
    });

    this.player.on('player:exp_gained', (data) => {
      this.events.emit('player:exp_change', {
        exp: this.player.exp,
        nextLevelExp: this.player.nextLevelExp,
        level: this.player.level,
      });
    });
  }

  /**
   * 绑定按键与鼠标攻击事件
   */
  bindInputs() {
    // 鼠标左键普攻：疾风斩击
    this.input.on('pointerdown', (pointer) => {
      if (pointer.leftButtonDown()) {
        this.castSkill('slash', pointer.worldX, pointer.worldY);
      }
    });

    // 键盘快捷键监听
    this.keyQ = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
    this.keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.keyR = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // 全屏快捷键 F
    this.input.keyboard.on('keydown-F', () => {
      if (this.scale.isFullscreen) {
        this.scale.stopFullscreen();
      } else {
        this.scale.startFullscreen();
      }
    });
  }

  /**
   * 统一技能施放入口
   */
  castSkill(skillId, targetX, targetY) {
    if (!this.player || this.player.hp <= 0) return;

    const skill = SKILL_CONFIG[skillId];
    if (!skill) return;

    // 检查冷却
    if (this.player.isSkillOnCooldown(skillId)) return;

    // 触发玩家实体技能执行
    const castSuccess = this.player.castSkill(skillId, targetX, targetY);
    if (!castSuccess) return;

    // 通知 HUD 启动 CD 遮罩
    this.events.emit('player:skill_cooldown', {
      skillId,
      cooldown: skill.cooldown,
    });

    // 针对具体技能生成投射物或 AOE 判定
    const pointer = this.input.activePointer;
    const destX = targetX !== undefined ? targetX : pointer.worldX;
    const destY = targetY !== undefined ? targetY : pointer.worldY;

    if (skillId === 'slash') {
      // 1. 疾风斩击：近战宽幅斩击刀光波
      const slash = Projectile.createSlashWave(this, this.player.x, this.player.y, destX, destY, {
        damage: Math.round(this.player.atk * skill.multiplier),
        pierce: skill.pierceCount || 4,
        source: this.player,
      });
      this.projectiles.add(slash);
    } else if (skillId === 'fire_wave') {
      // 2. 炽焰散射：3 向扇形烈火飞弹
      const baseAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y, destX, destY);
      const angles = [baseAngle - 0.26, baseAngle, baseAngle + 0.26];

      angles.forEach((ang) => {
        const fireProj = new Projectile(this, this.player.x, this.player.y, {
          texture: 'icon_fireball',
          speed: skill.speed || 680,
          range: skill.range || 850,
          angle: ang,
          damage: Math.round(this.player.atk * skill.multiplier),
          pierce: skill.pierceCount || 2,
          isEnemy: false,
          source: this.player,
        });
        fireProj.setDisplaySize(44, 44);
        this.projectiles.add(fireProj);
      });
    } else if (skillId === 'thunder_strike') {
      // 3. 天顶雷霆：天顶轰击预警与 AOE 判定
      this.vfxManager.spawnTelegraphCircle(destX, destY, skill.aoeRadius || 180, 280, () => {
        // 雷霆落击瞬间
        this.vfxManager.triggerScreenShake(true);
        this.vfxManager.spawnHitSparks(destX, destY, 0x38bdf8);

        // 判定 AOE 伤害
        const targets = this.enemies.getChildren().filter((e) => {
          return e.active && Phaser.Math.Distance.Between(destX, destY, e.x, e.y) <= (skill.aoeRadius || 180);
        });

        targets.forEach((enemy) => {
          this.applyDamageToEnemy(enemy, {
            damage: Math.round(this.player.atk * skill.multiplier),
            isCrit: true,
            knockbackVector: { x: (enemy.x - destX) * 2, y: (enemy.y - destY) * 2 },
          });
        });
      });
    }
  }

  /**
   * 启动下一波敌人
   */
  startNextWave() {
    this.currentWaveIndex++;
    this.battleStats.wave = this.currentWaveIndex;

    const waveTitles = [
      '第 1 波次 · 骷髅斥候前哨突袭',
      '第 2 波次 · 亡灵先锋与暗影法师合围',
      '第 3 波次 · 狂暴骸骨军团压境',
      '关底决战 · 深渊首领【暗黑龙骑士】降临！',
    ];

    const title = waveTitles[this.currentWaveIndex - 1] || `第 ${this.currentWaveIndex} 波次`;
    this.events.emit('wave:change', { title, wave: this.currentWaveIndex });

    if (this.currentWaveIndex === 1) {
      // 波次 1：3 只骷髅战士
      this.spawnEnemies('skeleton', 3);
    } else if (this.currentWaveIndex === 2) {
      // 波次 2：4 只骷髅 + 2 只暗影法师
      this.spawnEnemies('skeleton', 4);
      this.spawnEnemies('mage', 2);
    } else if (this.currentWaveIndex === 3) {
      // 波次 3：6 只强化骷髅 + 3 只暗影法师
      this.spawnEnemies('skeleton', 6);
      this.spawnEnemies('mage', 3);
    } else if (this.currentWaveIndex === 4) {
      // 波次 4：关底 Boss 龙骑士出场！
      this.spawnBoss();
    }
  }

  /**
   * 批量生成小怪
   */
  spawnEnemies(typeKey, count) {
    for (let i = 0; i < count; i++) {
      // 在屏幕边缘随机刷出
      const pos = this.getRandomSpawnPosition();
      const enemy = new Enemy(this, pos.x, pos.y, typeKey);
      enemy.setTarget(this.player);
      this.enemies.add(enemy);

      // 监听敌人攻击事件
      enemy.on('enemy:attack_trigger', (atkData) => {
        this.handleEnemyAttack(enemy, atkData);
      });

      // 监听死亡事件
      enemy.on('enemy:died', () => {
        this.handleEnemyDeath(enemy);
      });
    }
  }

  /**
   * 生成关底首领 Boss
   */
  spawnBoss() {
    this.bossEntity = new Enemy(this, CANVAS_WIDTH / 2, 260, 'dragon_knight');
    this.bossEntity.setTarget(this.player);
    this.bossEntity.setScale(1.6);
    this.enemies.add(this.bossEntity);

    // 通知 HUD 展现 Boss 血条
    this.events.emit('boss:health_change', {
      hp: this.bossEntity.hp,
      maxHp: this.bossEntity.maxHp,
    });

    this.bossEntity.on('enemy:attack_trigger', (atkData) => {
      this.handleEnemyAttack(this.bossEntity, atkData);
    });

    this.bossEntity.on('enemy:died', () => {
      this.handleBossDeath();
    });
  }

  /**
   * 获取屏幕边缘安全刷怪点
   */
  getRandomSpawnPosition() {
    const side = Math.floor(Math.random() * 4);
    let x, y;
    if (side === 0) {
      // 上方
      x = Math.random() * CANVAS_WIDTH;
      y = 60;
    } else if (side === 1) {
      // 右方
      x = CANVAS_WIDTH - 60;
      y = Math.random() * CANVAS_HEIGHT;
    } else if (side === 2) {
      // 下方
      x = Math.random() * CANVAS_WIDTH;
      y = CANVAS_HEIGHT - 60;
    } else {
      // 左方
      x = 60;
      y = Math.random() * CANVAS_HEIGHT;
    }
    return { x, y };
  }

  /**
   * 处理敌人攻击 (Telegraph 红圈预警结算)
   */
  handleEnemyAttack(enemy, atkData) {
    if (!this.player || this.player.hp <= 0) return;

    if (atkData.type === 'projectile') {
      // 远程发射暗影弹
      const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
      const proj = new Projectile(this, enemy.x, enemy.y, {
        texture: 'vfx_spark',
        speed: 360,
        range: 900,
        angle,
        damage: enemy.atk,
        isEnemy: true,
      });
      proj.setDisplaySize(32, 32);
      proj.setTint(0xef4444);
      this.projectiles.add(proj);
    } else {
      // 近战 AOE：范围判定伤害
      const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y);
      if (dist <= (atkData.range || 100)) {
        this.player.takeDamage(enemy.atk);
      }
    }
  }

  /**
   * 伤害结算核心：将伤害施加到敌人
   */
  applyDamageToEnemy(enemy, damageResult) {
    if (!enemy || !enemy.active || enemy.hp <= 0) return;

    enemy.hp -= damageResult.damage;
    this.battleStats.totalDamage += damageResult.damage;

    // 1. 受击闪白 (60ms)
    this.vfxManager.triggerHitFlash(enemy, 60);

    // 2. 暴击顿帧与震屏
    if (damageResult.isCrit) {
      this.vfxManager.triggerHitStop(40);
      this.vfxManager.triggerScreenShake(true);
    } else {
      this.vfxManager.triggerScreenShake(false);
    }

    // 3. 动态跳字
    this.vfxManager.spawnFloatingText(enemy.x, enemy.y, damageResult.damage, damageResult.isCrit, 'damage');

    // 4. 爆裂火花
    this.vfxManager.spawnHitSparks(enemy.x, enemy.y, damageResult.isCrit ? 0xffd700 : 0xff7043);

    // 5. 击退位移
    if (damageResult.knockbackVector && enemy.body) {
      enemy.body.setVelocity(damageResult.knockbackVector.x, damageResult.knockbackVector.y);
    }

    // 若为 Boss，同步血条到 HUD
    if (enemy === this.bossEntity) {
      this.events.emit('boss:health_change', {
        hp: Math.max(0, enemy.hp),
        maxHp: enemy.maxHp,
      });
    }

    // 死亡判定
    if (enemy.hp <= 0) {
      enemy.die();
    }
  }

  /**
   * 敌人死亡处理
   */
  handleEnemyDeath(enemy) {
    this.battleStats.kills++;

    // 爆落经验晶体与金币
    const loot = CombatSystem.calculateLoot(enemy);
    this.battleStats.gold += loot.gold;

    this.spawnExpCrystal(enemy.x, enemy.y, loot.exp);

    // 检查当前波次是否肃清
    this.time.delayedCall(400, () => {
      this.checkWaveClear();
    });
  }

  /**
   * 生成掉落物经验晶体 (具备磁吸效果)
   */
  spawnExpCrystal(x, y, expAmount) {
    const crystal = this.add.circle(x, y, 6, 0x00e5ff);
    this.physics.add.existing(crystal);
    crystal.body.setCircle(6);
    crystal.setDepth(LAYER_DEPTH.DROPS);
    crystal.expAmount = expAmount;

    // 缩放光晕 Tween
    this.tweens.add({
      targets: crystal,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });

    this.drops.add(crystal);
  }

  /**
   * 首领 Boss 阵亡：大捷通关！
   */
  handleBossDeath() {
    this.vfxManager.triggerScreenShake(true);
    this.cameras.main.flash(500, 255, 255, 255);

    this.time.delayedCall(1200, () => {
      const hudScene = this.scene.get('HUDScene');
      if (hudScene) {
        hudScene.showResultModal(true, this.battleStats, () => {
          this.restartGame();
        });
      }
    });
  }

  /**
   * 玩家死亡：败亡处理
   */
  handlePlayerDeath() {
    this.cameras.main.shake(300, 0.015);
    this.time.delayedCall(800, () => {
      const hudScene = this.scene.get('HUDScene');
      if (hudScene) {
        hudScene.showResultModal(false, this.battleStats, () => {
          this.restartGame();
        });
      }
    });
  }

  /**
   * 检查波次清空与触发 3 选 1 战术强化卡牌
   */
  checkWaveClear() {
    if (this.isWaveTransitioning) return;
    if (this.enemies.countActive(true) === 0) {
      this.isWaveTransitioning = true;

      if (this.currentWaveIndex < 4) {
        // 唤起 3 选 1 肉鸽技能卡牌弹窗
        this.triggerLevelUpCards();
      }
    }
  }

  /**
   * 唤起 3 选 1 强化升级卡牌面板
   */
  triggerLevelUpCards() {
    const cardOptions = [
      {
        id: 'fire_evolution',
        title: '【炽焰狂潮】',
        tag: '弹道分裂 · 质变',
        iconKey: 'icon_fireball',
        desc: '炽焰散射弹道数量 +2，且完全贯穿所有敌人，爆炸半径扩大 50%',
        apply: () => {
          SKILL_CONFIG.fire_wave.multiplier *= 1.35;
          SKILL_CONFIG.fire_wave.pierceCount = 99;
          this.player.atk += 10;
        },
      },
      {
        id: 'thunder_mastery',
        title: '【暴击天雷】',
        tag: '雷霆流派 · 爆发',
        iconKey: 'icon_thunder',
        desc: '暴击率永久提升 25%，暴击伤害提升 50%，天顶落雷范围 +30%',
        apply: () => {
          this.player.critRate += 0.25;
          this.player.critDmg += 0.5;
        },
      },
      {
        id: 'wind_dash',
        title: '【迅疾幻影】',
        tag: '机动生存 · 撕裂',
        iconKey: 'icon_dash',
        desc: '暴风冲刺冷却缩减 50%，冲刺期间无敌帧延长，并对沿途造成 200 点物理撕裂',
        apply: () => {
          SKILL_CONFIG.dash.cooldown = 1000;
          this.player.shield += 120;
        },
      },
    ];

    const hudScene = this.scene.get('HUDScene');
    if (hudScene) {
      hudScene.showLevelUpCards(cardOptions, (selectedCard) => {
        if (selectedCard && selectedCard.apply) {
          selectedCard.apply();
        }
        // 恢复战斗状态，开启下一波次
        this.isWaveTransitioning = false;
        this.startNextWave();
      });
    } else {
      this.isWaveTransitioning = false;
      this.startNextWave();
    }
  }

  /**
   * 物理碰撞与重叠检测装配
   */
  setupCollisions() {
    // 1. 投射物与敌人的碰撞检测
    this.physics.add.overlap(this.projectiles, this.enemies, (proj, enemy) => {
      if (!proj.active || !enemy.active) return;
      if (proj.isEnemy) return; // 敌人投射物不伤同伴

      if (proj.hitEntities && proj.hitEntities.has(enemy)) return;
      if (proj.hitEntities) proj.hitEntities.add(enemy);

      // 计算伤害
      const isCrit = Math.random() < this.player.critRate;
      let finalDamage = Math.round(proj.damage * (isCrit ? this.player.critDmg : 1.0));

      this.applyDamageToEnemy(enemy, {
        damage: finalDamage,
        isCrit,
        knockbackVector: {
          x: Math.cos(proj.body.velocity.angle()) * 260,
          y: Math.sin(proj.body.velocity.angle()) * 260,
        },
      });

      // 扣除穿透数
      if (proj.pierce !== undefined) {
        proj.pierce--;
        if (proj.pierce <= 0) {
          proj.destroy();
        }
      }
    });

    // 2. 敌人投射物与玩家的重叠检测
    this.physics.add.overlap(this.projectiles, this.player, (proj, player) => {
      if (!proj.active || !proj.isEnemy) return;
      proj.destroy();
      player.takeDamage(proj.damage || 25);
    });

    // 3. 玩家拾取掉落物
    this.physics.add.overlap(this.player, this.drops, (player, drop) => {
      if (!drop.active) return;
      player.gainExp(drop.expAmount || 15);
      drop.destroy();
    });
  }

  /**
   * 重新开始游戏
   */
  restartGame() {
    this.scene.restart();
    const hudScene = this.scene.get('HUDScene');
    if (hudScene) {
      hudScene.scene.restart();
    }
  }

  update(time, delta) {
    if (!this.player || this.player.hp <= 0) return;

    // 驱动玩家实体更新
    this.player.update(time, delta);

    // 掉落物磁吸逻辑 (当距离玩家小于 260px 时自动吸向主角)
    this.drops.getChildren().forEach((drop) => {
      if (!drop.active) return;
      const dist = Phaser.Math.Distance.Between(drop.x, drop.y, this.player.x, this.player.y);
      if (dist < 260) {
        const angle = Phaser.Math.Angle.Between(drop.x, drop.y, this.player.x, this.player.y);
        const speed = 480;
        drop.x += Math.cos(angle) * (speed * (delta / 1000));
        drop.y += Math.sin(angle) * (speed * (delta / 1000));
      }
    });

    // 监听键盘按键触发技能
    if (Phaser.Input.Keyboard.JustDown(this.keyQ)) {
      this.castSkill('fire_wave');
    }
    if (Phaser.Input.Keyboard.JustDown(this.keyE)) {
      this.castSkill('dash');
    }
    if (Phaser.Input.Keyboard.JustDown(this.keyR)) {
      this.castSkill('thunder_strike');
    }
    if (Phaser.Input.Keyboard.JustDown(this.keySpace)) {
      this.castSkill('dash');
    }
  }
}

export default BattleScene;
