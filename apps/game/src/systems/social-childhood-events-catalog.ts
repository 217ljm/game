import type { LifeEventDefinition, VintageAsset } from "./life-event-types";

/**
 * 【突发社交与童年奇遇代理】专职模块
 * 专职负责同伴社交、童年经典游戏（红白机、水浒卡、弹珠、皮筋）、秘密基地等突发事件库与老物件
 */

export const SOCIAL_CHILDHOOD_VINTAGE_ASSETS: Record<string, VintageAsset> = {
  rare_shuihu_linchong: {
    id: "rare_shuihu_linchong",
    name: "限量镭射闪卡·天雄星豹子头林冲",
    icon: "🎴",
    category: "toy",
    yearAcquired: 1989,
    description: "干脆面里千载难逢抽出的顶级闪卡，枪挑山神庙全息镭射金光夺目，整个年级无人不膜拜",
    bonusText: "魅力 +12 · 快乐 +10 · 大院孩子王声望",
  },
  cat_eye_marbles_bag: {
    id: "cat_eye_marbles_bag",
    name: "纯棉碎花布袋装满彩色猫眼弹珠",
    icon: "🔮",
    category: "toy",
    yearAcquired: 1983,
    description: "战利品满载的小布兜，装着五十多颗晶莹剔透、内嵌各色旋涡花纹的玻璃弹珠，大院战神的荣耀徽章",
    bonusText: "健康 +6 · 智力 +4 · 专注力 +4",
  },
  famicom_fc_controller: {
    id: "famicom_fc_controller",
    name: "小霸王中英文电脑学习机手柄",
    icon: "🎮",
    category: "appliance",
    yearAcquired: 1991,
    description: "以‘学五笔打字’为由央求买下的小霸王红白机，插上黄卡魂斗罗借机上上下下左右左右BA",
    bonusText: "智力 +10 · 反应速度 +8 · 极客童年",
  },
  meizu_mp3_player_2003: {
    id: "meizu_mp3_player_2003",
    name: "2003魅族经典蓝色背光MP3随身听与入耳耳机",
    icon: "🎵",
    category: "appliance",
    yearAcquired: 2003,
    description: "铝合金磨砂外壳与幽蓝背光的256MB数字随身听，塞满了周杰伦王力宏流行金曲，华语乐坛黄金时代的随身音符",
    bonusText: "魅力 +14 · 快乐 +12 · 流行先锋韵律",
  },
  canon_dslr_camera_2004: {
    id: "canon_dslr_camera_2004",
    name: "佳能EOS数码单反相机与红圈变焦镜头",
    icon: "📷",
    category: "appliance",
    yearAcquired: 2004,
    description: "黑沉沉的专业数码单反机身与红圈变焦镜头，周末穿梭胡同弄堂与现代都市采风，定格世纪之初的人间万象光影",
    bonusText: "智力 +16 · 魅力 +14 · 影像艺术审美品味",
  },
  ten_year_classmate_photo_album_2005: {
    id: "ten_year_classmate_photo_album_2005",
    name: "中学毕业十周年烫金精装同学录与全班大合影",
    icon: "📖",
    category: "commemoration",
    yearAcquired: 2005,
    description: "红丝绒烫金封面的毕业十载重聚纪念册，记载着同窗各自成家立业、褪去青涩走向成熟的人生轨迹与纯真羁绊",
    bonusText: "同窗情谊 +20 · 魅力 +12 · 岁月沉淀感怀",
  },
  sina_blog_featured_blogger_medal_2006: {
    id: "sina_blog_featured_blogger_medal_2006",
    name: "2006新浪博客首页推荐专栏作者金色认证印记",
    icon: "💻",
    category: "commemoration",
    yearAcquired: 2006,
    description: "博客元年撰写的数十篇深度行业洞察与时代随笔荣登新浪首页推荐，收获百万点击与无数网络拥趸的心灵共鸣",
    bonusText: "智力 +18 · 魅力 +16 · 思想领航声望",
  },
  outdoor_team_building_flag_2007: {
    id: "outdoor_team_building_flag_2007",
    name: "莫干山企业野外拓展军事训练优胜雄鹰战旗",
    icon: "🧗",
    category: "commemoration",
    yearAcquired: 2007,
    description: "带领数十人部门团队突破极限攀越八米高台后荣获的团队总冠军锦旗，见证铁血凝聚力与从容领袖风范",
    bonusText: "魅力 +20 · 健康 +12 · 卓越团队领袖",
  },
  mobile_app_million_users_trophy_2012: {
    id: "mobile_app_million_users_trophy_2012",
    name: "2012移动互联网破百万日活App先锋水晶奖杯",
    icon: "🏆",
    category: "commemoration",
    yearAcquired: 2012,
    description: "移动互联百团大战中研发的爆款手机App日活跃突破百万的定制水晶奖杯，凝聚着无数通宵达旦代码冲锋的极客荣光",
    bonusText: "智力 +20 · 魅力 +18 · 互联先锋声望",
  },
  angel_round_investment_agreement_2014: {
    id: "angel_round_investment_agreement_2014",
    name: "2014中关村车库咖啡天使轮风投协议真皮封本",
    icon: "💼",
    category: "commemoration",
    yearAcquired: 2014,
    description: "创业大街车库咖啡内与顶尖天使投资机构当场签署的千万级投资协议，见证大众创业万众创新的激昂岁月",
    bonusText: "财富声望 +22 · 智力 +18 · 资本青睐光环",
  },
  alumni_scholarship_fund_plaque_2015: {
    id: "alumni_scholarship_fund_plaque_2015",
    name: "高中毕业二十周年母校校友励志奖学金黄铜铭牌",
    icon: "🏫",
    category: "commemoration",
    yearAcquired: 2015,
    description: "毕业二十周年重返母校设立的百万元寒门学子励志奖学金定制铜牌，感恩师恩反哺桑梓，深受学弟学妹景仰",
    bonusText: "魅力 +24 · 快乐 +20 · 桑梓流芳美誉",
  },
  knowledge_influencer_golden_microphone_2017: {
    id: "knowledge_influencer_golden_microphone_2017",
    name: "2017知识付费音频大咖专栏主讲人金色麦克风",
    icon: "🎙️",
    category: "appliance",
    yearAcquired: 2017,
    description: "头部知识音频平台破千万播放量商业实战专栏特颁的镀金电容麦克风，见证终身学习浪潮下的知识赋能影响力",
    bonusText: "魅力 +22 · 智力 +20 · 行业传道声量",
  },
  national_invention_patent_certificate_2018: {
    id: "national_invention_patent_certificate_2018",
    name: "国家知识产权局首批重大核心发明专利证书红本",
    icon: "📜",
    category: "commemoration",
    yearAcquired: 2018,
    description: "历时数年自主研发攻克关键‘卡脖子’底层算法并获授权的国家发明专利证书红本，代表科技自立自强的卓越硬实力",
    bonusText: "智力 +24 · 权威认可 +20 · 核心科技壁垒",
  },
};

