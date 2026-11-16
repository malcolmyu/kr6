# 原版近战士兵协程与阻挡分配

2026-11-16。已在正常 `BarracksCombat` 接入四级骑士的基础攻击协程行为；Vue/Three.js 使用原图集帧渲染。不是完整前三关/3-2验收。

原始证据：`all/script_utils.lua` 的 soldier_pick_melee_target(2289)、soldier_move_to_slot_step(2344)、soldier_pick_melee_attack(2370)、y_soldier_melee_block_and_attacks(2426)、y_soldier_do_single_melee_attack(2116)，以及 `all/utils.lua` 的 unblock_target(1244)、block_enemy(1258)。导出器运行实际四级骑士完整 main_script 协程和原 health/pops/animation_db；敌人固定在已声明的位置并禁用其 main_script，地形固定为可行走陆地。该夹具验证士兵协程，不能证明完整原生运行。

- 第二/第三阻挡者可改选尚未被阻挡的 foremost 敌人。脱离目标后，原脚本将最后一名剩余阻挡者移到首位，不能从网页士兵数组重建顺序。
- 到位的 walk 步仍然 yield，下一 tick 才选攻击。
- 攻击期间保持目标，包括风摇期间死亡的目标，直到原动画完成。主脚本读取上一 tick 的 render runs，完成后还有外层 yield。
- 攻击 ts 在命中点写入开始时间；冷却是严格 `<`，每位士兵独立保存，不能写入共享模板。
- 全部士兵先生成伤害，再逆序 health，最后 pops，避免伤害抽样和 pop 抽样交错。
- MeleeSword 在开始攻击时排队，在动画完成时停止。停止事件已接到 AudioManager，并取消尚未解码完成的同名播放请求。尚未与视频做可听声音逐段比对。
- 普通行走/站立的循环动画保留原来的 ts；攻击使用非循环帧，结束后等待冷却时仍保持最后一帧。

`export_soldier_combat.lua` / `verify_soldier_combat.mjs`：四级 × 两个出生时间 × 六种输入场景，48 组、17,280 帧。核对位置、目标、阻挡顺序、攻击 ts、动画名、首次攻击后图集帧、HP、随机调用数、声音开始/停止事件。输入包括目标死亡、暂时离开索敌范围、最大阻挡者限制及变化随机序列。初始随机渲染相位不在本夹具比较范围。原始伤害由内部 queue_damage 加入 store，导出中的 simulation.queue_damage stub 不是实际伤害路径；证明来自 HP 和抽样时序，不能拿空的 damage 事件列表证明伤害一致。

实际 level03 iron、相同 smoke 输入和 constant-half 随机诊断：以前首次位置差异 605、HP 619、金币 691；当前首次位置差异 889、HP 901、金币 1068。注册表仍在 585 因未接入 pop 实体发生分歧，这项没有改善。原生/网页第一发法球均 508，第一发投石落点继续匹配。数据见 `native-level-runtime-diagnostic.json`。

889 的直接证据：网页骑士72在敌人伤害阶段立即释放目标102，黑卫兵在同一 tick 移动；原版骑士72已 HP=0，但仍保留目标102及 attack 动画，下一次主协程才处理死亡。下一步应修正整个死亡/health/main 阶段，不能调整攻击力或补偿位置来掩盖。

旧 `verify_barracks` 假定三名骑士集中攻击并在50秒内击杀，已被原版阻挡分配否定。现检查真实伤害/阻挡/支出，另用明确的低血敌人验证击杀金币；到位后 yield 的命中断言也已更新。固定步长确定性、尸体占位/重生、免费教学兵营继续通过。

验证：完整 npm test、npm run build；刷新后的 opening 再生成并通过：2055帧，4次投石/12次法球，7373个原版独立行走样本。仍是规定 actor/HP/order 的组件比较。浏览器 `browser_knight_combat.mjs` 用 UI 建兵营、原版波次交战，并加速模拟观察攻击帧与冷却末帧，无页面或资源错误；截图 `web-knight-native-combat.png` 已检查。声音实际听感、全局死亡/伤害/实体顺序以及完整3-2均未证明。
