import OpenAI from 'openai';
import { z } from 'zod';
import { convertToHongKongTraditional } from './textConversion';

// 配置OpenRouter客户端
const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001",
    "X-Title": process.env.NEXT_PUBLIC_SITE_NAME || "JyutCollab",
  },
});

// 统一使用的模型
const DEFAULT_MODEL = "qwen/qwen3-235b-a22b-07-25";

// Zod 验证模式
const ThemeSchema = z.object({
  theme_id: z.number().min(60).max(498), // 三级主题ID范围
  explanation: z.string(),
  confidence: z.number().min(0).max(1),
});

const DefinitionSchema = z.object({
  definition: z.string(),
  usage_notes: z.string(),
  formality_level: z.enum(['formal', 'neutral', 'informal', 'slang', 'vulgar']).optional(),
  frequency: z.enum(['common', 'uncommon', 'rare', 'obsolete']).optional(),
});

const ExampleSchema = z.object({
  examples: z.array(z.object({
    sentence: z.string(),
    explanation: z.string(),
    scenario: z.string(),
  })),
});



// 主题分类功能 - 直接分类到三级主题
export async function categorizeExpression(
  expression: string, 
  context?: string,
  referenceExpressions?: Array<{
    text: string;
    definition?: string;
    usage_notes?: string;
    region: string;
  }>
): Promise<{
  theme_id: number;
  explanation: string;
  confidence: number;
}> {
  try {
    // 构建参考词条信息
    let referenceText = '';
    if (referenceExpressions && referenceExpressions.length > 0) {
      referenceText = `

**参考相关词条的主题分类**：
${referenceExpressions.map((ref, index) => `
${index + 1}. ${ref.text}: ${ref.definition || ''}
   (可作为分类参考，但请为当前表达选择最准确的分类)`).join('')}
`;
    }

    const themeList = `
【人物】
60: 一A1人稱、指代, 61: 一A2一般指稱、尊稱, 62: 一A3詈稱、貶稱
63: 一B1孩子、男孩子、青少年, 64: 一B2女孩子、女青年, 65: 一B3成年人、成年男性, 66: 一B4成年女性
67: 一C1父母輩, 68: 一C2祖輩、曾祖輩, 69: 一C3同輩, 70: 一C4後輩, 71: 一C5家人合稱, 72: 一C6其他
73: 一D1各種體形的人, 74: 一D2各種外貌的人, 75: 一D3各種身體狀況的人, 76: 一D4各種精神狀態的人, 77: 一D5其他
78: 一E1東家、雇工、顧客, 79: 一E2朋友、合作者、鄰里、情人、婚嫁人物, 80: 一E3能人、內行人、有權勢者
81: 一E4不幸者、尷尬者、生手, 82: 一E5鰥寡孤獨, 83: 一E6外地人、海外華人, 84: 一E7外國人, 85: 一E8其他
86: 一F1工人、機械人員, 87: 一F2農民, 88: 一F3軍人、員警兵士, 89: 一F4教育、文藝、體育界人員
90: 一F5商人、服務人員, 91: 一F6無正當職業者, 92: 一F7其他
93: 一G1好人, 94: 一G2聰明人、老成人, 95: 一G3各種性格的人, 96: 一G4愚笨的人、糊塗的人
97: 一G5蠻橫的人、難調教的人, 98: 一G6有各種不良習氣的人, 99: 一G7壞人、品質差的人, 100: 一G8其他

【自然界及場地】
101: 二A1日、月、星、雲, 102: 二A2地貌、水文、泥土、石頭, 103: 二A3氣象、氣候
104: 二A4灰塵、污跡、霧氣、氣味, 105: 二A5水、水泡、火、火灰, 106: 二A6其他
107: 二B1頭頸部, 108: 二B2五官、口腔、咽喉部, 109: 二B3軀體, 110: 二B4四肢
111: 二B5排泄物、分泌物, 112: 二B6其他
113: 二C1生與死, 114: 二C2年少、年老, 115: 二C3性交、懷孕、生育, 116: 二C4餓、飽、渴、饞
117: 二C5睏、睡、醉、醒, 118: 二C6呼吸, 119: 二C7感覺, 120: 二C8排泄
121: 二C9健康、力大、體弱、患病、痊癒, 122: 二C10症狀, 123: 二C11損傷、疤痕
124: 二C12體表疾患, 125: 二C13體內疾患, 126: 二C14精神病, 127: 二C15殘疾、生理缺陷, 128: 二C16其他
129: 二D1與動物有關的名物, 130: 二D2動物的動作和生理現象, 131: 二D3家畜、家禽、狗、貓
132: 二D4獸類、鼠類、野生食草動物, 133: 二D5鳥類, 134: 二D6蟲類, 135: 二D7爬行類
136: 二D8兩栖類, 137: 二D9淡水魚類, 138: 二D10海水魚類, 139: 二D11蝦、蟹
140: 二D12軟體動物、腔腸動物
141: 二E1與植物有關的名物和現象, 142: 二E2穀物, 143: 二E3水果、乾果, 144: 二E4莖葉類蔬菜
145: 二E5瓜類、豆類、茄果類食用植物, 146: 二E6塊莖類食用植物, 147: 二E7花、草、竹、樹, 148: 二E8其他

【物品用具】
149: 三A1衣、褲、裙, 150: 三A2其他衣物、鞋、帽, 151: 三A3衣物各部位及有關名稱, 152: 三A4床上用品
153: 三A5飾物、化妝品, 154: 三A6鐘錶、眼鏡、照相器材, 155: 三A7紙類
156: 三A8自行車及其零部件、有關用具, 157: 三A9衛生和清潔用品、用具
158: 三A10一般器皿、盛器、盛具, 159: 三A11廚具、食具、茶具, 160: 三A12燃具、燃料
161: 三A13傢俱及有關器物, 162: 三A14家用電器、音響設備, 163: 三A15用電設施、水暖設施
164: 三A16文具、書報, 165: 三A17通郵、電訊用品, 166: 三A18其他日用品, 167: 三A19娛樂品、玩具
168: 三A20喜慶用品, 169: 三A21喪葬品、祭奠品、喪葬場所, 170: 三A22菸、毒品
171: 三A23證明文件等, 172: 三A24貨幣, 173: 三A25住宅, 174: 三A26廢棄物
175: 三B1畜肉, 176: 三B2禽肉、水產品肉類, 177: 三B3米、素食的半製成品
178: 三B4葷食的半製成品, 179: 三B5飯食, 180: 三B6菜肴, 181: 三B7中式點心
182: 三B8西式點心, 183: 三B9調味品、食品添加劑, 184: 三B10飲料, 185: 三B11零食、小吃
186: 三C1一般工具, 187: 三C2金屬、塑膠、橡膠、石油製品, 188: 三C3機器及零件等, 189: 三C4其他
190: 三D1農副業、水利設施及用品, 191: 三D2車輛及其部件, 192: 三D3船隻及其部件、飛機
193: 三D4交通設施, 194: 三D5建築用具、材料及場所, 195: 三D6建築物及其構件
196: 三D7布料、製衣用具, 197: 三D8傢俱製造用料, 198: 三D9體育用品、樂器
199: 三D10醫療設施、藥物、場所, 200: 三D11商店、交易場所、商業用品
201: 三D12飲食、服務、娛樂場所及用品, 202: 三D13軍警裝備及設施、民用槍械
203: 三D14其他生產用品與產品, 204: 三D15其他器物及場所

【時間空間】
205: 四A1以前、現在、以後, 206: 四A2最初、剛才、後來, 207: 四A3白天、晚上
208: 四A4昨天、今天、明天, 209: 四A5去年、今年、明年, 210: 四A6時節、時令
211: 四A7時刻、時段, 212: 四A8這時、那時、早些時, 213: 四A9其他
214: 四B1地方、處所、位置、方位, 215: 四B2上下、底面, 216: 四B3前後左右、旁邊、中間、附近
217: 四B4內外, 218: 四B5排列位置, 219: 四B6到處, 220: 四B7邊角孔縫
221: 四B8地段, 222: 四B9地區, 223: 四B10其他

【心理活動】
224: 五A1高興、興奮、安心, 225: 五A2憂愁、憋氣、頭痛、操心, 226: 五A3生氣、煩躁
227: 五A4害怕、害羞, 228: 五A5鎮定、緊張、著急, 229: 五A6掛念、擔心、放心, 230: 五A7其他
231: 五B1思考、回憶, 232: 五B2猜想、估計, 233: 五B3低估、輕視、誤會、想不到
234: 五B4專心、留意、小心, 235: 五B5分心、不留意、無心, 236: 五B6喜歡、心疼、憎惡、忌諱
237: 五B7願意、盼望、羡慕、妒忌、打算、故意, 238: 五B8有耐心、下決心、沒耐心、猶豫
239: 五B9服氣、不服氣、後悔、無悔, 240: 五B10知道、明白、懂得、領悟
241: 五B11不知道、糊塗、閉塞, 242: 五B12膽大、膽小, 243: 五B13其他
244: 五C1和善、爽朗, 245: 五C2軟弱、小氣、慢性子, 246: 五C3脾氣壞、倔強、固執、淘氣
247: 五C4愛多事、嘮叨、挑別, 248: 五C5文靜、內向, 249: 五C6其他
250: 五D1善良、忠厚、講信用、高貴, 251: 五D2勤奮、懂事、老成, 252: 五D3不懂事、健忘、粗心
253: 五D4高傲、輕浮, 254: 五D5自私、吝嗇、貪心、懶惰, 255: 五D6奸詐、缺德、負義、下賤、淫蕩
256: 五D7蠻橫、粗野, 257: 五E1有文化、聰明、能幹、狡猾、滑頭, 258: 五E2愚笨、無能、見識少
259: 五E3會說不會做, 260: 五E4其他

【動作行為】
261: 六A1泛指的運動, 262: 六A2趨向運動, 263: 六A3液體的運動, 264: 六A4搖擺、晃動、抖動
265: 六A5轉動、滾動, 266: 六A6掉下、滑下、塌下, 267: 六A7其他
268: 六B1軀幹部位動作, 269: 六B2全身動作, 270: 六B3頭部動作, 271: 六B4被動性動作、發抖
272: 六C1眼部動作, 273: 六C2嘴部動作、鼻部動作
274: 六D1拿、抓、提等, 275: 六D2推、拉、按、托、捏等, 276: 六D3扔、搖、翻開、抖開等
277: 六D4捶、敲、抽打等, 278: 六D5放、壘、墊、塞等, 279: 六D6揭、摺、撕、揉、挖等
280: 六D7裝、蓋、綁、聯結等, 281: 六D8砍、削、戳、碾等, 282: 六D9洗、舀、倒、拌等
283: 六D10其他手部動作, 284: 六D11腿部動作, 285: 六D12其他

【社會活動】
286: 七A1過日子, 287: 七A2做事、擺弄、料理、安排, 288: 七A3領頭、主管、負責
289: 七A4完成、收尾, 290: 七A5成功、走運、碰運氣, 291: 七A6得益、漁利
292: 七A7失敗、出錯、失機、觸霉頭, 293: 七A8白費勁、自找麻煩、沒辦法
294: 七A9退縮、轉向、躲懶、過關, 295: 七A10給予、取要、挑選、使用、處置
296: 七A11收存、收拾、遺失、尋找, 297: 七A12阻礙、佔據、分隔
298: 七A13湊聚、併合、摻和, 299: 七A14排隊、插隊、圍攏、躲藏
300: 七A15走動、離開、跟隨, 301: 七A16節約、浪費、時興、過時
302: 七A17稱、量、計算, 303: 七A18寫、塗, 304: 七A19笑、開玩笑、哭、歎息, 305: 七A20其他
306: 七B1起臥、洗漱、穿著、脫衣, 307: 七B2烹調、購買食品, 308: 七B3飲食
309: 七B4帶孩子、刷洗縫補、室內事務, 310: 七B5生火、烤、熏、淬火
311: 七B6上街、迷路、遷徙、旅行, 312: 七B7錢款進出, 313: 七B8遊戲、娛樂
314: 七B9下棋、打牌, 315: 七B10戀愛、戀愛失敗, 316: 七B11婚嫁、其他喜事
317: 七B12喪俗、舊俗、迷信活動、尋死, 318: 七B13其他
319: 七C1說話、談話, 320: 七C2告訴、留話、吩咐、聽說, 321: 七C3不說話、支吾、私語
322: 七C4能說會道、誇口、學舌, 323: 七C5稱讚、貶損、挖苦、戲弄
324: 七C6斥責、爭吵、爭論、費口舌, 325: 七C7嘮叨、多嘴, 326: 七C8發牢騷、吵鬧、叫喊
327: 七C9說粗話, 328: 七C10說謊、捏造, 329: 七C11其他
330: 七D1工作、掙錢、辭退, 331: 七D2工業、建築、木工, 332: 七D3農副業
333: 七D4交通、電訊, 334: 七D5商業, 335: 七D6服務行業, 336: 七D7與商業、服務等行業有關的現象
337: 七D8醫療, 338: 七D9教育、文化、新聞, 339: 七D10體育, 340: 七D11治安、執法, 341: 七D12其他
342: 七E1相處、交好, 343: 七E2商量、邀約, 344: 七E3合作、拉線、散夥
345: 七E4幫忙、施惠, 346: 七E5請求、督促、逼迫、支使, 347: 七E6守護、監視、査驗
348: 七E7過問、聽任、容許、同意, 349: 七E8寵愛、遷就、撫慰
350: 七E9討好、得罪、走門路, 351: 七E10炫耀、擺架子、謙遜、拜下風
352: 七E11揭露、通消息, 353: 七E12責怪、激怒、翻臉, 354: 七E13做錯事、受責、丟臉
355: 七E14爭鬥、較量, 356: 七E15打擊、揭短、嚇唬、驅趕, 357: 七E16欺負、霸道
358: 七E17為難、捉弄、薄待, 359: 七E18出賣、使上當、陷害
360: 七E19瞞騙、假裝、藉口, 361: 七E20拖累、妨害、胡鬧、搬弄是非
362: 七E21蒙冤、上當、受氣、被迫, 363: 七E22發脾氣、撒野、撒嬌、耍賴
364: 七E23打架、打人、勸架, 365: 七E24不良行為、犯罪活動
366: 七E25禮貌用語、客套用語、祝願用語, 367: 七E26其他

【抽象事物】
368: 八A1事情、案件、關係、原因, 369: 八A2形勢、境況、資訊, 370: 八A3嫌隙、冤仇、把柄
371: 八A4命運、運氣、利益、福禍, 372: 八A5款式、條紋、形狀, 373: 八A6姿勢、舉動、相貌
374: 八A7力量, 375: 八A8附：一般事物、這、那、甚麼, 376: 八A9其他
377: 八B1想法、脾氣、態度、品行, 378: 八B2本領、能力、技藝、素質
379: 八B3計策、辦法、把握, 380: 八C1工作、行當、規矩、事務
381: 八C2收入、費用、財產、錢款, 382: 八C3文化、娛樂、衛生
383: 八C4情面、門路, 384: 八C5語言、文字, 385: 八C6其他

【形容描述】
386: 九A1大、小、粗、細, 387: 九A2長、短、高、矮、厚、薄, 388: 九A3寬、窄
389: 九A4直、曲, 390: 九A5豎、斜、陡、正、歪, 391: 九A6尖利、禿鈍
392: 九A7齊平、光滑、粗糙、凹凸、皺, 393: 九A8胖、壯、臃腫、瘦, 394: 九A9其他形狀
395: 九A10亮、清晰、暗、模糊, 396: 九A11顏色, 397: 九A12鮮艷、奪目、樸素、暗淡
398: 九A13美、精緻、難看, 399: 九A14新、舊, 400: 九A15表情、臉色、相貌
401: 九B1冷、涼、暖、熱、燙, 402: 九B2乾燥、潮濕、多水, 403: 九B3稠、濃、黏、稀
404: 九B4硬、結實、軟、韌、脆, 405: 九B5空、通、漏、堵塞、封閉
406: 九B6密、滿、擠、緊、疏、鬆, 407: 九B7整齊、均勻、吻合、亂、不相配
408: 九B8穩定、不穩、顛簸, 409: 九B9零碎、潦草、骯髒, 410: 九B10破損、破爛、脫落
411: 九B11腐爛、發黴、褪色, 412: 九B12壓、硌、絆、卡、礙、累贅
413: 九B13顛倒、反扣, 414: 九B14相連、糾結、吊、垂, 415: 九B15裸露、遮蓋
416: 九B16淹、沉、浮、洇、凝, 417: 九B17遠、近, 418: 九B18多、少
419: 九B19重、輕, 420: 九B20氣味, 421: 九B21味道, 422: 九B22可口、難吃、味濃、味淡, 423: 九B23其他
424: 九C1妥當、順利、得志、吉利、好運, 425: 九C2不利、失敗、嚴峻、緊急
426: 九C3倒楣、糟糕、運氣差, 427: 九C4狼狽、有麻煩、淒慘、可憐
428: 九C5舒服、富有、辛苦、貧窮, 429: 九C6洋氣、派頭、土氣、寒磣
430: 九C7繁忙、空閒, 431: 九C8手快、匆忙、緊張、手慢、悠遊
432: 九C9熟悉、生疏、坦率、露骨, 433: 九C10和睦、合得來、不和、合不來
434: 九C11合算、不合算, 435: 九C12有條理、沒條理、馬虎、隨便、離譜
436: 九C13兇狠、可厭, 437: 九C14其他
438: 九D1好、水準高、比得上, 439: 九D2不好、水準低、中等、差得遠
440: 九D3真實、虛假、正確、謬誤, 441: 九D4頂用、好用、無用、禁得起、禁不起
442: 九D5變化、不變、有關、無關, 443: 九D6增加、減少、沒有、不充足、欠缺
444: 九D7能夠、不行、有望、無望、有收益、無收益, 445: 九D8到時、過點、來得及、來不及
446: 九D9困難、危險、可怕、容易、淺顯, 447: 九D10奇怪、無端、難怪
448: 九D11有趣、滑稽、枯燥, 449: 九D12嘈雜、聲音大、靜、聲音小
450: 九D13熱鬧、排場、冷清、偏僻, 451: 九D14早、遲、久、暫、快、慢
452: 九D15厲害、很、過分、最、更、甚至, 453: 九D16稍微、有點、差不多、幾乎
454: 九D17經常、不斷、總是、長期、一向、動輒, 455: 九D18不時、間或、偶然、又、再、重新
456: 九D19極度、勉強、儘量、直接, 457: 九D20肯定、也還、應該、千萬
458: 九D21全部、一同、也都、獨自、雙方, 459: 九D22正在、起來、下去、已經、曾經
460: 九D23剛剛、待會兒、將要、立刻、突然、碰巧, 461: 九D24終於、預先、臨時、暫且、再說、幸好
462: 九D25和、或者、要麼、不然、衹好, 463: 九D26然後、接著、才、於是、至於
464: 九D27不但、而且、且不說, 465: 九D28因為、所以、既然、反正、為了、免得
466: 九D29如果、無論、那麼、除了, 467: 九D30固然、但是、不過、反而、還
468: 九D31是、像、可能、原本、實際上、在, 469: 九D32不、不是、不要、不必、不曾
470: 九D33這樣、那樣、怎樣、為甚麼、難道, 471: 九D34其他

【數量詞語】
472: 十A1數目, 473: 十A2概數、成數
474: 十B1人的計量單位, 475: 十B2動植物的計量單位, 476: 十B3人體部位等的計量單位
477: 十C1不同組成的物體的量, 478: 十C2不同形狀的物體的量, 479: 十C3不同排列的物體的量
480: 十C4分類的物品的量, 481: 十C5食物的量, 482: 十C6某些特定用品、物品的量, 483: 十C7其他
484: 十D1貨幣單位, 485: 十D2度量衡單位
486: 十E1時間的量, 487: 十E2空間、長度的量
488: 十F1抽象事物的量, 489: 十F2動作的量

【語氣助詞】
490: 十一A1用在句末表示敘述、肯定等的語氣詞, 491: 十一A2用在句末表示問話的語氣詞
492: 十一A3單獨使用的表語氣詞語, 493: 十一B1自然界的聲音, 494: 十一B2人發出的聲音
495: 十一B3人造成的聲音, 496: 十一C1口頭禪、慣用語, 497: 十一C2歇後語, 498: 十一C3諺語
`;

    const prompt = `請分析以下粤語表達，從上述三級主題分類中選擇最合適的一個分類。

表達：${expression}
${context ? `語境：${context}` : ''}${referenceText}

請仔細分析表達的核心含義，選擇最準確的三級分類ID。
考慮因素：
1. 表達的字面意思和引申含義
2. 使用場合和語境
3. 粤語的文化特色
4. 詞性和語法功能
${referenceExpressions && referenceExpressions.length > 0 ? '5. 可參考相關詞條的分類，但要確保選擇最適合當前表達的分類' : ''}

請返回JSON格式，包含：
- theme_id: 選擇的三級主題ID (60-498之間)
- explanation: 分類理由的詳細說明
- confidence: 置信度 (0-1之間，1表示非常確定)

${themeList}`;

    const completion = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        {
          role: "system",
          content: "你是一個粤語分類專家，精通粤語語言學分類體系。請根據表達的核心含義選擇最準確的三級分類。"
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const result = completion.choices[0]?.message?.content;
    if (!result) {
      throw new Error('No response from AI');
    }

    const parsed = ThemeSchema.parse(JSON.parse(result));
    
    // 确保解释文本转换为香港繁体
    return {
      ...parsed,
      explanation: convertToHongKongTraditional(parsed.explanation)
    };
  } catch (error) {
    console.error('Error categorizing expression:', error);
    return {
      theme_id: 286, // 默认为"七A1过日子"
      explanation: convertToHongKongTraditional('分类失败，使用默认分类'),
      confidence: 0.1
    };
  }
}

// 释义生成功能
export async function generateDefinitions(
  expression: string, 
  region: string = '香港',
  context?: string,
  referenceExpressions?: Array<{
    text: string;
    definition?: string;
    usage_notes?: string;
    region: string;
  }>
): Promise<{ definition: string; usage_notes: string; formality_level?: 'formal' | 'neutral' | 'informal' | 'slang' | 'vulgar'; frequency?: 'common' | 'uncommon' | 'rare' | 'obsolete' }> {
  try {
    // 构建参考词条信息
    let referenceText = '';
    if (referenceExpressions && referenceExpressions.length > 0) {
      referenceText = `

**参考相关词条**（作为生成释义的参考）：
${referenceExpressions.map((ref, index) => `
${index + 1}. 词条: ${ref.text} (${ref.region})
   释义: ${ref.definition || '无'}
   用法: ${ref.usage_notes || '无'}`).join('')}

请参考以上词条的释义风格和用法说明，但要确保为当前表达生成独特和准确的内容。`;
    }

    const prompt = `请为以下${region}粤语表达生成释义和使用说明。

表达：${expression}
地区：${region}
${context ? `语境：${context}` : ''}${referenceText}

请提供：
1. definition: 清晰准确的释义
2. usage_notes: 使用说明，包括语境、注意事项等
3. formality_level: 正式程度 (formal/neutral/informal/slang/vulgar，可选)
4. frequency: 使用频率 (common/uncommon/rare/obsolete，可选)

考虑因素：
- 字面意思和引申含义
- 使用场合和语境限制
- 地区特色和文化背景
- 语言的正式程度和社会接受度
- 在当地的使用频率
${referenceExpressions && referenceExpressions.length > 0 ? '- 可参考相关词条但保持内容的独特性' : ''}

请返回JSON格式。`;

    const completion = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        {
          role: "system",
          content: "你是一个资深的粤语语言学家，对各地粤语方言都有深入研究。请提供准确、全面的释义和使用说明。"
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
    });

    const result = completion.choices[0]?.message?.content;
    if (!result) {
      throw new Error('No response from AI');
    }

    const parsed = DefinitionSchema.parse(JSON.parse(result));
    
    // 确保所有文本都转换为香港繁体
    return {
      ...parsed,
      definition: convertToHongKongTraditional(parsed.definition),
      usage_notes: convertToHongKongTraditional(parsed.usage_notes),
    };
  } catch (error) {
    console.error('Error generating definitions:', error);
    return {
      definition: convertToHongKongTraditional(`${expression}的含义需要进一步确认`),
      usage_notes: convertToHongKongTraditional('请根据具体语境使用'),
      formality_level: undefined,
      frequency: undefined
    };
  }
}

