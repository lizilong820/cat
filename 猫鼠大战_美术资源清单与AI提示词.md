# 猫鼠大战：美术资源清单与 AI 提示词

## 1. PDF 结论

来源：`猫鼠大逃杀_微信小游戏开发文档.pdf`，v1.0，15 页。

- 玩法：12 人非对称对抗，10 只鼠守 10 栋房子，2 只猫进攻，单局 5-8 分钟，竖屏优先。
- 视角：俯视角 2D，地图逻辑尺寸约 2000×2000；10 栋房子环形加中心事件区。
- 首版重点：角色移动、房门、炮台、捕鼠夹、电击网、治疗站、资源室、中心事件、HUD、选角/选房/结算。
- 文档没有嵌入图片，所有视觉资源都需要另行制作。
- 角色动画、地图美术、攻击/升级/事件特效在开发排期 Phase 4 明确列为制作项；商店皮肤属于上线阶段。

## 2. 统一生成规范

### 2.1 全局风格前缀

将下面前缀放在每条提示词前，保证不同资源能组成同一套游戏美术：

> cute stylized 2D mobile game art, top-down three-quarter view, asymmetric cat-versus-mouse strategy battle, clean bold silhouette, readable at small size, saturated but balanced colors, soft hand-painted texture, subtle ink outline, playful cartoon mood, professional game asset, no gore, no blood, no logo, no watermark, no letters, no numbers

中文模型可改为：

> 可爱风格化 2D 微信小游戏美术，俯视三分之四视角，猫鼠非对称策略对抗，轮廓清晰、缩小后仍易辨认，色彩明快但平衡，柔和手绘纹理，轻微描边，轻松卡通氛围，专业游戏资源，无血腥无肢解无文字无数字无 logo 无水印。

### 2.2 输出约束

- 角色、建筑、道具、特效：透明背景 PNG；单个主体居中，四周留 8%-12% 空白。
- 地图、场景、面板背景：不透明 PNG/WebP；不要透明底。
- 图标：1:1，建议 256×256；角色立绘：1024×1024；地图块：512×512 或 1024×1024；整张地图：2048×2048。
- 生成动画时逐帧单图或 4×4/8×8 sprite sheet，要求每格尺寸一致、角色脚底基线一致；不要让模型在帧间改变服装和配色。
- 先用同一角色参考图/seed 生成整套动作，再做抠图、裁切、补帧和图集打包。

### 2.3 通用 negative prompt

> photorealistic, 3D render, first-person view, side-scrolling view, realistic violence, gore, blood, extra limbs, duplicate characters, deformed paws, unreadable UI text, watermark, logo, frame border, cropped subject, low contrast, blurry edges

## 3. 首版资源清单（必须制作）

以下每一项都是一个可落地的资源单元；同一项的动画帧可在后期拆成多张图片。

### A. 品牌、启动与通用资源

| ID | 资源 | 用途 | 建议规格 | 提示词主体 |
|---|---|---|---|---|
| A01 | 游戏 Logo「猫鼠大战」 | 主界面、启动图 | 1024×512，透明底 | playful Chinese game title logo, a mischievous orange cat chasing a gray mouse around a wooden door, red and teal accent, leave clean area for title lettering |
| A02 | 游戏图标 | 微信入口图标 | 1024×1024 | square app icon, orange cat and gray mouse facing each other over a tiny fortified house, bold silhouette, red-orange and cyan palette |
| A03 | 主界面背景 | 主界面氛围 | 1440×2560 | vertical night village, ten tiny fortified houses around a glowing central arena, moonlit blue sky, warm windows, clear center space for UI |
| A04 | 加载背景 | 首屏加载 | 1440×2560 | vertical illustrated village map, cat silhouette on one side, mouse silhouette behind a gate on the other, calm pre-battle atmosphere |
| A05 | 加载动画贴图 | 进度指示 | 256×256，透明底 | looping running gray mouse carrying a tiny wrench, four clear key poses, transparent background |
| A06 | 金币图标 | 资源数、奖励 | 256×256，透明底 | shiny golden coin with a simple paw-and-cheese emblem, readable at 32px, isolated |

### B. 角色资源

