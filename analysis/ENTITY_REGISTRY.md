# 实体遍历与注册层

本轮追查普通法球多弹变化随机序列的已知差异。没有把倒序或按ID排序作为修复，也没有宣称当前网页的多弹生命周期分配已经一致。

## 引擎版本基准

上传 APK 的 arm64 liblove.so 包含 `LuaJIT 2.1.0-beta3` 与 `luaJIT_version_2_1_0_beta3`。本机既有执行器为 LuaJIT2.1.1793383622。已从[官方 beta3 发布提交](https://github.com/LuaJIT/LuaJIT/commit/8271c643c21d1b2f344e339f559f2de6f3663191)创建独立工作树并构建 `reference/luajit-beta3/src/luajit`；未安装或替换系统解释器，原始源码无本地修改。

两个解释器的16,236次数字键表操作和八组双弹原始轨迹在被比较字段上相同，所以不能把这些现有差异归咎于解释器版本。`native-lua-runtime-audit.json` 记录 APK 库、解释器二进制、源码提交和比较结果。APK 的版本字符串不能证明其内部没有厂商补丁，也不证明官方2017版与其全部功能相同；这项限制保留。

## 已实现的基础

`LuaEntityTable.ts` 按固定上游版本的数字键算法实现数组/哈希两部分、数字哈希、碰撞链、扩容重排和 `next` 遍历。删除后哈希键槽不会立刻变为空闲；对不存在键赋 nil 也可能分配键槽。这些状态会影响后续顺序，无法由 Map 的插入顺序或简单排序模拟。

覆盖范围为实体使用的非负 signed32整数键，不是完整 Lua 表实现；字符串、对象键和 GC 指针哈希不在本轮范围。适用代码的 MIT 授权与署名保留于 LUAJIT_LICENSE.txt 和 THIRD_PARTY_NOTICES.md。

`NativeEntityRegistry.ts` 实现原始 E.create_entity125 的递增编号，以及 simulation112/139/150/166/186 的插入、删除和队列基础：

- 插入队列先于删除队列处理，回调中新排队的插入会继续当前插入循环；删除回调中新排队的插入等待下一 tick。
- 创建与成功插入分开：被拒绝插入的实体仍已消耗编号。
- 拒绝删除后 pending_removal 仍为真，重复请求会被抑制；重新排队插入会清掉该标记。
- 保留原始重复插入/删除不存在对象时的 count/max 行为，没有按“唯一存活对象数”自行纠正。
- 按 Lua 真值规则处理回调，0是成功值，false/nil才拒绝。

随后补上了关卡首次插入前的创建前缀，见 [LEVEL_ENTITY_BOOTSTRAP.md](LEVEL_ENTITY_BOOTSTRAP.md)，以及首次插入的分配/拒绝和SSO持久列表，见 [LEVEL_ENTITY_INSERTION.md](LEVEL_ENTITY_INSERTION.md)。克隆的编号副作用和SSO包围盒网格也已迁移，见 [NATIVE_SPATIAL_CLONE.md](NATIVE_SPATIAL_CLONE.md)。完整组件复制/回调、运行期共享编号与调度入口仍未接入；这些基础不等于完整第一帧或整局一致。

## 证据与验证

- `export_lua_entity_table.lua` / `verify_lua_entity_table.mjs`：36组、16,236次操作，密集/稀疏编号、碰撞、连续删除/重新填充、缺失键nil赋值、false值和扩容。beta3与既有新版执行器均匹配。
- `export_entity_registry.lua` / `verify_entity_registry.mjs`：原始 E/simulation 执行32帧、四种初始编号，逐项比较创建/队列/拒绝/回调事件、插入和删除队列、实体存在与顺序、count/max/nextId和时间。
- 在八组原始双弹中记录真实 insert/remove 操作。`verify_entity_iteration_trace.mjs` 从空表应用这些操作，以新的表实现重新计算主协程及粒子顺序，840帧均一致。算法没有读取观察到的顺序作为排序输入。

完整原始导出（新增基准任务也逐项执行）、全量现有 npm test 和生产构建通过。初次 TS 局部变量类型推断错误已修正，构建仍有既存 bundle 大小提醒。本轮没有修改正常战斗的调度入口，也没有把新增层接入 GameSession，因此未重跑浏览器来宣称一个不存在的界面修复。

## 未完成的接入

GameSession/RangedCombat 等模块仍使用各自的编号和现有顺序。原始实体ID不仅由弹体决定：所有 E.create_entity 调用都消耗编号，而实际入表还受队列、拒绝和删除影响。只把弹体/发射器放到一个新表、猜一个起始ID，会产生另一套不受原版证据支持的顺序。

已确认每次 `systems.level.init` 内的 E:load 重置编号，并迁移/对照了22组首次插入前的创建/队列前缀及首次真实插入的分配/拒绝/持久索引。下一步仍需运行中的创建/克隆/删除、其他组件副作用及共享分配器。当前 `verify_wizard_bolt_particles.mjs --paired-sequence` 仍失败，诊断仍是六组粒子分配差异、八组规定场景HP/赏金/累计随机调用相同。未把这个失败门槛删掉或放宽成通过。

2-2、3-2视频战况差异、C与其他技能、全局伤害/SSO、启动/音频/界面及完整六流程验收依然未完成；整体目标保持活动状态。
