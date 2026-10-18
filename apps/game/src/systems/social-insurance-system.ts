/**
 * 中国五险一金与个人所得税社会保障系统 (Social Insurance & Tax System)
 * 严格落实真实中国五险一金缴存标准、2019新税法5000元起征点7级超额累进税率
 * 支持公积金月冲/年冲抵扣房贷、个人养老金退休精算与医保住院报销统筹
 */

export interface SocialInsuranceLedger {
  grossSalary: number; // 税前应发工资
  socialInsuranceBase: number; // 社保公积金缴纳基数

  // 个人扣缴部分 (五险一金)
  pensionPersonal: number; // 养老保险 (8%)
  medicalPersonal: number; // 医疗保险 (2% + 门诊统筹)
  unemploymentPersonal: number; // 失业保险 (0.5%)
  housingFundPersonal: number; // 住房公积金 (10%)
  totalPersonalDeduction: number; // 个人五险一金合计

  // 单位承担部分 (企业成本)
  pensionCompany: number; // 养老保险 (16%)
  medicalCompany: number; // 医疗保险 (8%)
  unemploymentCompany: number; // 失业保险 (0.5%)
  workInjuryCompany: number; // 工伤保险 (0.5%)
  maternityCompany: number; // 生育保险 (0.8%)
  housingFundCompany: number; // 住房公积金 (10%)
  totalCompanyBurden: number; // 单位五险一金统筹支出合计
  totalCompanyEmploymentCost: number; // 企业总雇佣成本 (税前工资 + 单位社保)

  // 个人所得税与到手薪资
  taxableIncome: number; // 应纳税所得额 (税前 - 个人社保 - 5000起征点 - 专项扣除)
  taxRatePercent: number; // 适用个税税率 (%)
  quickDeductionYuan: number; // 速算扣除数 (元)
  individualIncomeTax: number; // 实际应缴个税 (元)
  netTakeHomeSalary: number; // 最终税后实际到手月薪 (元)

  // 账户累计结余
  housingFundTotalBalance: number; // 当前住房公积金账户总结余 (可冲抵房贷)
  medicalPersonalBalance: number; // 个人医保账户余额
}

export interface MortgageDeductionResult {
  success: boolean;
  mode: "monthly_offset" | "principal_lump_sum"; // 月冲(抵月供) 或 年冲(抵本金)
  deductedAmount: number; // 本次公积金抵扣金额 (元)
  remainingHousingFundBalance: number; // 抵扣后公积金账户剩余 (元)
  remainingDebt: number; // 抵扣后房贷剩余本金/月供应付 (元)
  msg: string;
}

export interface RetirementPensionResult {
  eligible: boolean; // 是否满足退休养老金领取条件 (缴费满15年=180个月)
  yearsPaid: number; // 实际缴费年限
  basePensionMonthly: number; // 基础养老金 (每月)
  personalAccountPensionMonthly: number; // 个人账户养老金 (每月)
  totalMonthlyPension: number; // 每月发放养老金总额 (元)
  evaluationMsg: string;
}

export interface MedicalReimbursementResult {
  totalExpense: number; // 医疗就诊总花费
  insuranceReimbursed: number; // 医保统筹基金统筹报销金额
  personalAccountPaid: number; // 个人医保账户抵扣金额
  cashPaid: number; // 个人现金自费自付金额
  reimbursementRatePercent: number; // 综合报销比例
  msg: string;
}

export class SocialInsuranceSystem {
  // 累计核心资产池
  public accumulatedHousingFund: number = 0; // 累计住房公积金账户 (个人+单位1:1汇缴)
  public accumulatedPensionMonths: number = 0; // 累计缴纳社保月数
  public accumulatedPensionPersonalPool: number = 0; // 个人养老保险账户累计本息
  public accumulatedMedicalPersonalPool: number = 0; // 个人医保账户累计结余
  public housingFundRate: number = 0.10; // 公积金缴存比例 (默认10%，可在5%~12%浮动)
  public specialAdditionalDeductions: number = 0; // 专项附加扣除 (子女教育/继续教育/赡养老人等，默认0)