| ID | 资源 | 用途 | 建议规格 | 提示词主体 |
|---|---|---|---|---|
| B01 | 玩家老鼠基础立绘 | 选角、HUD、商店 | 1024×1024，透明底 | heroic gray mouse engineer, yellow utility vest, blue goggles, wrench, confident friendly pose |
| B02 | AI 老鼠普通变体 | 9 只人机区分 | 1024×1024，透明底 | friendly brown mouse defender, small backpack, red scarf, carrying a wooden shield |
| B03 | AI 老鼠简单变体 | 难度标识 | 1024×1024，透明底 | timid cream mouse defender, oversized helmet, small toolbox, cautious pose |
| B04 | AI 老鼠困难变体 | 难度标识 | 1024×1024，透明底 | tactical black-and-white mouse engineer, green visor, compact turret controller, alert pose |
| B05 | 玩家猫基础立绘 | 选角、HUD、商店 | 1024×1024，透明底 | powerful orange tabby cat hunter, dark leather harness, mechanical gauntlet, athletic intimidating but cute pose |
| B06 | 第二猫占位立绘 | 双猫同屏区分 | 1024×1024，透明底 | sleek charcoal cat hunter, purple scarf, twin claw gauntlets, agile pose, same art style as orange cat |
| B07 | 老鼠头像 | 选角、玩家列表 | 256×256，透明底 | close-up friendly gray mouse engineer portrait, blue goggles, circular readable silhouette |
| B08 | 猫头像 | 选角、玩家列表 | 256×256，透明底 | close-up orange tabby cat hunter portrait, mechanical eyepiece, circular readable silhouette |
| B09 | 老鼠 idle 动画 | 游戏内待机 | 8 帧，512×512/帧 | gray mouse engineer breathing and blinking, wrench held at side, consistent proportions, 8-frame sprite sheet |
| B10 | 老鼠 walk 动画 | 虚拟摇杆移动 | 8 方向×6 帧 | gray mouse engineer walking in eight directions, feet aligned, readable top-down silhouette, consistent outfit |
| B11 | 老鼠 build 动画 | 建造炮台/设备 | 6 帧 | gray mouse engineer kneeling and assembling a turret with wrench, sparks are small and safe, transparent background |
| B12 | 老鼠 attack/repair 动画 | 修门、交互 | 6 帧 | gray mouse engineer hammering a wooden gate, repair glow, top-down three-quarter view |
| B13 | 老鼠 hurt/eliminate 动画 | 受击、淘汰 | 6 帧 | cartoon mouse knocked back with dizzy stars, no injury, clean readable pose |
| B14 | 老鼠 victory/defeat 动画 | 结算 | 6 帧 each | mouse defender cheering with raised wrench / sitting sadly beside an intact empty toolbox, nonviolent cartoon |
| B15 | 猫 idle/walk 动画 | 游戏内移动 | 8 方向×6 帧 | orange tabby cat hunter prowling in eight directions, mechanical gauntlet, consistent outfit and foot baseline |
| B16 | 猫 attack 动画 | 攻击房门 | 8 帧 | orange tabby cat striking a wooden gate with glowing mechanical claw, impact wind-up and follow-through |
| B17 | 猫 skill 动画 | 事件卡释放 | 8 帧 | orange tabby cat lunging forward with a bright cyan speed trail, dynamic but clean silhouette |
| B18 | 猫 hurt/eliminate 动画 | 被炮台击败 | 8 帧 | cartoon cat hunter staggered by electric sparks and stars, no blood, readable defeat pose |
| B19 | 猫 victory/defeat 动画 | 结算 | 6 帧 each | cat hunter celebrating beside broken gate / cat sitting frustrated with dim gauntlet, nonviolent cartoon |

### C. 地图与场景

