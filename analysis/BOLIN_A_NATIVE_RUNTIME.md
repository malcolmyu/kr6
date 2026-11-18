# 博林 A「烟雾迫击炮」原版实体与绘制验收

## 状态与范围

迫击炮三档、路径预测三个落点、炮弹/粒子、伤害、烟雾与减速区域、弹坑淡入淡出及两项具名音效请求已接入正式GameSession。21条原版链/24200帧和Chrome三组/3300个检查点通过，含合法A+C组合、眩晕、阵亡复活和路径边界。

这些是受控原版对照，不代表普通战役整场混战、正常英雄换队、六流程新档通关、参考视频或实际混音听感已经验收。雷区、天赋2、ultimate、移动近战与特殊死亡仍待完成。

## 原始依据

- 原版英雄main字节码`functions/bolin_hero_update.bytecode.txt`0466..0674：16秒冷却严格大于；以炮弹固定高度和重力计算预测时间；要求预测位置在最小/最大椭圆范围内、NF_NO_BACKWARDS有效且至少三个目标；1.5秒前摇后同时创建三发炮弹，飞行时间依次增加0.18秒。
- `functions/bolin_nested_8445.lua`：预测目标在前摇+飞行后所在节点，找同路径中线最近节点，每次搜索合法节点并回退10个节点；通过`point_in_valid_path`过滤。缺失的第i个落点使用第一个落点。
- `functions/bolin_find_valid_node.lua`：每次查找前都先将节点号夹到[1,路径长度]；不能在0处直接停止。路径6节点20用例曾使第三发错误地落回第一个点，原版第三发应落到路径6节点1；已修正，首个失败保留于`bolin-a-edge20-path6-first-red.log`。
- `functions/bolin_point_in_valid_path.lua`：路径中线点还需满足默认节点有效、土地/冰面、非NOWALK和路径激活。相关位标记直接从APK导出。
- `functions/bolin_initial_parabola_speed.lua`与`bolin_position_in_parabola.lua`：保留原版浮点运算顺序，不以通用弹道近似替代。
- `functions/bolin_skill_a_bullet.lua`：首次main先创建粒子；逐帧抛物线与旋转，中途变层；落地按原顺序创建区域、烟雾、弹坑、停止发射粒子、分配整数随机范围伤害，再播放独立爆炸动作。
- `functions/bolin_aura_bolin_skill_a_slow_insert.lua`、`bolin_skill_a_aura.lua`、`bolin_mod_bolin_skill_a_slow_*.lua`：区域4秒/半秒周期、排队插入、同级刷新、真实速度乘除、严格持续时间、目标失效清理。
- `functions/bolin_skill_a_smoke.lua`和`bolin_decal_bolin_crater_*.lua`：烟雾入场/循环与反向2秒淡出；弹坑按落地帧开始1秒淡入、等待4秒后拒绝首次删除并反向1秒淡出。补间未显式设置ts时使用原始sprite时钟。

## 正式实现

`BolinMortarController`负责施法、冷却/打断、目标排序、路径落点与攻击收尾；`BolinMortarRuntime`负责独立炮弹/区域/减速/烟雾/弹坑实体，并将伤害交给共享伤害队列。HeroSystem与GameSession接入实际创建、插入、主脚本、粒子、补间和删除阶段。

`FirebookTrailSystem`使用直接导出的迫击炮粒子配置；`BolinMortarRenderer`使用原始EXO/图集、烟雾偏移(-18,-15)与1.5倍缩放、原版锚点及动态层级。伤害、技能经验16/32/48和音效均来自原始模板/升级补丁，未在网页另造数值。

音效请求在发射时分别提交施法声和延迟1.16619037896906秒的三重撞击声。原版请求录制已改用精确float64编码，避免dkjson默认输出把延迟截为1.1661903789691；网页版通过App→WorldRenderer→AudioManager保留delay参数。两项原始OGG均已存在，实际听感仍待最终验收。

## 逻辑证据

`scripts/bolin_a_chain_cases.mjs`共21条：三档、左右发射、目标不足、飞行目标与无目标、前摇/发射边界/收尾眩晕、目标提前移除、离开/返回区域、运动免疫、落地前变为飞行、路径1节点19/20和路径6节点20、合法A+C两档组合，以及前摇/发射后阵亡到复活的1650帧两条链。

每帧验证真实实体表、全局ID/稀疏表状态、插入移除队列、全部实体事件、随机调用、HP/经验/积存经验、英雄动作/方向/计时/回血、A冷却时间、炮弹初速度/轨迹/旋转/层级、区域/修饰器时间与来源、敌人实际最大速度、全部粒子、烟雾与弹坑动画时钟/透明度/补间及每次具名声音与精确延迟。C组合仍沿用C射线严格状态检查。

- `bolin-a-final-native-gate.log`：最终21条/24200帧通过。
- `bolin-a-full-regression.log`：完整默认npm test退出0；当时A集合为19条/20900帧。之后新增的两条1650帧死亡链独立通过，最终21条合集再次通过；没有改动产品逻辑。
- `bolin-a-final-build.log`：最终vue-tsc与Vite构建退出0。
- `git diff --check`通过。

## Chrome绘制证据

| 场景 | 检查点 | 实际场景排序元数据 | 博林家族绘制条目 |
| --- | ---: | ---: | ---: |
| 右向A | 1100 | 65896 | 17421 |
| 左向A | 1100 | 65896 | 17421 |
| A+C同时启用 | 1100 | 68807 | 21944 |
| 合计 | 3300 | 200599 | 56786 |

比较真实Three.js渲染列表：各EXO部件/图集帧/透明度、粒子、动态图层与场景顺序。左向与组合另外比较原版原点+offset后的实际根节点位置与scale，覆盖烟雾偏移及1.5倍缩放。页面异常与资源缺失均为空。

原始绘制JSON已无损gzip，SHA256见`bolin-a-paint-compression.json`；没有抽帧、修改预期或降低精度。浏览器支持自动读取.gz，并按共享输入脚本内容哈希加载。

```sh
npm run test:native-bolin-a
npm run test:bolin-a-paint
```

差分原始JSON、PNG与逆向运行环境保留在本机，仓库克隆不直接附带全部逐帧oracle。

## B准备与未完成内容

已建立合法skill_b存档的原版900帧布雷轨迹，实际创建四枚地雷弹体及四个触发区域。B要求战斗波次已开始且附近150范围没有敌人；波次0控制组不会布雷，不能用于声称技能已实现。控制输入在第20帧设置wave_group_number=1、将目标移出附近范围，原版与网页共享相同输入；网页首次差异为第181帧布雷位置的随机调用。见`bolin-b-first-red.log`。弹体与触发区域已反编译，但B正式运行时仍未实现。
