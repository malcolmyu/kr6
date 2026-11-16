# 备份抄本：已移植控制器与剩余战斗接线

2026-11-16。原四级法师塔菜单包含 skill_a / skill_b / skill_c，第三项中文名“备份抄本”。原网页只展示 A/B，是实际功能遗漏。下文保留底层控制器移植阶段的依据与进度；目前完整技能链、普通混战及三级浏览器购买已接通并通过对照，菜单已开放，最新状态见 `WIZARD_COPIES_RUNTIME.md`。

## 原始依据

APK `kr6/scripts_game.lua`：

- tower_wizard.update17961：技能优先级 A、C、B，C 首次购买时允许立即进入冷却判定；蓄力/转向后播放 throwbook，等待 shoot_time=22/30，创建 bullet_skill_c_wizard_1，赋予固定 50 伤害、目标当前坐标加 hit_offset、源塔 ID 与购买等级。
- first-book.insert30317：以起点到初始目标距离计算 sqrt(2×distance/-g) 飞行时间，再执行原 arrow.insert 的移动预测与逐轴误差。update30331 执行弹道、碰撞、伤害及弹跳 payload；实际伤害、payload、粒子生命周期尚待普通运行时接入。
- controller_tower_wizard_book_bounce.update18325：先分配第二本书，再消费四次随机数，产生两轴 10–30 的正负偏移，调用原 path_db.nearest_nodes，排队 bullet_skill_c_wizard_2，立即排队移除自身。
- path_db.nearest_nodes293：默认只搜索中间子路 1；每条路径取严格最短距离，默认不跳过非活跃路径，再执行原 Lua table.sort 距离排序。
- aura_wizard_skill_c.update18351：播放 land，严格等待超过 0.5 秒后开始 shoot，再等待 0.5 秒发射；后续弹体可在前次排队同一回合进入下一段等待。1/2/3 级各 3/5/8 发，伤害 34–60 / 52–92 / 62–108。无目标时消费四次散射随机数。最后 idle 一秒，启用原 tween，0.5 秒淡出后排队移除。

## 当前实现与验证

| 实现 | 原版 oracle | 范围 |
| --- | --- | --- |
| WizardTower.ts 内部 C 状态机与 onCopies 回调 | export/verify_wizard_copies_tower | 48 组 / 40800 帧；C 与普通攻击、严格冷却、目标空窗、转向、阻挡、蓄力中购买/升级、实际投书参数 |
| WizardBookMotion.ts | export/verify_wizard_copies_motion | 72 组 / 1017 帧；三个时钟起点、三个方向、静止/运动/传送目标、两种随机值，飞行时间/预测/位置/旋转/提前碰撞触发时刻 |
| WizardBookBounce.ts | export/verify_wizard_copies_bounce | 180 组；三张原地图、五个位置、三个技能等级、四种随机值，分配顺序、四次随机、原最近道路落点与立即移除 |
| WizardBookAura.ts | export/verify_wizard_copies_aura | 54 组 / 21600 帧 / 288 发；落地/待机/发射、目标离开与空场散射、等级伤害/数量、淡出 tween 及移除 |

首次投书运动复用现有 EnemyArrowMotion，增加显式飞行时间覆盖参数；旧固定高度默认行为保持，并重跑塔箭 352 帧与敌弓箭 45 帧对照。原 aura 与 bounce 模板已加入 entities 导出；没有改变单位数值。四项回归加入默认 npm test，可独立执行 `npm run test:wizard-copies-core`。构建、默认测试及这四项独立回归通过。

这些 oracle 保留原始控制器与动画数据库。塔目标获取、地面书目标获取由受控输入隔离；实际 SSO 候选顺序、全局健康队列、粒子与战斗交错不在这些隔离用例的证明范围内。

## 早期接线清单（已由后续完整运行时完成）