// 例句生成功能
export async function generateExamples(
  expression: string,
  definition: string,
  region: string = '香港'
): Promise<Array<{ sentence: string; explanation: string; scenario: string }>> {
  try {
    const prompt = `请为以下${region}粤语表达生成3个生动、实用的例句。

表达：${expression}
释义：${definition}
地区：${region}

要求：
1. 例句要自然、地道，符合当地语言习惯
2. 涵盖不同的使用场景
3. 体现表达的核心含义
4. 包含适当的语境信息

每个例句需要包含：
- sentence: 完整的例句
- explanation: 例句的中文解释
- scenario: 使用场景描述

请返回JSON格式。`;

    const completion = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        {
          role: "system",
          content: "你是一个粤语教学专家，善于创造生动实用的例句帮助学习者理解粤语表达。"
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.6,
    });

    const result = completion.choices[0]?.message?.content;
    if (!result) {
      throw new Error('No response from AI');
    }

    const parsed = ExampleSchema.parse(JSON.parse(result));
    
    // 确保所有例句文本都转换为香港繁体
    return parsed.examples.map(example => ({
      ...example,
      sentence: convertToHongKongTraditional(example.sentence),
      explanation: convertToHongKongTraditional(example.explanation),
      scenario: convertToHongKongTraditional(example.scenario),
    }));
  } catch (error) {
    console.error('Error generating examples:', error);
    return [{
      sentence: convertToHongKongTraditional(`${expression}的例句生成失败`),
      explanation: convertToHongKongTraditional('请手动添加例句'),
      scenario: convertToHongKongTraditional('通用场景')
    }];
  }
}



