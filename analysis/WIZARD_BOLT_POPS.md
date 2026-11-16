# 法球击杀字样

四级基础法球的原版 bullet 均声明 `pop={'pop_zap_blue'}`、`pop_conds=2`，`pop_chance=nil`。原包常量 `DR_DAMAGE=1`、`DR_KILL=2`，因此不能把条件 2 理解为普通命中。原版 pops 系统检查 health 阶段写入的击杀位；即使最终生命值被同帧其他伤害改变，也以对应 damage 的结果位为准。

本次在 RangedCombat 的塔弹局部伤害队列中保留 bullet 字样参数和逐条结果位。伤害仍逆序结算，之后按原队列顺序交给现有 DodgeSystem，由共享 DodgeRenderer 绘制。GameSession 使用与英雄、闪避字样相同的实例。法球来源没有 enemy/soldier 组件，字样位置采用目标位置、原版 unit 偏移和 pop_y_offset；原版图集帧为 `pop_0029`。

没有概率参数时不抽概率随机数，但会抽字样索引（即使只有一种）和 -21 至 21 度的整数旋转角度。免疫、忽略伤害、未击杀命中没有击杀位，因而不显示 ZAP。渲染沿用现有下一 tick 插入及原版缩放关键帧。

`luajit scripts/export_wizard_bolt_health.lua --pops` 运行原始法球 insert/update、health 和 pops，生成独立 `wizard-bolt-pops-oracle.json`，保留原有无字样对照。72 组、7,272 帧比较移动/追踪、HP/赏金、累计随机数调用，以及 16 次实际原版 pop 请求的时间、位置、图集帧和旋转；四级均有显式低血量击杀用例，也包括同帧双弹及 no-kill 非交换队列。

`node scripts/verify_wizard_bolt_health.mjs --pops` 使用生产 RangedCombat 和 DodgeSystem。浏览器回归额外检查非致命/免疫命中不显示字样，致命双弹生成实际可见 Three.js 图集精灵，位置和旋转与字样状态一致。截图是受控冻结敌人测试，不是自然通关或视频一致性验收。

范围仍为塔弹局部队列。其他攻击来源的全局伤害分发、伤害信号/经验归属、SSO，以及完整六流程的玩法、视觉和声音验收仍未完成。

后续火炎法书工作修正了此轮通用接线对炸弹的处理：原始 bomb.update 的伤害不携带 pop，而是每次落地调用一次 SU.create_bullet_pop。现按弹体落地位置处理，与法球逐条伤害的击杀字样分开，36组原始轨迹对照覆盖空落点及多个目标。见 WIZARD_FIREBOOK.md。