1. 首次投书现已接入，见下方补充。仍需完整自然混战与动画尾部移除验证，并把 bounce 回调变成真实控制器实体，不能以回调代替后续技能链。
2. 第二次投书需要原 bomb.insert/update 的飞行、旋转、粒子和 aura payload，不能直接假定现有 CatapultMotion 的 rotation/align 优先级适用于书本。
3. 将 bounce、地面 aura、tween 与每个 bolt 按原实体表顺序接入 RuntimeEntities / GameSession；地面 aura 的目标搜索走实际原 SSO 顺序。分配动作先于散射随机数，渲染需等真正插入。
4. 完成购买 cap/退款、出售后在途书本与地面书继续运行、三等级实际菜单/动画/音效、原战斗轨迹与绘制队列。之后再开放 TowerSystem.implementedTowerPowers.wizard 的 skill_c。
5. 补 A/C/B 混用、皇家敕令重置、普通混战与视频场景，不能把 C/basic 的隔离测试扩大解释成所有技能混合验证。

## 本轮六路线探测

`current-six-routes.json` 使用已有普通操作策略、战役重玩设置及该探测脚本的成长配置。1-1、1-2、2-1、3-1、3-2 自然胜利；2-2 于 127.9667 秒失败。只是确定策略的当前结果，尚未与这六条操作的原引擎整场逐一耦合，不能认定失败由网页错误导致，也不替代新存档流程或视频验收。完整目标保持未完成。


## 后续进展：首次投书与纸片粒子接入

- RangedCombat.onCopies 将 C 投书排入独立待插入表，在真实注册表插入槽内检查目标是否仍存在，构造 WizardBookMotion，并重新绑定同一个原实体描述符。普通塔的 C 目标候选携带实际 hit_offset。
- 首次投书按捕获的 50–50 伤害范围消费原始伤害随机数并交给现有健康队列；无论命中/落空，均触发一次携带等级的 onCopiesPayload。命中时停止纸片发射并保留隐藏投射物等待尾部。此回调尚未接为完整弹跳实体链。
- FirebookTrailSystem 新增 copies 配置，使用原 ps_skill_c_wizard_1：每秒 5 次发射、60 FPS 纸片动画、4.5333333333333332 秒寿命、原旋转随机范围与 Z3200。数据通过 17 位原数值导出；现有通用粒子渲染可处理此类型。第二次投书的现有通用 bomb 路径也可生成该纸片拖尾，但 aura payload 尚未接通。
- 修正通用零半径、无目标投射物的候选列表为空，避免将 undefined 当作目标；不注入伤害或假敌人。

新增验证：`verify_wizard_copies_dispatch.mjs` 对照 72 组实际 RangedCombat / 1017 帧、54 次命中，严格检查原轨迹、健康值、命中/落空的 payload 时刻与等级；`verify_wizard_copies_session.mjs` 对照 24 组真实 GameSession / 339 帧、注册表插入/自身 main、健康队列和纸片发射器。波次保持安静、目标位置受控，范围仅限首次投书。

`export/verify_wizard_copies_particles` 用原第二次投书 main_script + particle_system 观察 48 组 / 11520 帧 / 16236 个粒子样本，覆盖正常撞击、源提前移除、所有随机调用、帧/位置/旋转/缩放/寿命/发射时钟与完整尾部清理。真实后续控制器与完整技能链仍未验收。

构建、默认测试通过，新增检查均加入独立 copies-core 与默认测试。既有 8699 帧通关、187 个绘制检查点和全部原音效请求的 Chrome 回归重新通过。还需要完成控制器实体队列、后续 bolt 来源/分配顺序、地面动画/tween、三等级实际购买与销售后存续，才可开放 C 菜单。


## 最新状态

以上保留了开发过程中的未完成项；目前真实 bounce / 第二次投书 / 地面书 / shard / tween 已全部接入，C 菜单已开放。九组5400帧整链、普通3-2混战和Chrome三级购买/卖塔/绘制对照通过，详见 `WIZARD_COPIES_RUNTIME.md`。整体目标仍未完成，不将单技能完成扩大为完整视频验收。