| ID | 资源 | 用途 | 建议规格 | 提示词主体 |
|---|---|---|---|---|
| C01 | 全局地图底图 | 10 房子战场 | 2048×2048 | top-down circular village arena, ten house plots around a central event plaza, readable paths, grass, fences, no UI, seamless game map |
| C02 | 草地地块 | 地面图集 | 512×512，可平铺 | top-down stylized green grass tile with tiny flowers and dirt variation, seamless edges |
| C03 | 土路地块 | 移动路径 | 512×512，可平铺 | top-down warm dirt path tile, curved edge variants, seamless edges |
| C04 | 围栏/边界地块 | 地图边界 | 512×512 | top-down wooden fence segment with corner and gate variants, transparent background |
| C05 | 外环房屋外观 | 房子 1-9 | 1024×1024 | top-down fortified woodland cottage, colored roof accent, reinforced wooden front gate, small yard, isolated on transparent background |
| C06 | 中心事件区 | 中央抢点 | 1024×1024 | circular stone event plaza with glowing paw-shaped rune and four small beacons, top-down, transparent background |
| C07 | 出生点：猫 | 猫出生区域 | 512×512 | dark red circular cat spawn pad with claw emblem, top-down, transparent background |
| C08 | 出生点：鼠 | 鼠出生区域 | 512×512 | blue circular mouse spawn pad with cheese emblem, top-down, transparent background |
| C09 | 地图资源点 | 猫鼠可拾取 | 256×256，透明底 | small wooden resource crate with glowing gold coin and cheese tokens, isolated |
| C10 | 房子编号/状态标记 | 小地图 | 256×256 图标 | compact house marker icons in available, selected, under attack, destroyed states, no text |

### D. 房屋、防御与设备

| ID | 资源 | 用途 | 建议规格 | 提示词主体 |
|---|---|---|---|---|
| D01 | 房门 Lv.1 | 初始核心防线 | 1024×1024，透明底 | simple wooden fortified gate, iron bands, mouse-sized lock, top-down three-quarter view |
| D02 | 房门 Lv.2 | 升级外观 | 同上 | reinforced wooden gate with extra metal plates and blue bolts, clearly stronger than level one |
| D03 | 房门 Lv.3 | 高级外观 | 同上 | heavy armored wooden gate with layered steel braces and cyan energy seams |
| D04 | 房门 Lv.4 | 满级外观 | 同上 | massive legendary fortified gate, gold trim, thick steel brace, cyan protective glow |
| D05 | 房门受损状态 | HP 阶段 | 4 张 | wooden fortified gate with progressive cracks and falling splinters, no blood, transparent background |
| D06 | 房门摧毁状态 | 淘汰反馈 | 1024×1024 | broken open gate with harmless dust cloud and scattered planks, no character, transparent background |
| D07 | 炮台 Lv.1 | 鼠防御 | 512×512 | compact wooden mouse turret with one blue barrel and cheese-shaped base, top-down, transparent background |
| D08 | 炮台 Lv.2 | 炮台升级 | 512×512 | upgraded mouse turret with two blue barrels, metal braces and small radar, top-down |
| D09 | 炮台攻击弹道 | 攻击表现 | 256×256，透明底 | bright cyan energy pellet with short trail, isolated |
| D10 | 捕鼠夹 | 减速设备 | 512×512 | oversized cartoon steel mousetrap with yellow warning stripes, top-down, transparent background |
| D11 | 捕鼠夹触发态 | 命中表现 | 512×512 | closed mousetrap emitting a blue slow-field ring, no trapped body, transparent background |
| D12 | 电击网 | 持续伤害 | 512×512 | deployable electric net generator with cyan grid arcs, top-down, transparent background |
| D13 | 治疗站 | 炮台回血 | 512×512 | small medical station with green cross light and circular healing field, top-down, transparent background |
| D14 | 资源室 Lv.1 | 金币生产建筑 | 512×512 | tiny fortified resource room with coin hopper, warm yellow window, top-down |
| D15 | 资源室 Lv.2/Lv.3 | 生产升级 | 2 张 | progressively upgraded resource room with larger hopper, pipes and brighter coin glow |
| D16 | 部署槽位 | UI/场景占位 | 256×256，透明底 | circular cyan build slot ring with subtle paw pattern, isolated |

### E. 战斗、升级与通用特效

