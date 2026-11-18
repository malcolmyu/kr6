# 投石塔 A：焦油区域正式实体

原版依据是 APK `gc64/kr6` 的 `aura_catapult_skill_a`、`mod_catapult_skill_a_slow`、`aura_apply_mod`、`mod_lifecycle`、`mod_slow` 和真实 simulation 执行。附件、模板和反编译文本仅作为证据。

此前的独立 CatapultTarSystem 已能正确表现减速，但正式 GameSession 未分配区域/修饰器的原版实体 ID，也没有在全局实体遍历位置执行其 main/tween。实际原版整链在 tick226 落地时创建 aura，网页缺少该 ID，原始差异保留在 `catapult-native-area-a-first-red.log`。

现由 CatapultTarRuntime 接入实际 RuntimeEntities：弹体落地创建/排队区域，下帧插入；区域按自己所在 main 顺序创建/排队减速；modifier insert 前执行原版同级刷新、高级替换和低级拒绝；自己的 insert/remove 乘除移速因子；死亡、目标删除、严格大于持续时间与区域 remove 被拒后的一秒反向淡出按原版阶段处理。正式渲染器读取真实区域集合。独立 RangedCombat 用例保留旧适配器，避免把独立调用误当成正式整链证据。

原版 mod_slow insert 不另查 modifier 的 vis_flags/vis_bans；区域先做自己的可见性过滤，插入只拒绝死亡、目标缺失和 motion.invulnerable。原版共享 modifier update 第一次运行重设 modifier.ts、引用目标位置；这些细节均由对照验证。

## 已完成验证

- `verify_catapult_tar_native_runtime.mjs`：48组原始独立区域轨迹 / 20160帧，使用实际生产 callbacks 与 NativeEntityRegistry 的 insert/remove、main、tween。三级、出生时钟、同级刷新、等级替换与拒绝、目标离开/返回/死亡、可见性与运动免疫、独立速度因素、全部区域持续时间/透明度/淡出时钟通过。
- `verify_catapult_native_area_chain_all.mjs`：六条实际 GameSession 整链 / 5000帧。rank1普通700帧、rank3普通900帧、rank2四目标集群900帧、rank3区域生效后卖源塔900帧、rank2生效后删除目标900帧，以及目标位于真实焦油落点的rank1整链700帧（要求原版实际插入减速修饰器，逐帧比较正式GameSession中的HP、移速和修饰器）。每帧完整实体 ID/表遍历/计数/峰值、插入删除队列、完整事件序列、RNG边界，以及真实敌人 HP/移速、area时钟/时长/等级/位置/alpha/tween、slow目标/来源/系数/时钟/位置均通过。
- 既有 `verify_catapult_tar.mjs`：54000塔控制器帧、20160旧独立区域帧、购买/退款/正常与Royal因素/陆地水面以及12条原版落地场景回归通过。
- `browser_catapult_tar.mjs`：Chrome正常建塔/四级升级/三次100购买；实际36/30/24移速、路径位移、原始装填/攻击/落地/焦油贴花、请求音效名、满级提示、金币支出、卖塔后区域存续并淡出/恢复60移速通过；无页面或资源错误。截图 `web-catapult-tar-rank3.png`、`web-catapult-tar-menu.png` 已刷新并查看。
- 最终生产构建通过：`catapult-tar-native-final-build.log`。整体默认 `npm test` 回归已退出0，结果见 `catapult-tar-native-regression.log`（包含新增48组区域与六条正式整链门禁）。

## 边界

本轮补齐 A 的真实实体机制，不代表投石塔 B/C 正式区域/眩晕实体、普通战役全场绘制，或全目标验收完成。普通战役与A/B/C混用、11星波林、新档六流程和完整视频/实际听感仍需继续。

补强检查发现直接以rank2/3初始化时，第一枚焦油直到tick656才落地；早先tick240卖塔/删目标的两条用例未覆盖预期区域。现把操作移至tick670，并增加载荷实际创建非空断言；旧完整轨迹保留为 `.before-scenario-correction.json`。额外aligned轨迹要求原版实际注册减速，避免仅比较空modifier集合。更新后的门禁重新通过；这些修正提高覆盖，不是降低原版行为比较。

A已补齐原始1400地面层和真实绘制排序：实际Chrome700个原版检查点、45914场景帧排序元数据，以及213个焦油图集/alpha检查通过。图层修正后的正常三级购买/移动/卖塔复验也已通过。详见 CATAPULT_C_NATIVE_RUNTIME.md。