// 根据三级主题ID获取完整的主题层级 - 从数据库查询
export async function getThemeHierarchy(themeIdL3: number): Promise<{
  theme_id_l1?: number;
  theme_id_l2?: number;
  theme_id_l3: number;
}> {
  try {
    // 动态导入supabase以避免在服务器端的循环依赖
    const { supabase } = await import('@/lib/database');
    
    // 查询三级主题及其层级关系
    const { data: level3Theme, error: l3Error } = await supabase
      .from('themes')
      .select('id, parent_id')
      .eq('id', themeIdL3)
      .eq('level', 3)
      .single();

    if (l3Error || !level3Theme) {
      console.error('Error finding level 3 theme:', l3Error);
      return { theme_id_l3: themeIdL3 };
    }

    // 查询二级主题
    const { data: level2Theme, error: l2Error } = await supabase
      .from('themes')
      .select('id, parent_id')
      .eq('id', level3Theme.parent_id)
      .eq('level', 2)
      .single();

    if (l2Error || !level2Theme) {
      console.error('Error finding level 2 theme:', l2Error);
      return { theme_id_l3: themeIdL3 };
    }

    // 查询一级主题
    const { data: level1Theme, error: l1Error } = await supabase
      .from('themes')
      .select('id')
      .eq('id', level2Theme.parent_id)
      .eq('level', 1)
      .single();

    if (l1Error || !level1Theme) {
      console.error('Error finding level 1 theme:', l1Error);
      return { 
        theme_id_l2: level2Theme.id,
        theme_id_l3: themeIdL3 
      };
    }

    return {
      theme_id_l1: level1Theme.id,
      theme_id_l2: level2Theme.id,
      theme_id_l3: themeIdL3
    };
  } catch (error) {
    console.error('Error getting theme hierarchy from database:', error);
    return { theme_id_l3: themeIdL3 };
  }
}