| ID | 资源 | 用途 | 建议规格 | 提示词主体 |
|---|---|---|---|---|
| E01 | 猫爪攻击特效 | 猫打门 | 512×512，透明底 | three bright orange claw slashes with wind streaks, isolated, transparent background |
| E02 | 房门命中特效 | 受击反馈 | 512×512，透明底 | wooden impact burst with yellow sparks and tiny dust puffs, no debris overload |
| E03 | 炮台命中特效 | 猫受击 | 512×512，透明底 | cyan energy hit burst with star-shaped sparks, nonviolent |
| E04 | 溅射特效 | 猫武器 Lv.3 | 512×512，透明底 | orange circular shockwave with small energy fragments, isolated |
| E05 | 暴击特效 | 致命一击 | 512×512，透明底 | large golden starburst and three sharp light rays, no text or numbers |
| E06 | 减速特效 | 捕鼠夹 | 512×512，透明底 | icy blue spiral ring around a target point, isolated |
| E07 | 电击特效 | 电击网 | 512×512，透明底 | cyan lightning arcs forming a small circular field, isolated |
| E08 | 治疗特效 | 治疗站 | 512×512，透明底 | green plus-shaped particles and soft healing rings, no text |
| E09 | 护盾特效 | 铁壁护盾 | 512×512，透明底 | translucent blue hexagonal shield bubble, clean silhouette |
| E10 | 吸血特效 | 猫被动 | 512×512，透明底 | red-orange energy stream curling from gate toward cat gauntlet, no blood |
| E11 | 恐吓减益特效 | 猫被动 | 512×512，透明底 | purple warning aura with small vibrating turret icon silhouette, no text |
| E12 | 升级完成特效 | 所有升级 | 512×512，透明底 | gold and cyan level-up ring with ascending particles, isolated |
| E13 | 淘汰/退出特效 | 玩家离场 | 512×512，透明底 | character silhouette dissolving into harmless blue particles and stars |
| E14 | 信号弹 | 鼠技能 | 512×512，透明底 | bright red flare projectile with smoke ribbon, cartoon game effect |
| E15 | 伤害数字与状态条 | 战斗反馈 | UI atlas | compact clean damage number glyph style and small status bar segments, no fixed numbers in generated art |

### F. 中心随机事件资源

| ID | 资源 | 事件 | 提示词主体 |
|---|---|---|---|
| F01 | 暴风雪 | 猫移速 -30% | stylized blue snowstorm vortex with snowflakes and wind ribbons, transparent background, no text |
| F02 | 狂怒 | 猫攻击 +50% | fiery red-orange rage aura with claw-shaped sparks, transparent background |
| F03 | 资源雨 | 老鼠 +200 金 | golden coins raining around a small cheese token, transparent background |
| F04 | 猫薄荷 | 猫回复 300 HP | glowing green catnip leaves and soft healing halo, transparent background |
| F05 | 地震 | 全场大门 -100 HP | cracked ground ring with small dust puffs and vibration lines, top-down, transparent background |

## 4. UI 资源清单（首版必须制作）

