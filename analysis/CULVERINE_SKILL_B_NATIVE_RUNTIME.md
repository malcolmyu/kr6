# Culverine B：锋利弹片

原始依据为 APK `gc64/kr6` 的实体模板和 LuaJIT 协程，网页实现使用原始图集及动画。附件和解包文件只作为行为证据。

## 实现

四级塔正常技能菜单开放三级 100 金币购买。按原版在外层未阻塞循环与成功开火后消耗技能 changed；蓄力途中升级保留本次攻击，后续切换至对应等级弹片射线。弹体自己的 main 创建范围伤害与命中贴花。

每个范围目标先分配 damage 再分配减甲修饰器，遵循原版表遍历和队列顺序。三级永久物理减甲分别为 0.04 / 0.06 / 0.08；维护原始 raw_armor 并钳制可见 armor。原始 insert 在应用后返回 false，因此真实编号、排队与 insertRejected 均保留，但修饰器从不注册为持续实体。它不检查 health.dead；仍在注册表中的阵亡目标按原版可被影响。Boss、可见性 bans、零护甲及失踪目标依原版拒绝。卖塔不会恢复永久护甲。

## 当前证据

- `verify_culverine_b_chain_all.mjs`：九条 700 帧原始完整链，共 6300 帧；覆盖三级、连续购买、蓄力中购买、零护甲、卖塔、移除目标与移动目标。随机流、完整实体事件/表/队列、全部攻击时钟和五部位动作、射线/范围/贴花生命周期及 HP/护甲/raw_armor 匹配。
- `verify_culverine_b_insert.mjs`：216 次原始插入尝试，覆盖三级、耗尽、零值/超上限/raw 值、阵亡、失踪、Boss 和 bans，包含永久副作用、注册拒绝与无 RNG。
- 普通第三关输入：`native-runtime-culverine-b-mixed-input.json`，合法九星已通关配置、原始 400 金币及正常建造/升级/卖塔/英雄/能力指令；三级购买发生于 10065 / 11265 / 12465。
- `verify_native_hero_profile.mjs --culverine-b`：整场 19603 帧自然败北；24986 事件、32728 RNG、33223 Culverine 模型状态、3707 个已有 raw_armor 的敌人状态匹配，并核验三档弹片实际发射及全部注册敌人的护甲。
- `verify_native_battle_sounds.mjs --culverine-b`：1769 次有效原始引擎音效请求的名称、时机、顺序匹配；GUI 波次/失败声音单独检查。
- 原始绘制 oracle：9929 检查点，完整输出 541578892 字节。Chrome 全部9929个检查点/1119984个提交帧通过，包含原始四级EXO、三级弹片射线、命中贴花的图集帧、透明度、可见性、场景顺序，以及完整事件/音效与真实失败结算界面。

- `browser_culverine_b.mjs`：正常四级建造、三级100金币菜单购买、实际弹片/命中贴花的原生绘制编号与透明度、卖塔后的永久护甲和完整光效清理通过；无页面/资源错误。该专项使用静默波次、冻结目标和充足金币，不替代普通战役。一级和三级截图已经目视检查。

`npm test` 全部通过（包含基础 Culverine 八条链、B九条链和216次插入），`npm run build` 通过。日志 `culverine-b-regression.log` / `culverine-b-final-build.log`。

完整 trace SHA256 `0e3885cd9414889646d831a4edea22b2205af1f7d6ed2ccbabaccfecf9fba0b6`；frame stream SHA256 `204fb6d2eb4274f28459f0036c90617e0973d26484caeff58b1024cf1bc94ceb`。

绘制源 SHA256 `721e8e52f22f1482762a4665f360dfe03587d917678b0ddd933c4f69ca1c2f7b`；sample stream SHA256 `8bc4c46c4f4b0da7e0f5bff2944d0f777e06ee03da65e4df12a846cc77d6e405`。stream 保留完整行及尾部原始模拟元数据，浏览器检查元数据与逻辑 oracle 一致。

这些证据不替代全新存档六流程通关、视频逐项对照、实际听感及完整目标交付。