  /**
   * 精确计算月度五险一金、个人所得税与企业雇佣总成本
   * @param grossSalary 税前工资 (元)
   * @param customBase 可选自定义缴纳基数 (默认等于税前工资，在社保上下限范围内)
   */
  public calculateMonthlyLedger(grossSalary: number, customBase?: number): SocialInsuranceLedger {
    if (grossSalary <= 0) {
      return {
        grossSalary: 0,
        socialInsuranceBase: 0,
        pensionPersonal: 0,
        medicalPersonal: 0,
        unemploymentPersonal: 0,
        housingFundPersonal: 0,
        totalPersonalDeduction: 0,
        pensionCompany: 0,
        medicalCompany: 0,
        unemploymentCompany: 0,
        workInjuryCompany: 0,
        maternityCompany: 0,
        housingFundCompany: 0,
        totalCompanyBurden: 0,
        totalCompanyEmploymentCost: 0,
        taxableIncome: 0,
        taxRatePercent: 0,
        quickDeductionYuan: 0,
        individualIncomeTax: 0,
        netTakeHomeSalary: 0,
        housingFundTotalBalance: this.accumulatedHousingFund,
        medicalPersonalBalance: this.accumulatedMedicalPersonalPool,
      };
    }

    // 确定缴费基数 (设定基数下限 ¥3800，上限 ¥38000)
    const rawBase = customBase !== undefined ? customBase : grossSalary;
    const insuranceBase = Math.min(38000, Math.max(3800, rawBase));

    // 1. 个人承担五险一金 (养老8%, 医疗2%, 失业0.5%, 公积金10%)
    const pensionPersonal = Math.round(insuranceBase * 0.08);
    const medicalPersonal = Math.round(insuranceBase * 0.02);
    const unemploymentPersonal = Math.round(insuranceBase * 0.005);
    const housingFundPersonal = Math.round(insuranceBase * this.housingFundRate);
    const totalPersonalDeduction = pensionPersonal + medicalPersonal + unemploymentPersonal + housingFundPersonal;

    // 2. 企业单位承担部分 (养老16%, 医疗8%, 失业0.5%, 工伤0.5%, 生育0.8%, 公积金10%)
    const pensionCompany = Math.round(insuranceBase * 0.16);
    const medicalCompany = Math.round(insuranceBase * 0.08);
    const unemploymentCompany = Math.round(insuranceBase * 0.005);
    const workInjuryCompany = Math.round(insuranceBase * 0.005);
    const maternityCompany = Math.round(insuranceBase * 0.008);
    const housingFundCompany = Math.round(insuranceBase * this.housingFundRate);
    const totalCompanyBurden = pensionCompany + medicalCompany + unemploymentCompany + workInjuryCompany + maternityCompany + housingFundCompany;
    const totalCompanyEmploymentCost = grossSalary + totalCompanyBurden;

    // 3. 个人所得税 (5000元起征点，7级超额累进)
    const threshold = 5000;
    const taxableIncome = Math.max(0, grossSalary - totalPersonalDeduction - threshold - this.specialAdditionalDeductions);

    let taxRatePercent = 0;
    let quickDeductionYuan = 0;

    if (taxableIncome <= 0) {
      taxRatePercent = 0;
      quickDeductionYuan = 0;
    } else if (taxableIncome <= 3000) {
      taxRatePercent = 3;
      quickDeductionYuan = 0;
    } else if (taxableIncome <= 12000) {
      taxRatePercent = 10;
      quickDeductionYuan = 210;
    } else if (taxableIncome <= 25000) {
      taxRatePercent = 20;
      quickDeductionYuan = 1410;
    } else if (taxableIncome <= 35000) {
      taxRatePercent = 25;
      quickDeductionYuan = 2660;
    } else if (taxableIncome <= 55000) {
      taxRatePercent = 30;
      quickDeductionYuan = 4410;
    } else if (taxableIncome <= 80000) {
      taxRatePercent = 35;
      quickDeductionYuan = 7160;
    } else {
      taxRatePercent = 45;
      quickDeductionYuan = 15160;
    }

    const calculatedTax = taxableIncome > 0 ? taxableIncome * (taxRatePercent / 100) - quickDeductionYuan : 0;
    const individualIncomeTax = Math.round(Math.max(0, calculatedTax));
    const netTakeHomeSalary = Math.max(0, grossSalary - totalPersonalDeduction - individualIncomeTax);

    // 4. 更新累计社保账户池 (单位+个人1:1缴存公积金，个人养老金账户)
    this.accumulatedHousingFund += housingFundPersonal + housingFundCompany;
    this.accumulatedPensionPersonalPool += pensionPersonal;
    this.accumulatedMedicalPersonalPool += medicalPersonal;
    this.accumulatedPensionMonths += 1;

    return {
      grossSalary,
      socialInsuranceBase: insuranceBase,
      pensionPersonal,
      medicalPersonal,
      unemploymentPersonal,
      housingFundPersonal,
      totalPersonalDeduction,
      pensionCompany,
      medicalCompany,
      unemploymentCompany,
      workInjuryCompany,
      maternityCompany,
      housingFundCompany,
      totalCompanyBurden,
      totalCompanyEmploymentCost,
      taxableIncome,
      taxRatePercent,
      quickDeductionYuan,
      individualIncomeTax,
      netTakeHomeSalary,
      housingFundTotalBalance: this.accumulatedHousingFund,
      medicalPersonalBalance: this.accumulatedMedicalPersonalPool,
    };
  }

