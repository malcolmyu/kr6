当前实现与验证见 [CATAPULT_C_NATIVE_RUNTIME.md](CATAPULT_C_NATIVE_RUNTIME.md)。下文保留首次差异与当时尚未实现的状态；ready重置sprite.ts的早期推断已被真实原版轨迹纠正，正式实现保留旧时钟。

# 投石塔 C 正式实体缺口（历史记录）

A/B正式区域现已接入，C仍由私有 CatapultTraps 在RangedCombat前置阶段执行，缺少真实 trap/modifier ID与正式main/health时序。

已采集实际原版 `analysis/level-entity-bootstrap-3-campaign-cleared-catapult-native-area-c-runtime-lcg104.json`。命令：

```
reference/luajit-beta3/src/luajit scripts/export_catapult_c_native_chain.lua 3 campaign cleared catapult-native-area-c runtime 900 analysis/native-runtime-sulfur-area-input.json lcg104 none analysis/native-runtime-sulfur-area-profile.json 4 normal 1 sounds
```

场景在tick20插入四级投石塔、C等级1、冻结10000HP敌人，并把原版store.wave_group_number与网页waves.wave设为1以实际触发陷阱。这是隔离控制场景，不是普通输入战役。最初未设置wave时900帧无C实体，虽然比较通过却没有覆盖目标；现已更正，verifier新增所选技能必须实际创建载荷的非空断言。

当前原版在185/472/757创建三枚陷阱，第一枚在186插入，位置(497,302)。正式网页最早在tick185 nextId82 vs原版83失败，见 `catapult-native-area-c-first-red.log`。C未加入默认门禁，不能视为完成。该轨迹无实际触发眩晕，需要再做敌人进陷阱、途中移出、卖源塔、等级刷新/替换等实际触发轨迹。

原始函数：`analysis/functions/catapult_trap_insert.lua` / `catapult_trap_update.lua` / `catapult_trap_stun_insert.lua` / `catapult_trap_stun_update.lua`。

待实现点：真实payload、插入时set动画/等级伤害；首次main根据实际来源ID加入active_traps；set结束后ready重置sprite.ts；按SSO目标及原版8/128过滤触发，12/30秒后重选，逐目标先分配damage再分配stun；health队列结算、mod_lifecycle同级刷新/高低替换、mod_stun按等级1/2/3秒与实际stun_count、真实动画/偏移/loop；activate结束隐藏并从captured source.active_traps去掉自身，真实remove；投石塔controller读取正式active_traps数量。

现成 ArcherPierceStunSystem 可复用部分mod_stun回调，但其内部同模板处理尚不支持本技能高低等级替换，且C的duration在原版insert按等级赋值；不可仅接onQueue就宣称整链通过。