// 批量处理功能
export async function batchProcessExpressions(expressions: string[]): Promise<Array<{
  expression: string;
  theme_classification: { theme_id: number; explanation: string; confidence: number };
  definitions: { definition: string; usage_notes: string; formality_level?: 'formal' | 'neutral' | 'informal' | 'slang' | 'vulgar'; frequency?: 'common' | 'uncommon' | 'rare' | 'obsolete' };
  examples: Array<{ sentence: string; explanation: string; scenario: string }>;
}>> {
  const results = [];
  
  for (const expression of expressions) {
    try {
      const [themeResult, definitions] = await Promise.all([
        categorizeExpression(expression),
        generateDefinitions(expression)
      ]);
      
      // 使用释义生成例句
      const examples = definitions.definition 
        ? await generateExamples(expression, definitions.definition)
        : [];

      // 确保所有文本都转换为香港繁体
      results.push({
        expression: convertToHongKongTraditional(expression),
        theme_classification: {
          ...themeResult,
          explanation: convertToHongKongTraditional(themeResult.explanation)
        },
        definitions: {
          ...definitions,
          definition: convertToHongKongTraditional(definitions.definition),
          usage_notes: convertToHongKongTraditional(definitions.usage_notes)
        },
        examples: examples.map(example => ({
          ...example,
          sentence: convertToHongKongTraditional(example.sentence),
          explanation: convertToHongKongTraditional(example.explanation),
          scenario: convertToHongKongTraditional(example.scenario)
        }))
      });
      
      // 避免API调用过于频繁
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Error processing ${expression}:`, error);
      results.push({
        expression: convertToHongKongTraditional(expression),
        theme_classification: {
          theme_id: 286,
          explanation: convertToHongKongTraditional('处理失败，使用默认分类'),
          confidence: 0.1
        },
        definitions: { 
          definition: convertToHongKongTraditional('处理失败'), 
          usage_notes: convertToHongKongTraditional('请手动添加释义和使用说明'), 
          formality_level: undefined, 
          frequency: undefined 
        },
        examples: []
      });
    }
  }
  
  return results;
}

// Token 使用量估算
export function estimateTokens(text: string): number {
  // 粗略估算：中文字符按1.5个token计算，英文单词按1个token计算
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
  return Math.ceil(chineseChars * 1.5 + englishWords);
}

// API 调用成本估算（需要根据OpenRouter的实际定价调整）
export function estimateCost(inputTokens: number, outputTokens: number): number {
  // 这里需要根据OpenRouter和qwen模型的实际定价来调整
  // 示例：假设每1000个token的成本为$0.001
  const inputCost = (inputTokens / 1000) * 0.001;
  const outputCost = (outputTokens / 1000) * 0.001;
  return inputCost + outputCost;
} 