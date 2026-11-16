# 地面敌人近战协程、末尾等待与恢复行走

2026-11-16。正常四类敌人（bandit/blackguard/shadow_archer/shadow_blades，教学bandit共用前缀）的基础近战已接入 EnemyMelee，原版完整前三关与3-2仍未验收。

原始源：all/scripts.lua740–788、all/script_utils.lua3212–3275（walk until blocked）、3277–3301（wait for blocker）、3457–3661（melee）、3669–3700（mixed）、2782–2793（can_melee_blocker）、all/utils.lua233–353（角度动画）。原函数GOTO反编译失败时用完整字节码及实际原协程运行验证。

已实现：

- 保留选定阻挡者，攻击过程中不因其解除阻挡、死亡或另一名士兵接替而重选。每个命中点仍检查该目标是否在阻挡列表；可对已死亡但未解除阻挡的目标生成伤害，health忽略伤害后pops仍消费原随机调用。
- 敌人插入时攻击时钟从出生时间起算。冷却为原版inclusive比较；命中等待使用实际double减法，无epsilon，因此某些名义6tick命中要到第7tick，不能统一提前。
- 读取上一帧render的animation runs。动画结束切idle并inner-yield；下一次发现目标无效再outer-yield，此后才能walk。正常预测、箭/炮/英雄预测也把meleeHolding计为停留。
- 原版命中前的眩晕可中断；命中后的动画等待存在反向ignore_stun测试，本次保留其实际行为。眩晕/陷阱/传送系统不再先清空受管理的攻击字段来绕过协程；外部显式清空仍有状态保护，避免Gerald传送重放时报空对象错误。
- 按原版三方向动画角度边界及angles_stickiness保留方向滞后；实际渲染使用原生非循环攻击帧和循环idle/walk帧及独立朝向。接通hit_fx、damage的全局分配，但完整统一health/main和pops/tween注册仍未完成。

## 原版差异测试

export_enemy_melee.lua实际运行四类敌人完整原main_script、原insert/health/pops/animation_db以及level03真实路径。对照中明确关闭ranged并固定可行走陆地，士兵不跑main，声明阻挡变化、到位和死亡输入。四类×两种出生时间×11场景=88组、21,120帧，覆盖连续攻击、解除阻挡、再阻挡、换人、未到位、眩晕，以及目标已死仍暂留阻挡列表。

verify_enemy_melee核对每帧位置/节点、攻击ts、动画名/ts/loop/frame、两目标HP、RNG调用数及damage/sound/hit_fx事件。全通过。RNG为固定0.25，初始动画相位由此夹具明确输入；没有证明全游戏音频实际播放、完整远程/技能协程、随机序列全局一致或SSO共享排序。

修复的旧夹具输入：enemy-melee-damage、Gerald dodge、Zefira stun原始夹具显式a.ts=-10且只调用一次SU攻击，而旧JS依赖不正确的立即开打和meleeReadyAt=Infinity。现在显式设置相同ts，并在一次开始后禁用下一次选择，不影响正在进行的攻击。完整88组full-main测试另验证正常出生冷却与重复攻击。Gerald dead-survivor已有idleStartedAt接口保留，实际图集时钟仍按原规则。

完整npm test与npm run build通过。真实UI建兵营+原版波次浏览器夹具（browser_enemy_melee）以声明的rally和script lock移除阻挡者，验证目标/位置保留→动画完成idle→外层yield→真实walk帧；knight-death浏览器回归也通过。无page/asset错误，web-enemy-melee-retained.png已检查。声音听感尚未逐段比对。

## 实际关卡证据与下一步

全25系统原脚本fresh export（beta3，正常/constant两个输入，共2782tick/3714事件）完成且无协程错误。verify_native_level_runtime是事件重建证明，不能称GameSession全局一致。

真实GameSession恒定半值smoke首次位置/HP/节点差异从891推进到926；金币首次仍1068，注册表首次仍585。第一20个法球队列时间、holder和语义目标一致；第21个在901同时由holder6发出，web目标12/native目标10，造成926 web bandit12HP32/native40。

fresh native acquisition901：原版候选[98,100]（本地出生序对应[10,12]），网页仅[12]。双方目标10坐标完全相同502.41915438402555,346.05593040494193，原版FFE预测位置504,347是路径当前节点。holder6射程原点541,455，range160：连续坐标椭圆距离平方25710.543485>25600；路径节点25173.081633<25600。

因此下一步不是调整伤害/金币或随机数：原版wizard acquisition传FFE prediction_time=0；Lua的0仍truthy，FFE以P.node_pos判断范围，网页wizardTargets错误地使用e.path.position。原16848/4212目标夹具全部把敌人放在节点上，无法覆盖这个差异。应加实际between-node/off-node射程边界原生夹具，再修正0预测节点射程，保留攻击node_prediction的未来节点valid过滤。不要把当前大样本测试当作这条未覆盖行为的证明。详见native-level-runtime-diagnostic.json，native acquisition观测窗口已扩展至930。

fresh opening82822：2055帧、4次投石/12次法球、7373独立原生行走样本。仍是规定actor/HP/order的组件比较。fresh正常动作probe enemy-melee-playthrough.json：1-1win20/272.7，1-2win1/151.1667，2-1win20/437.5333，2-2defeat124，3-1win6/673.0333，3-2defeat109.9667。4胜2败，未完成视频或完整3-2验收。
