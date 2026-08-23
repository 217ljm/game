/**
 * 《人生轨迹》一生轨迹社交分享长图海报生成器 (Canvas Poster Generator)
 * 纯客户端原生 Canvas 离屏渲染，支持即时预览与无损 PNG 下载。
 */

/**
 * 绘制圆角矩形
 */
function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.arcTo(x + width, y, x + width, y + radius, radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
  ctx.lineTo(x + radius, y + height);
  ctx.arcTo(x, y + height, x, y + height - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

/**
 * 文本自动折行绘制
 */
function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = String(text ?? "").split("");
  let line = "";
  let currentY = y;
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line, x, currentY);
      line = words[n];
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, currentY);
  return currentY + lineHeight;
}

/**
 * 生成一生轨迹长图海报
 * @param {object} lifeData 人生终局数据与复盘
 * @returns {string} dataURL (image/png)
 */
export function generateLifePoster(lifeData = {}) {
  const canvas = document.createElement("canvas");
  const width = 800;
  const height = 1360;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const review = lifeData.lifeReview ?? {};
  const profile = lifeData.profile ?? {};
  const person = profile.person ?? {};
  const ending = lifeData.ending ?? {};
  const mainline = lifeData.mainline?.ending ?? {};
  const seed = lifeData.seed ?? "people-life";

  // 1. 宣纸背景与外框
  ctx.fillStyle = "#edf4f1";
  ctx.fillRect(0, 0, width, height);

  // 柔和暗角微底纹
  const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
  bgGradient.addColorStop(0, "rgba(223, 234, 229, 0.95)");
  bgGradient.addColorStop(0.5, "rgba(237, 244, 241, 0.98)");
  bgGradient.addColorStop(1, "rgba(216, 229, 224, 0.95)");
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  // 古典外边框与内描线
  ctx.strokeStyle = "#c1d3cd";
  ctx.lineWidth = 4;
  roundRect(ctx, 24, 24, width - 48, height - 48, 20);
  ctx.stroke();

  ctx.strokeStyle = "rgba(212, 82, 54, 0.35)";
  ctx.lineWidth = 1.5;
  roundRect(ctx, 32, 32, width - 64, height - 64, 16);
  ctx.stroke();

  // 2. 卷首标题与时代印章
  ctx.textAlign = "center";
  ctx.fillStyle = "#d45236";
  ctx.font = "800 16px -apple-system, sans-serif";
  ctx.fillText("改革开放时代 · 文字人生模拟", width / 2, 72);

  ctx.fillStyle = "#11282e";
  ctx.font = "900 38px 'Noto Serif SC', 'Songti SC', serif";
  ctx.fillText("《1978 — 一生》个人轨迹", width / 2, 120);

  ctx.fillStyle = "#5e747a";
  ctx.font = "600 15px -apple-system, sans-serif";
  ctx.fillText(`档案种子：${seed} · 时代观测校准`, width / 2, 148);

  // 3. 人物生平卡片（基本信息）
  ctx.fillStyle = "#fbfdfc";
  roundRect(ctx, 50, 175, width - 100, 150, 16);
  ctx.fill();
  ctx.strokeStyle = "rgba(193, 211, 205, 0.5)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.fillStyle = "#11282e";
  ctx.font = "800 24px -apple-system, sans-serif";
  const birthYear = person.birthYear ?? 1978;
  const deathYear = ending.calendarYear ?? (birthYear + (ending.age ?? 70));
  const ageAtDeath = ending.age ?? (deathYear - birthYear);
  ctx.fillText(`享年 ${ageAtDeath} 岁 （${birthYear} — ${deathYear}年）`, 76, 218);

  ctx.fillStyle = "#28444c";
  ctx.font = "500 15px -apple-system, sans-serif";
  const residenceText = profile.residence === "urban" ? "城镇家庭" : "农村家庭";
  const jobSummary = review.highestCompletedEducation 
    ? `最高学历：${review.highestCompletedEducation} · 工龄：${review.jobYears ?? 0}年`
    : `出身：${residenceText}`;
  ctx.fillText(jobSummary, 76, 252);
  ctx.fillText(`归宿评述：${ending.reason ?? ending.summary ?? "走完了充满时代印记的一生"}`, 76, 284);

  // 4. 终局红泥印章
  ctx.save();
  ctx.translate(width - 145, 235);
  ctx.rotate(-0.06);
  ctx.strokeStyle = "#d45236";
  ctx.lineWidth = 3;
  ctx.fillStyle = "rgba(212, 82, 54, 0.08)";
  roundRect(ctx, -38, -38, 76, 76, 10);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#d45236";
  ctx.font = "900 20px 'Noto Serif SC', serif";
  ctx.textAlign = "center";
  ctx.fillText("不虚", 0, -6);
  ctx.fillText("此行", 0, 22);
  ctx.restore();

  // 5. 一生主线课题与成为的样子
  let startY = 350;
  ctx.fillStyle = "#fdfaf3";
  roundRect(ctx, 50, startY, width - 100, 160, 16);
  ctx.fill();
  ctx.strokeStyle = "rgba(220, 156, 53, 0.4)";
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.fillStyle = "#dc9c35";
  ctx.font = "800 13px -apple-system, sans-serif";
  ctx.fillText("人生主线 · 时代足迹", 76, startY + 32);

  ctx.fillStyle = "#11282e";
  ctx.font = "800 20px 'Noto Serif SC', serif";
  ctx.fillText(mainline.title ?? "守住与改变的一生", 76, startY + 62);

  ctx.fillStyle = "#28444c";
  ctx.font = "500 14px -apple-system, sans-serif";
  const becameText = mainline.became ? `${mainline.became}${mainline.summary ?? ""}` : "在具体的劳动、家庭与时代浪潮中，走出了属于自己的路。";
  drawWrappedText(ctx, becameText, 76, startY + 92, width - 152, 22);

  // 6. 五维终局属性仪表
  startY = 530;
  ctx.fillStyle = "#fbfdfc";
  roundRect(ctx, 50, startY, width - 100, 140, 16);
  ctx.fill();
  ctx.strokeStyle = "rgba(193, 211, 205, 0.5)";
  ctx.stroke();

  ctx.fillStyle = "#11282e";
  ctx.font = "800 16px -apple-system, sans-serif";
  ctx.fillText("五维终局结语", 76, startY + 34);

  const stats = review.finalStats ?? {};
  const statItems = [
    { label: "健康", val: stats.health ?? 60, color: "#256a5e" },
    { label: "财富", val: stats.wealth ?? 50, color: "#dc9c35" },
    { label: "心情", val: stats.mood ?? 65, color: "#d45236" },
    { label: "能力", val: stats.ability ?? 55, color: "#6a4f9a" },
    { label: "关系", val: stats.relationships ?? 60, color: "#28444c" },
  ];

  const colWidth = (width - 152) / 5;
  statItems.forEach((item, index) => {
    const colX = 76 + index * colWidth;
    ctx.fillStyle = "#5e747a";
    ctx.font = "600 13px -apple-system, sans-serif";
    ctx.fillText(item.label, colX, startY + 68);

    ctx.fillStyle = item.color;
    ctx.font = "900 22px -apple-system, sans-serif";
    ctx.fillText(String(item.val), colX, startY + 98);

    // 进度微条
    ctx.fillStyle = "#d8e5e0";
    roundRect(ctx, colX, startY + 110, colWidth - 16, 6, 3);
    ctx.fill();
    ctx.fillStyle = item.color;
    roundRect(ctx, colX, startY + 110, ((colWidth - 16) * Math.min(100, Math.max(0, item.val))) / 100, 6, 3);
    ctx.fill();
  });

  // 7. 那一生没有走过的路 (Untraveled Paths)
  startY = 690;
  ctx.fillStyle = "#fbfdfc";
  roundRect(ctx, 50, startY, width - 100, 480, 16);
  ctx.fill();
  ctx.strokeStyle = "rgba(193, 211, 205, 0.5)";
  ctx.stroke();

  ctx.fillStyle = "#d45236";
  ctx.font = "800 14px -apple-system, sans-serif";
  ctx.fillText("未走过的历程 · 另一条路", 76, startY + 36);

  ctx.fillStyle = "#5e747a";
  ctx.font = "500 13px -apple-system, sans-serif";
  ctx.fillText("如果当时做了不同的选择，人生或许会在这些岔口转向：", 76, startY + 60);

  const untraveled = (review.untraveledPaths ?? []).slice(0, 6);
  if (untraveled.length === 0) {
    ctx.fillStyle = "#5e747a";
    ctx.font = "14px -apple-system, sans-serif";
    ctx.fillText("这一生坚定地走完了所有最初的选择。", 76, startY + 100);
  } else {
    let itemY = startY + 94;
    untraveled.forEach((path, idx) => {
      ctx.fillStyle = "#f0f5f2";
      roundRect(ctx, 76, itemY - 18, width - 152, 52, 8);
      ctx.fill();
      ctx.strokeStyle = "rgba(193, 211, 205, 0.4)";
      ctx.stroke();

      ctx.fillStyle = "#d45236";
      ctx.font = "800 12px -apple-system, sans-serif";
      ctx.fillText(`${path.decisionAge ?? 0}岁`, 92, itemY + 4);

      ctx.fillStyle = "#11282e";
      ctx.font = "600 13px -apple-system, sans-serif";
      const label = path.unchosen?.label ?? path.unchosen?.id ?? "另一条未选道路";
      ctx.fillText(label, 140, itemY + 4);

      ctx.fillStyle = "#5e747a";
      ctx.font = "500 11px -apple-system, sans-serif";
      ctx.fillText(`年份：${path.decisionYear ?? "未知"} · 阶段：${path.stage ?? "成长"}`, 140, itemY + 22);

      itemY += 60;
    });
  }

  // 8. 底部防伪印记与分享二维码口令区
  startY = 1190;
  ctx.textAlign = "center";
  ctx.fillStyle = "#5e747a";
  ctx.font = "600 13px -apple-system, sans-serif";
  ctx.fillText("长按保存图片 · 分享你走过的这一生", width / 2, startY + 20);

  ctx.fillStyle = "rgba(10, 47, 54, 0.08)";
  roundRect(ctx, 160, startY + 38, width - 320, 48, 12);
  ctx.fill();

  ctx.fillStyle = "#11282e";
  ctx.font = "800 14px -apple-system, sans-serif";
  ctx.fillText(`《人生轨迹》游戏种子：${seed}`, width / 2, startY + 68);

  return canvas.toDataURL("image/png");
}
