# 原版空间网格与克隆编号

本轮补上统一实体层仍缺少的两个基础：当前 APK 使用的 SSO 空间网格，以及 E.clone_entity 的编号副作用。正常 GameSession/RangedCombat 尚未切换到该层，现有双弹粒子分配差异也没有因此消失。

## SSO 当前分支

原始 `lib/klove/sso.lua` 在模块加载时将 bb_mode 设为 true，bb_step 为128；当前运行分支是包围盒网格，不是文件后半段的四叉树。

`NativeSpatialEntities.ts` 迁移 reset43、is_all_entities49、create57、insert73、filter91 及 `systems.sso.on_update499–526`：

- 每个 tick 清空空间网格，以原始实体表的 `next` 顺序重新插入。需要 health、vis、pos，并排除 pending_removal；health.dead 在这个阶段不是额外排除条件。
- 单元编号使用 ceil((坐标−原点)/128)。0点、负数、精确128边界及边界两侧都保留原始判断；w/h 是网格元数据，不用于自行裁切超出视口的对象。
- 查询按 X单元递增、Y单元递增、单元内插入顺序追加候选。结果列表保留调用前内容，不清空。
- 这是粗筛：没有额外添加圆形或椭圆距离判断。过滤回调收到单元内的1起始位置及实体，而不是全局实体编号；回调返回0按Lua规则接受。
- reset保存原始实体表引用；is_all_entities判断引用相同，返回true或nil，不是内容相等判断。

`export_native_spatial_entities.lua` 直接执行原始 systems.sso 和 SSO.filter。三种原点 × 三种实体编号间距 × 六次增删/重建，共54帧、2700个查询。输入通过 set/delete 操作驱动 TS 的 LuaEntityTable，再独立重建；没有把原始最终顺序喂给排序。验证比较每个单元、边界、候选结果及全部回调参数/顺序。

对照检出并修正了两处问题：Lua min/max在相等时保留第一个参数，和JS Math.min对正负0的处理不同；原始 dkjson 对小数仅输出约14位，会把精确网格边界两侧的输入挪动。导出器现在用17位十进制标记保存非整数binary64值，验证器再还原数值，没有放宽边界断言或添加容差。

四叉树分支、完整调用方的窄筛/优先级排序、正常战斗里的每帧空间快照接入不由本测试证明。

## E.clone_entity 原始行为

`entity_db.lua142–147` 的实际执行顺序是：

1. 用 table.deepclone 复制输入对象。
2. 将 last_id 写到**输入对象**的 id。
3. last_id递增。
4. 返回仍带旧id的副本。

这不是给新副本分配新编号的常见实现。源对象已入表时，改它的id不会改变原表键。随后把副本插回旧键会覆盖原值；按源对象新id删除时可能删除不存在的键，原计数也保留这种行为。

`NativeEntityRegistry.clone` 按原顺序实现编号/源对象副作用，并显式接受组件复制函数，和 create接受工厂的边界一致。它不声称已经提供能复制所有当前JS游戏类的完整 Lua深拷贝实现。

`export_entity_clone.lua` 直接执行原始 E/ simulation，四种起始编号、九步创建/克隆/排队/删除，共36帧。比较源/副本编号、表键与对象id分离、覆盖/删除结果、count/max/nextId，以及嵌套值隔离、别名分别复制、函数引用保留。测试复制器仅处理这些记录/原始值/函数输入；没有用 structuredClone 冒充包含函数的原版实体复制。

## 验证状态与运行窗口限制

新增导出和验证器已加入原始导出流程及 npm test。完整导出、全量测试、生产构建的最终执行结果记录在 VIDEO_OBSERVATIONS.md。

尝试用已有桌面兼容入口启动原版 LÖVE 来采集后续运行期轨迹，但 CUA 明确返回 macOS已锁定、无法自动解锁。没有得到可验证的关卡画面或运行轨迹，因此没有把启动进程当成验证成功。没有尝试绕过锁屏；已结束本轮自己启动的进程，未消费的开发控制探针移到 analysis/native-live-control-pending.lua。锁屏不妨碍继续无界面脚本迁移，不构成整个目标的阻塞状态。

下一步仍是原始运行期事件/共享分配器/全局阶段与调用方接入。完整3-2、视频开局战况、其他技能和视听验收仍未完成。
