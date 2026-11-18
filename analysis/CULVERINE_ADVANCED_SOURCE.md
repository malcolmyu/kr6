# Culverine 其余高级能力原始依据

`export_culverine_advanced_functions.lua` 从原版 E.entities 读取 A/C/ultimate 模板并导出原始函数，保持网页数据不变。输出 `culverine-advanced-templates.json` 不通过 create_entity 分配 ID。

A：硫磺爆裂三级价格125，冷却16秒，cast1.2秒、动作1.8秒；原始 timed_attacks.list[1] 的目标条件含 min_targets=3、min_magic_res=.3。第一档购买把 ts 设为当前时间减冷却，但何时启动仍须依原协程分支验证。

A 弹体使用通用 bomb 抛物线，飞行35/30秒、重力-900、旋转10、轨迹烟粒子、地形水花/贴花、落点爆炸及原表顺序区域伤害。命中创建持续6秒/每.25秒施加修饰器的区域。A 修饰器和 B 不同：持续.3秒，拒绝 dead 或 cannot_accept_magic；insert 按当前 magic_armor 乘模板 factor 临时降低魔抗，记录实际损失；remove 恢复该份损失。因此不能复用 B 永久物理减甲。

C：三级价格150/200/250、25秒冷却、3/6/9发、.1秒射速；有.7666666666666667秒 buff阶段、.03333333333333333秒命中阶段和.9666666666666667秒 rest 阶段，前后两层光效、专用 shotfullthrottle/reloadfullthrottle 动作。完整触发/中断/重装顺序现已按13条原始链与普通整场核验，见 CULVERINE_THROTTLE_NATIVE_RUNTIME.md。

ultimate：模板 active=false、disabled=true，attacks_to_trigger=7、shoot_time=.4。前三关最高4点全局升级点，ultimate节点本身需5点、完整最短前置需14点，目标范围内不能合法购买。见 FIRST_THREE_TOWER_ULTIMATES.md。

已解码函数：`analysis/functions/culverine_a_bullet.lua`、`culverine_a_aura.lua`、`culverine_a_mod.lua`、`culverine_a_mod_insert.lua`、`culverine_a_mod_remove.lua`。反编译结果只是阅读辅助，存在局部变量/跳转还原歧义；以原始字节码与实际原版执行为准。A已接入并通过独立与普通整场逻辑对照，整场绘制也已通过，详见 CULVERINE_SULFUR_NATIVE_RUNTIME.md；C已实现并完成专项对照，ultimate在目标进度内不可购买。

`export_culverine_a_modifier.lua` 已导出36组原始 insert/remove 回调，包括三个等级、零魔抗、raw 超限、阵亡/缺失/禁魔/Boss/bans、删除时目标缺失及重叠回调的两种移除顺序。它不模拟注册表对同模板刷新和替换的规则，因此不能据此声称整链通过。三级模板 magic_armor_red_factor 都为1，即移除当时可见魔抗的全部值；强度差别应继续核对区域时长等模板，不臆造减抗系数。

原始嵌套函数已按行号独立提取并反编译：21545 更新技能，21574 朝向，21621 ultimate 触发，21626 A触发，21635 C触发，21644基础射线，21664 A投射物。A/C要求四级塔、not normal_bullet_loaded、未阻塞、存在 trigger_enemy、已解锁且 cooldown < tick_ts-ts（严格小于）。A条件为范围敌人数>=3 **或** 至少一只 magic_armor>=.3；C为人数>=3 **或** 至少一只 hp>=600。不能误写成同时满足。完整协程的优先级和等待阶段现已核验，包含目标空档后重现时额外yield、购买中升级与阻塞。

C首条原始1200帧链已采集：512事件。rank1先普通射击，再在body收尾分支开始 C 装填（tick56），tick80创建前后两层buff；首批射线112/147/182。buff前景有remove脚本无update，后景无main脚本；两者timed.disabled=true，由塔协程显式remove：前景在淡入完成后启动反向.6666666666666666秒alpha tween，淡入尚未完成则直接移除；后景始终直接移除。后景每次开火重置sprite.ts，前景保持自己的动画时钟。网页scene-entities及正式timed调度现已保留disabled，C实体不会被通用timedPhase按动画runs提前删除。C已接入生产控制器，最终验证见 CULVERINE_THROTTLE_NATIVE_RUNTIME.md。