  /**
   * 住房公积金抵扣房贷
   * @param mortgageAmount 房贷月供金额 或 房贷剩余总本金
   * @param mode "monthly_offset" (月冲抵月供) 或 "principal_lump_sum" (年冲抵本金)
   */
  public deductMortgageWithHousingFund(mortgageAmount: number, mode: "monthly_offset" | "principal_lump_sum"): MortgageDeductionResult {
    if (mortgageAmount <= 0 || this.accumulatedHousingFund <= 0) {
      return {
        success: false,
        mode,
        deductedAmount: 0,
        remainingHousingFundBalance: this.accumulatedHousingFund,
        remainingDebt: mortgageAmount,
        msg: "住房公积金余额为 0 或房贷金额无效，无法抵扣。",
      };
    }

    if (mode === "monthly_offset") {
      // 月冲：优先扣除公积金冲抵当月月供
      const deduct = Math.min(this.accumulatedHousingFund, mortgageAmount);
      this.accumulatedHousingFund -= deduct;
      const remainingNeedPay = mortgageAmount - deduct;
      return {
        success: true,
        mode,
        deductedAmount: deduct,
        remainingHousingFundBalance: this.accumulatedHousingFund,
        remainingDebt: remainingNeedPay,
        msg: `🏠【公积金月冲成功】已自动使用公积金抵扣月供 ¥${deduct.toLocaleString()} 元，公积金剩余 ¥${this.accumulatedHousingFund.toLocaleString()} 元，还需现金支付 ¥${remainingNeedPay.toLocaleString()} 元。`,
      };
    } else {
      // 年冲：一次性提取公积金余额冲减房贷剩余总本金
      const deduct = Math.min(this.accumulatedHousingFund, mortgageAmount);
      this.accumulatedHousingFund -= deduct;
      const newDebt = mortgageAmount - deduct;
      return {
        success: true,
        mode,
        deductedAmount: deduct,
        remainingHousingFundBalance: this.accumulatedHousingFund,
        remainingDebt: newDebt,
        msg: `🎉【公积金年冲大额结清】成功提取公积金 ¥${deduct.toLocaleString()} 元全额冲减房贷本金！剩余房贷本金降至 ¥${newDebt.toLocaleString()} 元。`,
      };
    }
  }

