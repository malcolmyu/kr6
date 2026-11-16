# 骑士死亡的 health/main/render 与尸体删除边界

2026-11-16。本次完成正常四级骑士的普通致命物理伤害死亡分支。完整前三关/3-2尚未验收。

## 原版证据与实现

`all/script_utils.lua` 2116–2244 的单次近战协程在死亡/眩晕时中断，停止攻击声音并返回；外层骑士主循环仍有一次 yield。`kr6/scripts_game.lua` 19589–19852 的主循环下次检查 health.dead 后才调用 `SU.y_soldier_death`。后者先 `U.unblock_target`（含阻挡顺序轮换），再排队死亡声音并播放非循环死亡动画。`systems.health` 在致命伤害的当前 tick 设置 hp=0、death_ts、delete_after=death_ts+dead_lifetime；删除条件为严格 delete_after<tick_ts，下一次实体队列 flush 才真正移出。

网页现在保留这几个独立时间点：

- `deathHealthAt`：伤害结算导致死亡，hp归零，仍持有目标和旧动画；不提前发死亡声音。
- 攻击中死亡：下一 tick 继续攻击协程并处理中断，停止 MeleeSword；命中等待恰好结束时，原版可先生成原本的伤害再中断。本次包含这个边界的独立案例。
- 此后外层 yield，下一次 main 才解除目标、执行原版阻挡轮换、开始死亡动画和音效。未在攻击中则直接进入死亡分支。
- 尸体寿命从 `deathHealthAt` 起算。严格越过 delete_after 才 `onRemove` 排队到正常 RuntimeEntities；下一 tick 同时从真正注册表和网页士兵数组移除。

本次保留英雄/普通援军原有流程。分解、吞噬、爆炸死亡、复杂塔技能、卖塔/升级的士兵全生命周期均不由本证明覆盖。敌方 melee 本身仍是旧实现，因此还未达到完整 main/health 顺序一致。

## 独立原版对照

`luajit scripts/export_soldier_combat.lua --death` 运行实际四级骑士完整原协程、health、pops 和 animation_db，三名士兵共同阻挡一名静止敌人，在六个声明的时间点对第二名士兵注入致命伤害。两种出生时间，共48组、21,600帧。原版陆地、敌人不运行主脚本、固定随机0.25为明确夹具输入，不是视频玩法。

`verify_soldier_death.mjs` 核对每帧 HP、目标、位置、阻挡顺序、攻击 ts、死亡帧及此前攻击帧、RNG次数、死亡音效/攻击停止事件和尸体 queueRemove/remove 时刻。初始随机渲染相位不比较；测试从攻击开始及死亡开始后才比较图集帧。网页删除事件直接观测数组 splice，避免在 advance 完成后才记录而伪造阶段顺序。全部通过。旧48组17,280帧普通交战及完整 npm test 同样通过。

## 真实关卡诊断与可见验证

相同 level03 iron smoke 输入和 constant-half RNG：首次位置差异由889推迟至891；首次HP差异由901推迟至926；金币仍1068，注册表仍585。891 原生敌人102已无 blocker，但仍在攻击协程内停留；网页旧敌人近战会立刻退出并行走。这是下一步直接证据，不能用延迟位置或改战斗数值补偿。

`browser_knight_death.mjs` 用真实 UI 建兵营、进入原版波次，在实际攻击中注入声明的致命伤害并加速模拟：health 保留目标/攻击 → 下一 tick 停止攻击 → 再下一 main 死亡动画/释放目标 → 尸体寿命到期排队 → 下一 tick 注册表与士兵数组同时消失。页面与资源无错误。`web-knight-native-death.png` 已检查。声音事件时刻已测，尚未证明实际音频与视频逐段一致。

fresh opening：2055帧、4次投石/12次法球、7373独立原版行走样本继续匹配。这仍是规定actor/HP/order输入的组件比较。完整probe `knight-death-playthrough.json`：1-1胜20命/268.6667秒，1-2胜1命/148.5秒，2-1胜20命/437.5333秒，2-2败128.1秒，3-1胜10命/671.3333秒，3-2败63.9秒。4胜2败，不能作为全关卡或视频一致的证据；未调整经济或攻击数值以追求通过。