export const SOCIAL_CHILDHOOD_EVENTS_DATABASE: LifeEventDefinition[] = [
  {
    id: "social_card_slap_clash_1984",
    category: "emergent",
    minAge: 5,
    maxAge: 10,
    weight: 95,
    title: "🃏 大院红砖地掌风呼啸 · 拍画片争霸战",
    icon: "🃏",
    narrative:
      "阳光正好的下午，红砖地上围了七八个大院孩童。王小军咬着牙，把心爱的一张《西游记》齐天大圣画片压在中央，挑衅地冲你挑眉：“建国！敢不敢跟我来把大的？输了可不许找你妈哭鼻子！”围观的小伙伴们纷纷起哄：“拍！拍！拍！”四周空气瞬间凝固，你的掌心微微发烫，耳边似乎响起了冲锋的号角。",
    options: [
      {
        label: "【狂风暴雨下掌】扎稳马步，五指微扣成空心掌，以雷霆万钧之势拍击地面",
        hint: "全力以赴对决，直接开启拍画片实机小游戏或判定",
        resultDesc: "狂暴的掌风掀起一阵尘土，整张画片在空中凌空翻了个三百六十度稳稳底朝天！全场欢声雷动，王小军彻底心服口服！",
        effect: {
          happiness: 12,
          charm: 8,
          health: 4,
          affinityTarget: "friend_xiaojun",
          affinityDelta: 6,
        },
      },
      {
        label: "【冷静博弈】观察风向与地砖缝隙，巧妙从侧翼借巧劲掀动边角",
        hint: "动脑用技巧，以巧破千斤",
        resultDesc: "看似轻柔的一巴掌借着砖缝的气流轻轻一挑，画片轻盈翻面，小伙伴们惊叹你的精湛手艺！",
        effect: {
          intelligence: 6,
          happiness: 8,
          charm: 6,
        },
      },
      {
        label: "【讲和分享】不搞胜负单打独斗，提出把画片放在一起大家轮流玩耍拍击",
        hint: "团结大院集体，收获至高同伴信赖",
        resultDesc: "整个下午大院里满是欢声笑语，没有输赢的沮丧，只有无忧无虑的童年烂漫。",
        effect: {
          charm: 10,
          happiness: 8,
          affinityTarget: "friend_xiaojun",
          affinityDelta: 10,
        },
      },
    ],
  },
  {
    id: "social_rare_shuihu_unboxing_1989",
    category: "emergent",
    minAge: 7,
    maxAge: 13,
    weight: 90,
    title: "✨ 撕开小浣熊包装袋的一瞬 · 豹子头林冲降世！",
    icon: "🎴",
    narrative:
      "放学铃刚响，供销社校门口的小卖部挤得水泄不通。你用攒了两天的零花钱买下一包脆脆面，小心翼翼撕开铝箔包装的一角。一道耀眼的金色镭射光芒瞬间闪过你的眼眸——那是一张带有凸起浮雕纹路的限定烫金卡，赫然印着：天雄星·豹子头·林冲！身旁眼尖的同学顿时倒吸一口凉气，尖叫声响彻整条胡同：“我靠！！他抽到了林冲！！！”瞬时间数十个同学潮水般将你团团围住。",
    options: [
      {
        label: "【珍藏锁入铁盒】在众星捧月中高高举起闪卡，随后郑重将其收入贴身书包",
        hint: "确立年级霸主地位，解锁传奇水浒老物件",
        resultDesc: "你成了全校公认的欧皇战神，甚至隔壁班同学排着队拿五根老冰棍只为看上一眼这尊林教头！",
        effect: {
          charm: 15,
          happiness: 12,
          unlockAssetId: "rare_shuihu_linchong",
        },
      },
      {
        label: "【仗义交换】发小王小军眼馋得快要流口水，你答应以一张林冲换他十张普通卡和一根红果雪糕",
        hint: "兼顾收藏与至交情谊，卡册瞬间丰富",
        resultDesc: "王小军感动得当场认你当一辈子好大哥，你的集卡册也一口气补全了整整一个阵营！",
        effect: {
          happiness: 10,
          charm: 8,
          affinityTarget: "friend_xiaojun",
          affinityDelta: 15,
        },
      },
    ],
  },
  {
    id: "social_neighborhood_tv_watching_1986",
    category: "emergent",
    minAge: 6,
    maxAge: 12,
    weight: 80,
    title: "📺 二叔家搬来黑白大电视 · 挤满小屋的《西游记》",
    icon: "📺",
    narrative:
      "大院二叔家买回了一台14寸牡丹牌黑白电视机，上面还罩着一条精美的钩针白蕾丝布。星期天傍晚中央一套开播《西游记》，屋里屋外的门槛上、小马扎上坐满了大人小孩。天线需要一个人在阳台上不停调整角度，屋里有人喊：“清晰了！别动！”屏幕里孙悟空一个筋斗云翻上九重天，伴随着“丢丢丢”的电子乐前奏，满屋子小孩兴奋得直拍巴掌。",
    options: [
      {
        label: "【主动去阳台扶天线】让大家看得清楚，自己迎风吹晚风扶着天线杆",
        hint: "无私奉献，赢得满大院叔伯长辈赞许",
        resultDesc: "二叔特地给你抓了满满一大把炒花生米，夸你小小年纪懂得体谅大家，真懂事！",
        effect: {
          charm: 10,
          health: 4,
          happiness: 6,
        },
      },
      {
        label: "【挤在最前面入神观看】端着自己的小木凳坐在正中间，眼睛一眨不眨",
        hint: "享受童年神剧视听盛宴，丰富奇幻想象",
        resultDesc: "大闹天宫的绚烂画面深深刻在你的脑海里，连续好几天做梦都在跟妖怪大战三百回合！",
        effect: {
          happiness: 12,
          intelligence: 6,
        },
      },
    ],
  },
  // ====================================================
  // 25~30岁 (2003~2008年) 青年突发社交与职场奇遇事件
  // ====================================================
  {
    id: "em_jaychou_mp3_music_wave_2003",
    category: "emergent",
    minAge: 25,
    maxAge: 30,
    weight: 85,
    title: "🎵 魅族MP3随身听流行与周杰伦华语流行乐巅峰狂潮",
    icon: "🎵",
    narrative:
      "2003年盛夏，周杰伦新专辑《叶惠美》横空出世，《晴天》《以父之名》《三年二班》在大街小巷每家音像店循环轰炸！你用省下的兼职奖金购置了一台铝合金外壳、幽蓝背光的魅族MP3播放器。256MB容量塞满了精心挑选的128Kbps高音质音乐。戴上入耳式耳机，漫步在梧桐树下的夏夜长街，耳边流淌着前卫灵动的旋律，青春的热血与桀骜在音符中澎湃回响。",
    options: [
      {
        label: "【深度乐评达人】在校友BBS与西祠胡同音乐版块撰写万字深度乐评，成为明星版主",
        hint: "流行前沿 · 解锁魅族MP3老物件",
        resultDesc: "你的深度解析引来数万网友跟帖热议，犀利独特的文字风格令你在青年文化圈声名大噪！",
        effect: {
          charm: 16,
          intelligence: 12,
          happiness: 14,
          unlockAssetId: "meizu_mp3_player_2003",
        },
      },
      {
        label: "【文艺骨干登台】在单位迎新晚会上抱着吉他压轴弹唱《晴天》，点燃全场青春大合唱",
        hint: "才华横溢 · 魅力狂飙",
        resultDesc: "全场青年员工挥舞荧光棒自发合唱，掌声经久不息，你成了全集团公认最有才情的文艺新星！",
        effect: {
          charm: 18,
          happiness: 16,
          health: 6,
          unlockAssetId: "meizu_mp3_player_2003",
        },
      },
    ],
  },
  {
    id: "em_digital_slr_camera_photography_2004",
    category: "emergent",
    minAge: 25,
    maxAge: 30,
    weight: 80,
    title: "📷 佳能数码单反相机流行与周末户外摄影采风潮",
    icon: "📷",
    narrative:
      "数码暗房技术掀起摄影革命，厚重的胶卷暗盒悄然隐退。你咬牙添置了一台黑色专业机身的佳能EOS数码单反相机与红圈变焦镜头。清晨五点，你背着厚实的摄影双肩包，穿行在被晨曦笼罩的老城区胡同与拔地而起的高铁桥墩下。快门清脆的咔嚓声中，晨光中的市井炊烟、大爷下象棋的专注面孔与现代都市的钢筋铁骨被一一精准定格在CF高速存储卡中。",
    options: [
      {
        label: "【记录时代变迁】潜心拍摄《城市记忆·老街坊新容颜》纪实组照并在省展斩获银奖",
        hint: "艺术造诣 · 解锁数码单反老物件",
        resultDesc: "深厚的人文关怀与卓越的光影把控打动了评审团，作品被省市文化馆永久典藏，艺术影响力卓著！",
        effect: {
          intelligence: 16,
          charm: 18,
          happiness: 16,
          unlockAssetId: "canon_dslr_camera_2004",
        },
      },
      {
        label: "【担任重大外事特约】受邀担任集团跨国峰会与庆典首席主摄影师，交出完美大片",
        hint: "职场赋能 · 声望飙升",
        resultDesc: "你的大片登上了各大主流媒体头版，集团高层高度赞扬你的全面素养，为你未来的跨部门升迁铺平道路！",
        effect: {
          charm: 20,
          intelligence: 14,
          happiness: 14,
          cash: 2000,
          unlockAssetId: "canon_dslr_camera_2004",
        },
      },
    ],
  },
  {
    id: "em_ten_year_classmate_reunion_2005",
    category: "emergent",
    minAge: 25,
    maxAge: 30,
    weight: 85,
    title: "🥂 中学毕业十周年师生聚会 · 抚今追昔感慨岁月如梭",
    icon: "🥂",
    narrative:
      "毕业整整十个春秋，天南海北的昔日同窗重聚在老校区旁的宴会大厅。当年梳着马尾辫的青涩班花如今已是干练的外企高管，调皮捣蛋的发小王小军如今下海经商成了大车队老总，白发苍苍的老班主任坐在主桌笑意盈盈。大屏幕上滚动播放着泛黄的毕业黑白照，十年的奋斗艰辛与青葱回忆在此刻化作一杯杯琥珀色的浓烈醇酒，甘洌动容。",
    options: [
      {
        label: "【真情反哺恩师】作为核心召集人热情张罗全场，带头为老恩师敬酒并赠送健康按摩椅",
        hint: "尊师重道 · 解锁烫金纪念同学录",
        resultDesc: "全场响起雷鸣般的掌声，老恩师热泪盈眶直夸你是最有出息也最有良心的好学生，同窗友谊升华！",
        effect: {
          charm: 20,
          happiness: 22,
          affinityTarget: "friend_xiaojun",
          affinityDelta: 20,
          cash: -1000,
          unlockAssetId: "ten_year_classmate_photo_album_2005",
        },
      },
      {
        label: "【阳台促膝长谈】与挚友发小在走廊夜风中倾心畅谈十年沉浮，相约下一个十年顶峰相见",
        hint: "肝胆相照 · 知音深交",
        resultDesc: "剥开成年人的客套与防备，最纯粹的少年意气在夜风中再次被点燃，彼此成为商海职场上最坚不可摧的同盟伙伴！",
        effect: {
          intelligence: 16,
          charm: 16,
          happiness: 18,
          affinityTarget: "friend_xiaojun",
          affinityDelta: 25,
          unlockAssetId: "ten_year_classmate_photo_album_2005",
        },
      },
    ],
  },
  {
    id: "em_blog_personal_space_trend_2006",
    category: "emergent",
    minAge: 25,
    maxAge: 30,
    weight: 80,
    title: "💻 新浪博客与QQ空间日记风靡 · 执笔记录时代风云与心灵感悟",
    icon: "💻",
    narrative:
      "2006年中国互联网迎来如火如荼的“博客元年”，草根日记与思想火花在网络世界星火燎原。你在键盘上敲打着代码与文字，开通了个人专属新浪博客与QQ空间。深夜台灯下，一杯热咖啡、指尖敲击键盘的清脆声响，你将对行业转型的前瞻洞察、对民生百态的冷暖思考凝聚成一篇篇深度美文，在互联网浪潮中激荡起属于自己的思想回响。",
    options: [
      {
        label: "【行业思想领袖】笔耕不辍撰写商业科技与时代纵横专栏，多篇文章荣登新浪头条推荐",
        hint: "思想启蒙 · 解锁名博作者印记",
        resultDesc: "博客访问量突破百万大关，多家权威财经杂志向你发来特约专栏作家邀请，社会声望与话语权水涨船高！",
        effect: {
          intelligence: 20,
          charm: 18,
          happiness: 16,
          unlockAssetId: "sina_blog_featured_blogger_medal_2006",
        },
      },
      {
        label: "【温情心灵随笔】用细腻生动的笔触记录家庭温情、小城变迁与成长心路，结集印成文集",
        hint: "人文底蕴 · 心灵滋润",
        resultDesc: "真挚的文字抚慰了无数读者的焦虑心灵，家庭亲友传阅珍藏，你在字里行间收获了内心的从容自洽与宁静！",
        effect: {
          charm: 16,
          happiness: 22,
          health: 8,
          unlockAssetId: "sina_blog_featured_blogger_medal_2006",
        },
      },
    ],
  },
  {
    id: "em_corporate_team_building_leadership_2007",
    category: "emergent",
    minAge: 25,
    maxAge: 30,
    weight: 85,
    title: "🧗 率领数十人团队赴莫干山户外拓展培训与团建大捷",
    icon: "🧗",
    narrative:
      "初秋清晨，你带领部门数十名核心骨干奔赴莫干山野外拓展基地。面对八米高空的‘断桥飞跃’与四米无保护‘毕业求生墙’，年轻的新员工双腿颤抖、心存畏惧。作为团队领头羊，你毫不犹豫穿上安全绳首个登上高空平台，深吸一口气纵身一跃稳稳跨过裂隙，并在求生墙下主动蹲下身躯甘当第一块人肉人梯，肩膀被踩出道道血印却坚如磐石！",
    options: [
      {
        label: "【身先士卒领袖风范】一马当先攻克全部极限难关，带领全员以全优战绩夺取总冠军战旗",
        hint: "领袖魅力 · 解锁拓展总冠军战旗",
        resultDesc: "全体队员被你的担当与血性彻底折服，全队抱头痛哭高呼口号，一支坚不可摧、所向披靡的铁血铁军就此锻造而成！",
        effect: {
          charm: 22,
          health: 12,
          happiness: 20,
          unlockAssetId: "outdoor_team_building_flag_2007",
        },
      },
      {
        label: "【篝火夜话攻心】深夜围坐篝火旁推心置腹倾听下属职业困惑，制定个性化成长扶持路线",
        hint: "润物无声 · 威望深植",
        resultDesc: "下属们视你为人生导师与坚实后盾，团队离职率常年为零，凝聚力在全行业传为佳话！",
        effect: {
          intelligence: 18,
          charm: 20,
          happiness: 22,
          unlockAssetId: "outdoor_team_building_flag_2007",
        },
      },
    ],
  },
  {
    id: "em_mobile_internet_startup_wave_2012",
    category: "emergent",
    minAge: 31,
    maxAge: 35,
    weight: 90,
    title: "📱 移动互联百团大战与爆款手机App冲上应用商店榜首",
    icon: "📱",
    narrative:
      "2012年，3G/4G网络交替，移动互联迎来史无前例的创业大浪潮。你敏锐捕捉到都市白领的生活痛点，带领由几名前沿极客组成的项目组，在租来的简陋民房里没日没夜封闭攻关两百天。版本上线的那个深夜，数据后台的日活折线图几乎呈90度直角狂飙破百万，一举冲进苹果与安卓应用商店免费榜前三甲，各大科技媒体争相头条报道！",
    options: [
      {
        label: "【极客冲锋精益打磨】连夜组织服务器扩容与架构优化，通宵守候确保用户体验丝滑流畅",
        hint: "极客精神 · 解锁百万日活奖杯",
        resultDesc: "系统承受住了亿级流量洪峰的极限冲击，产品口碑炸裂，你在移动互联行业声名鹊起！",
        effect: {
          intelligence: 24,
          charm: 20,
          happiness: 22,
          unlockAssetId: "mobile_app_million_users_trophy_2012",
        },
      },
      {
        label: "【狂欢庆功重奖功臣】包下五星级酒店空中酒吧举办全员庆功宴，兑现项目组巨额期权与奖金",
        hint: "同甘共苦 · 铁血凝聚",
        resultDesc: "核心团队誓死追随，全员士气如虹，你被团队尊称为‘最具格局与感染力的一级船长’！",
        effect: {
          charm: 24,
          happiness: 26,
          cash: -10000,
          unlockAssetId: "mobile_app_million_users_trophy_2012",
        },
      },
    ],
  },
  {
    id: "em_angel_investment_roadshow_2014",
    category: "emergent",
    minAge: 32,
    maxAge: 37,
    weight: 95,
    title: "💼 中关村车库咖啡路演演讲技惊四座斩获千万级天使轮风投",
    icon: "💼",
    narrative:
      "2014年春，北京中关村创业大街游人如织，车库咖啡里弥漫着咖啡香与梦想的温度。受邀登上路演舞台的你，一身笔挺正装，手持翻页笔，用十五分钟跌宕起伏的数据剖析与宏大商业闭环构想彻底征服了台下正襟危坐的几十位顶尖风投大佬。演讲刚一结束，三家一线红杉与高瓴合伙人快步走上台前当场敲定千万级天使轮TS投资意向书！",
    options: [
      {
        label: "【严选战投赋能产业】冷静权衡各家资方的行业生态资源，敲定最懂业务的顶级产业资本",
        hint: "运筹帷幄 · 解锁天使轮协议",
        resultDesc: "不仅获得了充裕的真金白银弹药，更直接嫁接了顶层产业生态链资源，企业估值瞬间飙升！",
        effect: {
          intelligence: 24,
          charm: 22,
          happiness: 24,
          cash: 30000,
          unlockAssetId: "angel_round_investment_agreement_2014",
        },
      },
      {
        label: "【坚守初心严控股权】据理力争保持管理层绝对话语权与控股权，坚决捍卫团队长远决策主导",
        hint: "定力如山 · 领袖担当",
        resultDesc: "资方对你的定力与战略清醒肃然起敬，主动在估值上做出极大让步，企业根基坚实如磐！",
        effect: {
          charm: 25,
          intelligence: 22,
          happiness: 22,
          unlockAssetId: "angel_round_investment_agreement_2014",
        },
      },
    ],
  },
  {
    id: "em_twenty_year_classmate_grand_reunion_2015",
    category: "emergent",
    minAge: 35,
    maxAge: 38,
    weight: 90,
    title: "🏫 高中毕业二十周年重聚母校设立寒门学子励志奖学金",
    icon: "🏫",
    narrative:
      "母校百年校庆之际，恰逢高中毕业二十周年整。当年的青葱少年如今皆已为人父母、各行骨干。在熟悉的林荫道与老教学楼前，大家紧紧相拥、热泪盈眶。得知母校部分山区贫困学子仍面临生活难关，步入不惑前夕的你带头发起倡议，联合昔日同窗共同出资设立了首期百万元‘同窗励志奖学金’，资助品学兼优的寒门学弟学妹完成学业。",
    options: [
      {
        label: "【慷慨解囊德润桑梓】带头捐资建立长效助学基金，并在全校开学大典上发表励志演讲",
        hint: "大爱反哺 · 解锁校友奖学金铜牌",
        resultDesc: "全校千名师生起立鼓掌致敬，老校长紧紧握着你的手连声赞叹，你的名字被镌刻在母校校史馆荣誉墙上！",
        effect: {
          charm: 26,
          happiness: 26,
          cash: -15000,
          affinityTarget: "father",
          affinityDelta: 16,
          affinityDeltaSecond: 16,
          unlockAssetId: "alumni_scholarship_fund_plaque_2015",
        },
      },
      {
        label: "【校企合作实训共建】为母校捐建现代化计算机与科学实验室，打通高中到大学产学研直通车",
        hint: "赋能未来 · 桃李芬芳",
        resultDesc: "实验室成为省重点科创示范基地，培养出一批批全国奥赛金牌少年，你成为了全校后辈的偶像！",
        effect: {
          intelligence: 22,
          charm: 24,
          happiness: 24,
          cash: -20000,
          unlockAssetId: "alumni_scholarship_fund_plaque_2015",
        },
      },
    ],
  },
  {
    id: "em_knowledge_sharing_podcast_webinar_2017",
    category: "emergent",
    minAge: 36,
    maxAge: 40,
    weight: 90,
    title: "🎙️ 知识付费音频专栏爆火与万千职场青年导师引路人",
    icon: "🎙️",
    narrative:
      "2017年知识付费进入爆发期，许多初入社会的年轻人对职业晋升与认知突破充满迷茫。受顶尖知识音频平台力邀，你将自身近二十载摸爬滚打积累的底层逻辑与商业认知提炼成系统化的《中年破局与商业实战30讲》。凭借纯干货、无废话、直击本质的深度剖析，专栏一经上线订阅量破十万，累计播放量数千万次，成为全网现象级年度爆款专栏！",
    options: [
      {
        label: "【匠心打磨倾囊相授】每周开设线上互动答疑直播，无私为数十万求知青年指引人生航向",
        hint: "传道受业 · 解锁知识主播金话筒",
        resultDesc: "海量读者在评论区写下长文致谢，专栏荣获年度最具影响力知识IP大奖，你的思想声浪响彻全国！",
        effect: {
          charm: 26,
          intelligence: 24,
          happiness: 24,
          cash: 25000,
          unlockAssetId: "knowledge_influencer_golden_microphone_2017",
        },
      },
      {
        label: "【出版重磅畅销专著】应国家级权威出版社之邀，将讲义扩充出版成畅销商业专著并在全国签售",
        hint: "著书立说 · 流芳百世",
        resultDesc: "新书连续数周高居各大电商畅销总榜第一，你在文化界与商业思想界奠定了无可撼动的导师地位！",
        effect: {
          intelligence: 26,
          charm: 24,
          happiness: 22,
          cash: 18000,
          unlockAssetId: "knowledge_influencer_golden_microphone_2017",
        },
      },
    ],
  },
  {
    id: "em_tech_patent_invention_breakthrough_2018",
    category: "emergent",
    minAge: 38,
    maxAge: 40,
    weight: 95,
    title: "📜 自主研发攻坚核心算法荣获国家重大核心发明专利",
    icon: "📜",
    narrative:
      "面对复杂严峻的国际技术封锁与关键核心技术的‘卡脖子’难题，步入不惑之年的你顶住巨大的研发周期与资金压力，带领核心攻关课题组扎根实验室一千多个日夜，推翻了数百种传统数学模型，终于在底层核心算法上取得历史性原始创新突破！国家知识产权局特批绿色通道，颁发了烫金的国家发明专利证书红本，实现全产业链自主可控！",
    options: [
      {
        label: "【产业落地科技报国】将专利成果全面转化为自主可控生产力，打破国际行业巨头垄断壁垒",
        hint: "大国重器 · 解锁发明专利证书",
        resultDesc: "行业关键卡脖子环节实现彻底国产化替代，多位国家级院士专家联名高度评价你的突出贡献！",
        effect: {
          intelligence: 28,
          charm: 22,
          happiness: 25,
          health: 10,
          unlockAssetId: "national_invention_patent_certificate_2018",
        },
      },
      {
        label: "【产研反哺培育英才】建立青年博士后创新联合工作站，将专利红利全额投入下一代基础科学研究",
        hint: "薪火相传 · 远见卓识",
        resultDesc: "一批批青年科学翘楚在你的培养下茁壮成长，课题组被授予‘国家自主创新先锋卓越标兵’！",
        effect: {
          intelligence: 25,
          charm: 25,
          happiness: 25,
          cash: 15000,
          unlockAssetId: "national_invention_patent_certificate_2018",
        },
      },
    ],
  },
];
