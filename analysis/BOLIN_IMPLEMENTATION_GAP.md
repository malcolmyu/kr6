# 博林：11星可达英雄完整接入尚未完成

更新：基础远攻、弹壳/粒子、普通死亡爆炸与复活已接入正式实体并通过原版对照；初始等级/升级补丁及队伍存档规则已验证。当前生产UI仍未开放正常换队，高级技能和移动近战仍待完成。A烟雾迫击炮现已完成专项，见 [BOLIN_A_NATIVE_RUNTIME.md](BOLIN_A_NATIVE_RUNTIME.md)；C巨人杀手也已完成专项，见 [BOLIN_C_NATIVE_RUNTIME.md](BOLIN_C_NATIVE_RUNTIME.md)；基础证据见 [BOLIN_BASE_NATIVE_RUNTIME.md](BOLIN_BASE_NATIVE_RUNTIME.md)。B地雷阵已接入正式实体并通过26条/38000帧原版逻辑对照，基础与触发两组Chrome画面已通过，剩余画面和回归仍在执行，见 [BOLIN_B_NATIVE_RUNTIME.md](BOLIN_B_NATIVE_RUNTIME.md)。以下“只读准备”部分保留为历史记录，不代表当前全部尚未实现。

前三关每关战役最多3星、铁人1星，共12星。原版非demo（premium/IAP/CN）奖励表在11星解锁hero_bolin；当前生产HeroRoom/ProgressStore/HeroSystem/App仍只支持Gerald/Zefira。因此不能把前三关整体目标判定完成。可达性原始依据见 `native-progression-reward-inventory.json`，原始地图奖励初始化函数见 `functions/native_map_reward_init.lua`。

## 本轮只读准备（不等于生产实现）

- `export_bolin_native_functions.lua`：31个英雄/依赖模板、27个原始main callbacks，输出 `bolin-native-templates.json` / `bolin-native-functions.json`。
- `export_bolin_level_functions.lua`：补齐 `hero.fn_level_up` / info_fn / main的原始字节码与upvalue名，输出 `bolin-hero-function-map.json`。
- 原始level_up反编译：`functions/bolin_hero_level_up.lua`。按等级写hp_max、armor、regen、基础近战，并修改四类Bolin bullet模板的远程min/max；不能只按当前HeroSystem的单位rangedDamage字段推断所有技能。
- 完整hero main反编译在LJD loop/GOTO处失败，原始530行对应1227条指令仍完整保留。该失败不是阻塞；继续使用字节码、实际执行轨迹和已独立提取的九个嵌套函数（8415、8445、8475、8479、8496、8512、8845、8889、8897）。索引 `bolin-hero-nested-map.json`，辅助阅读 `functions/bolin_nested_*.lua`。
- `functions/bolin_basic_bullet.lua` 已解码：基础弹体主脚本即时分配伤害/命中FX/可选载荷并remove；talent1读取来源hero技能改变reduce_armor。它不是当前Zefira BoltMotion弹体。
- `export_bolin_art.lua`：原始atlas、五个EXO与animation表只读保存 `bolin-art.json`。真实纹理已有 `runtime/desktop_assets/kr6-phone/images/ipadhd/go_hero_bolin-1.png`，尚未纳入production towers-art/texture列表。
- `export_bolin_upgrade_graph.lua`：原始图/点数/配置与真实原版evaluate保存 `bolin-hero-upgrades.json` / `bolin-hero-graph-oracle.json`。
- `export_bolin_room.lua`：原版英雄技能室按钮状态、选择态、时间线、字符串与图像引用保存 `bolin-hero-room.json` / `bolin-room-images.json`；明确跳过公共PNG裁切，不改production JSON和public/assets。
- `verify_bolin_graph_staging.mjs` 已通过78条原版graph评价、房间nodeState/labels/image引用。它只证明暂存数据和通用图算法，不证明英雄已能选或能战斗。

## 主要接入工作

1. 从原版读取/验证英雄队伍选择、两格装备与11星解锁，持久化到现有ProgressStore，保留已有heroes XP字段意义；HeroRoom、App英雄头像/名称与WorldRenderer.load/HeroSystem.insertTeam需要完整传递，早期剧情仍按原版默认队伍。
2. 原版Bolin被动/技能树补丁与等级成长、图形/音效资源；HeroSystem的Gerald/Zefira分支不能把Bolin当成Zefira。
3. 基础近战、即时远攻与弹壳controller/FX、方向与打断、移动/选中/语音、死亡爆炸/墓碑/复活及成长。
4. Smoke Mortar（A）原路径预测多落点与烟雾减速；Mine Field（B）布雷、原始位置/间距/数量与触发；Giant Slayer（C）特殊弹体；两个互斥talent与Suppressive Fire ultimate；完整独立实体、伤害/生命周期和真实绘制。
5. 原版完整链、正常解锁/换队/升级/存档恢复、普通第三关混战与画面；随后新档六流程至3-2、完整视频/实际听感与交付。

## 已关闭的前置工作

投石塔A/B/C正式区域/修饰器及原版图层已接入，C的17条16000帧整链、三项效果2500个原始Chrome绘制检查点、三项正常购买/卖塔流程和包含新C门禁的完整默认npm test均通过。见 `CATAPULT_C_NATIVE_RUNTIME.md`。本文件保留其后的实际剩余范围，不把单个专项通过等同于整体目标完成。