  /**
   * 退休养老金核算 (法定退休满15年=180个月缴纳)
   * @param localAvgMonthlySalary 当地社会在岗职工平均月工资 (默认¥8500)
   */
  public calculateRetirementPension(localAvgMonthlySalary: number = 8500): RetirementPensionResult {
    const yearsPaid = Math.floor(this.accumulatedPensionMonths / 12);
    if (this.accumulatedPensionMonths < 180) {
      return {
        eligible: false,
        yearsPaid,
        basePensionMonthly: 0,
        personalAccountPensionMonthly: 0,
        totalMonthlyPension: 0,
        evaluationMsg: `⚠️ 社保累计缴费未满15年（当前已缴纳 ${this.accumulatedPensionMonths}/180 个月，计 ${yearsPaid} 年），无法按月领取终身国家养老金。`,
      };
    }

    // 基础养老金 = 退休时全省在岗职工月平均工资 * (1 + 个人平均缴费指数1.0) / 2 * 缴费年限 * 1%
    const basePensionMonthly = Math.round(localAvgMonthlySalary * 1.0 * yearsPaid * 0.01);

    // 个人账户养老金 = 个人账户累计储存额 / 计发月数 (60岁退休对应计发月数139个月)
    const personalAccountPensionMonthly = Math.round(this.accumulatedPensionPersonalPool / 139);

    const totalMonthlyPension = basePensionMonthly + personalAccountPensionMonthly;

    return {
      eligible: true,
      yearsPaid,
      basePensionMonthly,
      personalAccountPensionMonthly,
      totalMonthlyPension,
      evaluationMsg: `🎖️【国家基本养老金核定】您已光荣退休！累计缴费 ${yearsPaid} 年，每月发放养老金 ¥${totalMonthlyPension.toLocaleString()} 元（基础养老金 ¥${basePensionMonthly} + 个人账户养老金 ¥${personalAccountPensionMonthly}），享受终身国家社保医保无忧待遇！`,
    };
  }

  /**
   * 医疗就医与医保报销计算
   * @param expenseYuan 总医疗花费 (元)
   * @param isHospitalized 是否为重大住院/手术 (住院报销85%~90%，普通门诊70%)
   */
  public calculateMedicalReimbursement(expenseYuan: number, isHospitalized: boolean): MedicalReimbursementResult {
    if (expenseYuan <= 0) {
      return {
        totalExpense: 0,
        insuranceReimbursed: 0,
        personalAccountPaid: 0,
        cashPaid: 0,
        reimbursementRatePercent: 0,
        msg: "无医疗费用支出。",
      };
    }

    // 门诊报销70%（起付线后），住院报销85%~90%
    const coverageRate = isHospitalized ? 0.88 : 0.70;
    const insuranceReimbursed = Math.round(expenseYuan * coverageRate);
    const remainingSelfPay = expenseYuan - insuranceReimbursed;

    // 优先使用个人医保账户余额扣减自费部分
    const personalAccountPaid = Math.min(this.accumulatedMedicalPersonalPool, remainingSelfPay);
    this.accumulatedMedicalPersonalPool -= personalAccountPaid;
    const cashPaid = remainingSelfPay - personalAccountPaid;

    const ratePercent = Math.round(((insuranceReimbursed + personalAccountPaid) / expenseYuan) * 100);

    return {
      totalExpense: expenseYuan,
      insuranceReimbursed,
      personalAccountPaid,
      cashPaid,
      reimbursementRatePercent: ratePercent,
      msg: `🏥【医保统筹结算】总费用 ¥${expenseYuan.toLocaleString()} 元，基本医疗统筹报销 ¥${insuranceReimbursed.toLocaleString()} 元 (${coverageRate * 100}%)，医保个人账户扣除 ¥${personalAccountPaid.toLocaleString()} 元，个人最终现金自付仅需 ¥${cashPaid.toLocaleString()} 元！`,
    };
  }
}