| ID | 资源 | 对应界面 | 提示词主体 |
|---|---|---|---|
| U01 | 通用面板背景 | 所有弹窗 | dark navy rounded game panel with wood-and-metal trim, subtle inner highlight, empty center, no text |
| U02 | 主按钮三态 | 主界面/弹窗 | chunky rounded orange game button, normal pressed disabled states shown as separate assets, empty label area |
| U03 | 次按钮三态 | 所有界面 | compact cyan secondary button, separate normal pressed disabled assets, no text |
| U04 | 倒计时框 | 选角/选房/HUD | compact circular timer frame with orange warning rim, empty center |
| U05 | 顶部 HUD 背景 | 游戏主界面 | slim dark translucent top HUD bar with slots for timer, alive count and resource, no text |
| U06 | 资源栏 | 游戏主界面 | gold coin counter capsule with empty numeric area |
| U07 | HP 条：猫 | HUD | red segmented health bar with claw motif, empty numeric area |
| U08 | HP 条：房门 | HUD | sturdy blue-gray door health bar with gate motif |
| U09 | 小地图底板 | HUD | square minimap frame with metal corners, transparent map window, no labels |
| U10 | 小地图房屋图标 | HUD | tiny colored house markers for safe, selected, under attack, destroyed states |
| U11 | 小地图猫/鼠标记 | HUD | tiny orange cat marker and cyan mouse marker, clear at 16px |
| U12 | 虚拟摇杆底盘 | 操作 | translucent circular joystick base with paw engraving |
| U13 | 虚拟摇杆摇杆 | 操作 | cyan circular joystick handle with soft shadow |
| U14 | 猫攻击按钮 | 猫 HUD | large orange circular claw attack button, empty center, no text |
| U15 | 视角切换按钮 | HUD | circular eye-and-arrow icon, cyan accent, transparent background |
| U16 | 信号弹按钮 | 鼠 HUD | circular red flare icon button, transparent background |
| U17 | 技能槽底板 | HUD | three-slot and two-slot dark metal ability tray, empty sockets |
| U18 | 房门升级图标 | 鼠升级面板 | fortified wooden gate with upward cyan arrow |
| U19 | 炮台建造/升级图标 | 鼠升级面板 | mouse turret with small wrench and upward arrow |
| U20 | 捕鼠夹图标 | 鼠设备 | steel mousetrap icon, yellow warning stripe |
| U21 | 电击网图标 | 鼠设备 | electric net generator icon, cyan lightning |
| U22 | 治疗站图标 | 鼠设备 | healing station icon, green cross |
| U23 | 资源室图标 | 鼠升级面板 | coin hopper room icon, gold glow |
| U24 | 武器强化图标 | 猫升级面板 | mechanical cat gauntlet with upward arrow |
| U25 | 疾风突进图标 | 猫事件卡 | cat silhouette with cyan speed trails |
| U26 | 铁壁护盾图标 | 猫事件卡 | blue hexagonal shield with claw emblem |
| U27 | 致命一击图标 | 猫事件卡 | golden claw strike with starburst |
| U28 | 吸血图标 | 猫被动 | orange gauntlet drawing a red-orange energy stream |
| U29 | 恐吓图标 | 猫被动 | purple cat eye and trembling turret silhouette |
| U30 | 升级树节点 | 升级面板 | circular level node in locked, available, active, maxed states, no numbers |
| U31 | 费用/金币小图标 | 升级面板/结算 | tiny gold coin with clean silhouette |
| U32 | 选角阵营卡 | 选角界面 | split card composition: friendly mouse defender on blue side, cat hunter on orange side, empty text area |
| U33 | 选房卡/房子状态 | 选房界面 | miniature fortified house card in available, selected, unavailable states |
| U34 | 结算胜利徽章 | 结算界面 | bright gold shield badge with star and paw, no text |
| U35 | 结算失败徽章 | 结算界面 | muted steel shield badge with cracked star, no text |
| U36 | MVP 徽章 | 结算界面 | gold crown over paw emblem, no text |
| U37 | 段位徽章五档 | 主界面/结算/排行 | five separate rank emblems from bronze, silver, gold, platinum to diamond, no letters or numbers |
| U38 | 排行榜奖杯 | 排行榜 | stylized gold trophy with paw engraving, transparent background |
| U39 | 商店货架背景 | 商店界面 | compact wooden-and-metal shop shelf with empty display slots, no text |
| U40 | 购买/装备状态角标 | 商店 | small green check, gold lock and cyan equipped badge, no text |
| U41 | 表情包图标组 | 商店/社交 | six expressive cat and mouse emoji faces, separate round icons, no text |
| U42 | 网络/重连提示图标 | 断线重连 | compact antenna with reconnect arrows, transparent background |

## 5. 上线后迭代资源（文档明确提到，但不阻塞首版）

| ID | 资源 | 来源 | 提示词主体 |
|---|---|---|---|
| I01 | 暗影猫皮肤 | 后续新角色 | stealth charcoal cat with semi-transparent purple cloak, friendly non-gory cartoon, transparent background |
| I02 | 雪地地图主题 | 后续新地图 | top-down snowy village arena with icy paths and snow-covered fortified houses |
| I03 | 沙漠地图主题 | 后续新地图 | top-down desert village arena with sand paths, canyon rocks and fortified huts |
| I04 | 地下城地图主题 | 后续新地图 | top-down underground dungeon arena, stone paths, torches and fortified gates |
| I05 | 赛季主题皮肤 | 赛季系统 | collectible seasonal cat and mouse costume pair, same base silhouettes, transparent background |
| I06 | 观战/直播边框 | 观战系统 | clean spectator HUD frame with minimap and player slots, no text |

## 6. 生成顺序和验收标准

1. 先生成 B01、B05、C01、D01、D07、U01、U05、U09，确认视觉方向和缩小可读性。
2. 再生成 B09-B19 的动画、D02-D16 的建筑设备、E/F 的特效，最后批量生成 U 组图标。
3. 角色和设备必须有统一锚点（角色脚底、建筑中心、特效中心），否则 Cocos 动画和碰撞表现会抖动。
4. 每张图检查：透明边缘无白边、主体未裁切、同组颜色/比例一致、32px 预览仍可识别、无文字和水印。
5. 生成结果只作为概念和美术底稿；上线前还要做版权核查、AI 生成内容留档、微信小游戏审核适配，以及逐帧重绘/清理。

