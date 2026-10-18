/**
 * 现代金融经济与 A 股证券投资系统 (Finance & Stock Market System)
 * 包含：
 * 1. 商业银行系统：活期储蓄季度结息、定期存单理财 (1年/3年/5年)、等额本息房贷管理与公积金冲还贷；
 * 2. A股四大核心板块交易：科技半导体、大消费白酒、新能源制造、银行高股息红利；
 * 3. 真实中国证券史四大重大行情历史大事件：1992认购证、2007超级大牛市、2015杠杆疯牛、2020核心资产抱团。
 */

export interface StockSector {
  id: string;
  name: string;
  code: string;
  categoryName: string;
  currentPrice: number; // 当前每股价格 (元)
  quarterChangePercent: number; // 本季涨跌幅 (%)
  holdShares: number; // 玩家持股数量 (股)
  averageCostPrice: number; // 玩家持仓均价 (元/股)
  dividendYieldAnnualPercent: number; // 年化股息率 (%)
  volatilityRate: number; // 板块波动率系数
  description: string;
}

export interface BankTimeDeposit {
  id: string;
  principalYuan: number; // 存入本金
  startYear: number; // 起存年份
  startQuarter: number; // 起存季度 (1~4)
  termYears: number; // 存期年限 (1年/3年/5年)
  annualRatePercent: number; // 年化约定利率 (%)
  isMatured: boolean; // 是否已到期
}

export interface MortgageAccount {
  totalLoanPrincipal: number; // 房贷初始贷款总本金
  remainingPrincipal: number; // 剩余未还本金 (元)
  annualInterestRatePercent: number; // 房贷年化利率 (如 4.2%)
  totalTenureYears: number; // 总贷款年限 (如 30 年)
  remainingMonths: number; // 剩余还款月数
  monthlyInstallment: number; // 每月等额本息还款额 (元)
  accumulatedInterestPaid: number; // 累计已支付利息总额
}

export interface HistoricalStockEvent {
  year: number;
  title: string;
  icon: string;
  narrative: string;
  marketImpact: {
    allSectorBoostPercent?: number;
    techChangePercent?: number;
    consumptionChangePercent?: number;
    newEnergyChangePercent?: number;
    financeBankChangePercent?: number;
  };
}

// -------------------------------------------------------------
// A 股四大重大历史行情事件库
// -------------------------------------------------------------
export const HISTORICAL_STOCK_EVENTS: Record<number, HistoricalStockEvent> = {
  1992: {
    year: 1992,
    title: "1992 沪市股票认购证狂潮与中国股市启航",
    icon: "📜",
    narrative: "上海证券交易所发行首批股票认购证，掀起波澜壮阔的财富神话，千倍暴富效应引爆全国炒股热潮！全市场板块迎来历史性开门红！",
    marketImpact: {
      allSectorBoostPercent: 120,
      techChangePercent: 150,
      consumptionChangePercent: 100,
      financeBankChangePercent: 80,
      newEnergyChangePercent: 110,
    },
  },
  2007: {
    year: 2007,
    title: "2007 冲上云霄 6124 历史超级大牛市",
    icon: "🚀",
    narrative: "股权分置改革与经济腾飞驱动A股创下6124点历史最高纪录！全民开户入市，大蓝筹与周期资源股全面爆发，全线暴涨！",
    marketImpact: {
      allSectorBoostPercent: 65,
      financeBankChangePercent: 85,
      consumptionChangePercent: 75,
      techChangePercent: 55,
      newEnergyChangePercent: 60,
    },
  },
  2015: {
    year: 2015,
    title: "2015 互联网+与 5178 点杠杆大疯牛",
    icon: "⚡",
    narrative: "场外配资与‘大众创业、万众创新’点燃创业板神话，科技互联网板块直冲云霄，随后经历去杠杆巨震，波动极其剧烈！",
    marketImpact: {
      allSectorBoostPercent: 20,
      techChangePercent: 95,
      newEnergyChangePercent: 45,
      consumptionChangePercent: 15,
      financeBankChangePercent: -10,
    },
  },
  2020: {
    year: 2020,
    title: "2020 核心资产与新能源黄金赛道抱团牛",
    icon: "💎",
    narrative: "全球流动性释放，公募基金大扩容，茅台等消费白马与光伏锂电龙头被封为‘核心资产’，赛道股走出独立大牛市行情！",
    marketImpact: {
      allSectorBoostPercent: 15,
      consumptionChangePercent: 55,
      newEnergyChangePercent: 85,
      techChangePercent: 40,
      financeBankChangePercent: 5,
    },
  },
};

export class FinanceStockSystem {
  public isStockAccountOpened: boolean = false; // 是否已开立 A 股证券账户
  public totalRealizedProfitYuan: number = 0; // 累计已实现炒股盈亏 (元)

  // 银行资产与负债
  public bankCurrentSavings: number = 0; // 活期存款余额 (元)
  public timeDeposits: BankTimeDeposit[] = []; // 定期存单列表
  public mortgage: MortgageAccount | null = null; // 房贷按揭账户

  // A 股四大板块初始行情
  public sectors: StockSector[] = [
    {
      id: "tech",
      code: "688001",
      name: "💻 科技芯片与人工智能板块",
      categoryName: "硬科技 / 算力半导体",
      currentPrice: 28.5,
      quarterChangePercent: 4.2,
      holdShares: 0,
      averageCostPrice: 0,
      dividendYieldAnnualPercent: 0.8,
      volatilityRate: 1.8,
      description: "聚焦先进制程芯片、人工智能大模型与操作系统，弹性极大，进攻性极强。",
    },
    {
      id: "consumption",
      code: "600519",
      name: "🍷 大消费与国酒食品板块",
      categoryName: "核心消费 / 高ROE",
      currentPrice: 62.0,
      quarterChangePercent: 2.1,
      holdShares: 0,
      averageCostPrice: 0,
      dividendYieldAnnualPercent: 2.8,
      volatilityRate: 0.9,
      description: "传统白酒、品牌餐饮与生活消费品，现金流充沛，抗通胀韧性极强。",
    },
    {
      id: "new_energy",
      code: "300750",
      name: "⚡ 新能源与先进制造板块",
      categoryName: "动力电池 / 光伏绿电",
      currentPrice: 35.8,
      quarterChangePercent: -1.5,
      holdShares: 0,
      averageCostPrice: 0,
      dividendYieldAnnualPercent: 1.2,
      volatilityRate: 1.5,
      description: "锂电池、光伏储能与高端装备，受国家产业政策驱动，景气周期爆发力强。",
    },
    {
      id: "finance_bank",
      code: "601398",
      name: "🏦 银行高股息与红利资产板块",
      categoryName: "中特估 / 稳健分红",
      currentPrice: 12.8,
      quarterChangePercent: 1.2,
      holdShares: 0,
      averageCostPrice: 0,
      dividendYieldAnnualPercent: 5.5,
      volatilityRate: 0.5,
      description: "国有大行与公用事业，超高现金分红与低市盈率估值，穿越牛熊避风港。",
    },
  ];

  // 兼容旧字段
  get bankSavings(): number {
    return this.bankCurrentSavings;
  }
  set bankSavings(val: number) {
    this.bankCurrentSavings = val;
  }
  get bankLoanDebt(): number {
    return this.mortgage ? this.mortgage.remainingPrincipal : 0;
  }
  set bankLoanDebt(val: number) {
    if (this.mortgage) {
      this.mortgage.remainingPrincipal = val;
    }
  }

  // -----------------------------------------------------------
  // 1. 银行系统 (活期、定期、房贷)
  // -----------------------------------------------------------

  /**
   * 存入活期储蓄
   */
  public depositCurrentSavings(amount: number): { success: boolean; msg: string } {
    if (amount <= 0) return { success: false, msg: "存款金额必须大于 0！" };
    this.bankCurrentSavings += amount;
    return {
      success: true,
      msg: `💰 成功存入银行活期 ¥${amount.toLocaleString()} 元，当前活期结余 ¥${this.bankCurrentSavings.toLocaleString()} 元。`,
    };
  }

  /**
   * 支取活期储蓄
   */
  public withdrawCurrentSavings(amount: number): { success: boolean; actualWithdraw: number; msg: string } {
    if (amount <= 0) return { success: false, actualWithdraw: 0, msg: "支取金额必须大于 0！" };
    if (this.bankCurrentSavings < amount) {
      return { success: false, actualWithdraw: 0, msg: `活期余额不足！当前结余仅 ¥${this.bankCurrentSavings.toLocaleString()} 元。` };
    }
    this.bankCurrentSavings -= amount;
    return {
      success: true,
      actualWithdraw: amount,
      msg: `🏧 成功支取活期存款 ¥${amount.toLocaleString()} 元，剩余活期 ¥${this.bankCurrentSavings.toLocaleString()} 元。`,
    };
  }

  /**
   * 购买定期大额存单 (1年期 2.8%, 3年期 3.5%, 5年期 4.2%)
   */
  public openTimeDeposit(principal: number, termYears: 1 | 3 | 5, currentYear: number, currentQuarter: number): {
    success: boolean;
    deposit?: BankTimeDeposit;
    msg: string;
  } {
    if (principal < 10000) {
      return { success: false, msg: "定期存单起存门槛为 ¥10,000 元！" };
    }

    const rateMap: Record<number, number> = {
      1: 2.8,
      3: 3.5,
      5: 4.2,
    };
    const rate = rateMap[termYears] || 2.8;

    const deposit: BankTimeDeposit = {
      id: `dep_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      principalYuan: principal,
      startYear: currentYear,
      startQuarter: currentQuarter,
      termYears,
      annualRatePercent: rate,
      isMatured: false,
    };

    this.timeDeposits.push(deposit);
    return {
      success: true,
      deposit,
      msg: `🏦 成功办理【${termYears}年期定期存单】本金 ¥${principal.toLocaleString()} 元，锁定年化收益率 ${rate}%！`,
    };
  }

  /**
   * 结算定期存单到期本息
   */
  public settleMaturedDeposits(currentYear: number, currentQuarter: number): { totalPrincipal: number; totalInterest: number; count: number; msg: string } {
    let totalPrincipal = 0;
    let totalInterest = 0;
    let count = 0;

    this.timeDeposits.forEach((dep) => {
      if (!dep.isMatured) {
        const passedYears = currentYear - dep.startYear + (currentQuarter - dep.startQuarter) / 4;
        if (passedYears >= dep.termYears) {
          dep.isMatured = true;
          const interest = Math.round(dep.principalYuan * (dep.annualRatePercent / 100) * dep.termYears);
          totalPrincipal += dep.principalYuan;
          totalInterest += interest;
          count += 1;
        }
      }
    });

    // 移除已到期并兑付的存单
    this.timeDeposits = this.timeDeposits.filter((d) => !d.isMatured);
    const totalPayout = totalPrincipal + totalInterest;
    this.bankCurrentSavings += totalPayout;

    return {
      totalPrincipal,
      totalInterest,
      count,
      msg: count > 0 ? `🎉 共有 ${count} 笔定期存单到期结清！收回本金 ¥${totalPrincipal.toLocaleString()} 元，获得定期利息 ¥${totalInterest.toLocaleString()} 元，已自动转入活期账户！` : "暂无到期存单。",
    };
  }

  /**
   * 申请按揭房贷
   */
  public applyMortgage(loanPrincipal: number, tenureYears: number = 30, annualRate: number = 4.2): { success: boolean; msg: string } {
    if (loanPrincipal <= 0) return { success: false, msg: "贷款金额无效！" };

    const totalMonths = tenureYears * 12;
    const monthlyRate = annualRate / 100 / 12;
    // 等额本息公式: 月供 = 本金 * [月利率*(1+月利率)^总月数] / [(1+月利率)^总月数 - 1]
    const factor = Math.pow(1 + monthlyRate, totalMonths);
    const monthlyInstallment = Math.round((loanPrincipal * (monthlyRate * factor)) / (factor - 1));

    this.mortgage = {
      totalLoanPrincipal: loanPrincipal,
      remainingPrincipal: loanPrincipal,
      annualInterestRatePercent: annualRate,
      totalTenureYears: tenureYears,
      remainingMonths: totalMonths,
      monthlyInstallment,
      accumulatedInterestPaid: 0,
    };

    return {
      success: true,
      msg: `🏠 成功办理银行房贷按揭！总贷款 ¥${loanPrincipal.toLocaleString()} 元，期限 ${tenureYears} 年，年化利率 ${annualRate}%，每月应还月供 ¥${monthlyInstallment.toLocaleString()} 元。`,
    };
  }

  /**
   * 提前偿还房贷 (支持现金或全额结清)
   */
  public repayMortgagePrincipal(repayAmount: number): { success: boolean; actualRepaid: number; remainingDebt: number; isSettled: boolean; msg: string } {
    if (!this.mortgage || this.mortgage.remainingPrincipal <= 0) {
      return { success: false, actualRepaid: 0, remainingDebt: 0, isSettled: true, msg: "您当前名下无未结清房贷。" };
    }

    const actual = Math.min(this.mortgage.remainingPrincipal, repayAmount);
    this.mortgage.remainingPrincipal -= actual;
    const isSettled = this.mortgage.remainingPrincipal <= 0;

    if (isSettled) {
      this.mortgage = null;
      return {
        success: true,
        actualRepaid: actual,
        remainingDebt: 0,
        isSettled: true,
        msg: `🎉 恭喜！您已成功提前还清所有房贷本息！卸下沉重房贷枷锁，房产红本正式归属自己！`,
      };
    } else {
      // 重新计算剩余月供
      const monthlyRate = this.mortgage.annualInterestRatePercent / 100 / 12;
      const factor = Math.pow(1 + monthlyRate, this.mortgage.remainingMonths);
      this.mortgage.monthlyInstallment = Math.round((this.mortgage.remainingPrincipal * (monthlyRate * factor)) / (factor - 1));

      return {
        success: true,
        actualRepaid: actual,
        remainingDebt: this.mortgage.remainingPrincipal,
        isSettled: false,
        msg: `🏠 提前偿还房贷本金 ¥${actual.toLocaleString()} 元！剩余房贷本金 ¥${this.mortgage.remainingPrincipal.toLocaleString()} 元，重算后每月月供降至 ¥${this.mortgage.monthlyInstallment.toLocaleString()} 元。`,
      };
    }
  }

  // -----------------------------------------------------------
  // 2. A 股证券投资与历史大事件行情系统
  // -----------------------------------------------------------

  /**
   * 开立 A 股证券账户
   */
  public openAccount(): { success: boolean; msg: string } {
    this.isStockAccountOpened = true;
    return {
      success: true,
      msg: "📈 恭喜开通中国证券登记结算公司 A 股股东账户！开辟资本市场财富增值之路！",
    };
  }

  /**
   * 推进季度行情轮动与历史事件判定
   */
  public quarterMarketTick(currentYear?: number): { eventTriggered?: HistoricalStockEvent; dividendEarned: number } {
    let eventTriggered: HistoricalStockEvent | undefined;
    if (currentYear && HISTORICAL_STOCK_EVENTS[currentYear]) {
      eventTriggered = HISTORICAL_STOCK_EVENTS[currentYear];
    }

    let totalDividendEarned = 0;

    this.sectors.forEach((sec) => {
      let baseChange = (Math.random() * 18 - 8) * sec.volatilityRate; // 基准随机波动

      // 若处于历史大事件年份，叠加特定事件冲击
      if (eventTriggered) {
        if (eventTriggered.marketImpact.allSectorBoostPercent) {
          baseChange += eventTriggered.marketImpact.allSectorBoostPercent / 4;
        }
        if (sec.id === "tech" && eventTriggered.marketImpact.techChangePercent) {
          baseChange += eventTriggered.marketImpact.techChangePercent / 4;
        }
        if (sec.id === "consumption" && eventTriggered.marketImpact.consumptionChangePercent) {
          baseChange += eventTriggered.marketImpact.consumptionChangePercent / 4;
        }
        if (sec.id === "new_energy" && eventTriggered.marketImpact.newEnergyChangePercent) {
          baseChange += eventTriggered.marketImpact.newEnergyChangePercent / 4;
        }
        if (sec.id === "finance_bank" && eventTriggered.marketImpact.financeBankChangePercent) {
          baseChange += eventTriggered.marketImpact.financeBankChangePercent / 4;
        }
      }

      sec.quarterChangePercent = Math.round(baseChange * 10) / 10;
      sec.currentPrice = Math.max(1.0, Math.round(sec.currentPrice * (1 + baseChange / 100) * 100) / 100);

      // 每季度派发持仓分红 (年化股息率 / 4)
      if (sec.holdShares > 0 && sec.dividendYieldAnnualPercent > 0) {
        const divQuarter = Math.round(sec.holdShares * sec.currentPrice * (sec.dividendYieldAnnualPercent / 100 / 4) * 100) / 100;
        totalDividendEarned += divQuarter;
      }
    });

    if (totalDividendEarned > 0) {
      this.bankCurrentSavings += Math.round(totalDividendEarned);
    }

    return { eventTriggered, dividendEarned: Math.round(totalDividendEarned) };
  }

  /**
   * 买入 A 股股票
   * @param sectorId 板块 ID
   * @param shares 买入股数 (必须为 100 的整数倍)
   * @param playerCash 玩家可用现金 (元)
   */
  public buyShares(sectorId: string, shares: number, playerCash: number): {
    success: boolean;
    totalCost: number;
    sharesBought: number;
    commissionFee: number;
    msg: string;
  } {
    if (!this.isStockAccountOpened) {
      return { success: false, totalCost: 0, sharesBought: 0, commissionFee: 0, msg: "您尚未开通 A 股证券账户！" };
    }

    if (shares <= 0 || shares % 100 !== 0) {
      return { success: false, totalCost: 0, sharesBought: 0, commissionFee: 0, msg: "A 股买入必须为 100 股（1手）的整数倍！" };
    }

    const sec = this.sectors.find((s) => s.id === sectorId);
    if (!sec) {
      return { success: false, totalCost: 0, sharesBought: 0, commissionFee: 0, msg: "板块代码不存在！" };
    }

    const rawCost = sec.currentPrice * shares;
    // 券商佣金万2.5 (最低 5 元)
    const commissionFee = Math.max(5, Math.round(rawCost * 0.00025 * 100) / 100);
    const totalCost = Math.round((rawCost + commissionFee) * 100) / 100;

    if (playerCash < totalCost) {
      return { success: false, totalCost, sharesBought: 0, commissionFee, msg: `可用资金不足！需要 ¥${totalCost.toLocaleString()} 元（含交易佣金 ¥${commissionFee} 元）。` };
    }

    // 更新持仓成本与均价
    const previousTotalValue = sec.holdShares * sec.averageCostPrice;
    sec.holdShares += shares;
    sec.averageCostPrice = Math.round(((previousTotalValue + totalCost) / sec.holdShares) * 100) / 100;

    return {
      success: true,
      totalCost,
      sharesBought: shares,
      commissionFee,
      msg: `🎯 成功挂单买入【${sec.name}】${shares} 股 (成本均价 ¥${sec.averageCostPrice} 元)，支付佣金 ¥${commissionFee} 元！`,
    };
  }

  /**
   * 卖出 A 股股票
   * @param sectorId 板块 ID
   * @param shares 卖出股数
   */
  public sellShares(sectorId: string, shares: number): {
    success: boolean;
    netGainYuan: number;
    profitOrLossYuan: number;
    stampDutyFee: number;
    commissionFee: number;
    msg: string;
  } {
    const sec = this.sectors.find((s) => s.id === sectorId);
    if (!sec || sec.holdShares < shares || shares <= 0) {
      return { success: false, netGainYuan: 0, profitOrLossYuan: 0, stampDutyFee: 0, commissionFee: 0, msg: "持仓股数不足或卖出数量无效！" };
    }

    const rawAmount = sec.currentPrice * shares;
    // 印花税千1单边收取，佣金万2.5
    const stampDutyFee = Math.round(rawAmount * 0.001 * 100) / 100;
    const commissionFee = Math.max(5, Math.round(rawAmount * 0.00025 * 100) / 100);
    const netGainYuan = Math.round((rawAmount - stampDutyFee - commissionFee) * 100) / 100;

    const costBasis = sec.averageCostPrice * shares;
    const profitOrLoss = Math.round((netGainYuan - costBasis) * 100) / 100;

    sec.holdShares -= shares;
    if (sec.holdShares === 0) {
      sec.averageCostPrice = 0;
    }
    this.totalRealizedProfitYuan += profitOrLoss;

    const isProfit = profitOrLoss >= 0;
    return {
      success: true,
      netGainYuan,
      profitOrLossYuan: profitOrLoss,
      stampDutyFee,
      commissionFee,
      msg: `💸 成功卖出【${sec.name}】${shares} 股，扣除印花税 ¥${stampDutyFee} 元与佣金 ¥${commissionFee} 元后到账 ¥${netGainYuan.toLocaleString()} 元！本次交易${isProfit ? "盈利 +" : "亏损 "}¥${profitOrLoss.toLocaleString()} 元！`,
    };
  }

  /**
   * 获取持仓总市值与总浮动盈亏
   */
  public getPortfolioSummary(): {
    totalMarketValue: number;
    totalCost: number;
    totalUnrealizedPnL: number;
    totalPnLPercent: number;
  } {
    let totalMarketValue = 0;
    let totalCost = 0;

    this.sectors.forEach((sec) => {
      if (sec.holdShares > 0) {
        totalMarketValue += sec.holdShares * sec.currentPrice;
        totalCost += sec.holdShares * sec.averageCostPrice;
      }
    });

    const totalUnrealizedPnL = Math.round((totalMarketValue - totalCost) * 100) / 100;
    const totalPnLPercent = totalCost > 0 ? Math.round((totalUnrealizedPnL / totalCost) * 10000) / 100 : 0;

    return {
      totalMarketValue: Math.round(totalMarketValue * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      totalUnrealizedPnL,
      totalPnLPercent,
    };
  }
}
