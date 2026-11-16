# 首次真实插入与 SSO 持久索引

本轮在上一轮的初始化前缀之后，执行原始系统初始化及第一次实体插入处理。仍未把新注册层接入正常 GameSession，也未修复已知双弹变化随机序列的粒子分配差异。

## 原始执行与边界

`export_level_entity_bootstrap.lua --insert-all` 对22个既有测试输入分别启动 beta3 VM。系统顺序来自原始 game.lua 静态表；按实际 `require('klove.sso')` 和 `GS.power_xp_tracking_system` 解析动态槽，得到第5项 sso、第14项 power_xp_tracking、第25项 sso_post。使用原始 simulation.init 初始化所有系统，保留全部已注册的插入/删除/排队回调；只在第一次 do_tick 前清空 update 阶段，以隔离插入处理。该结果不是完整第一帧游戏更新，更不是整局验收。

资源动画/EXO加载及图集查询仍沿用上一轮明确的资源替代；本测试不证明预览图、动画资源准备或绘制正确。声音库改为执行原始 sound_db.init，加载 APK 的 settings/sounds/groups/extra 元数据；声音排队保留原方法，没有启动播放或声卡。本轮22例没有缺失声音或 Lua 执行错误。相机/存储/翻译环境仍为上一轮的明确测试输入。

观察回调只记录结果，不改变返回值。额外监听 E.clone_entity：这22次首次插入过程中未发生克隆；这不证明运行期也没有克隆。

## 原版插入造成的结构变化

- `scripts.editor_wave_flag.insert6105–6120` 将入口写入 locations，按 path_id 排序，然后返回 false。地图入口仍消耗编号，但拒绝进入实体表，并跳过后续插入回调。本轮22例共有76个这样的拒绝事件。
- `scripts_game.controller_tower_knights_tutorial.insert19425–19450` 查找已入表的5号地基，创建/排队一级兵营，并排队删除地基。插入队列继续处理新兵营，随后才处理地基删除；第一关首次战役的 count/max 分别39/40，不能按最终唯一数量抹平峰值。
- `scripts_game.decal_stage_02_chess.insert35080–35087` 查询已插入的棋盘控制器。三个棋子插入时，先前新建的控制器仍在队列末尾，因此会各建一个，合计三个；按“控制器已经排队”去重会偏离原版。

`LevelEntityInsertion.ts` 迁移上述**分配及接受/拒绝**行为。地基/兵营持有者身份保留在注册描述符中。这些描述符不替代实际游戏的组件、兵营部署、英雄状态或绘制对象；入口 locations、完整模板属性复制等其他字段副作用仍不由这个分配验证器证明。

## SSO 持久索引

`NativePersistentEntities.ts` 迁移 systems.sso_post541–583 及 sso.reset_p_lists13–20：四个列表为 alive_enemies、graveyards、modifiers、towers，使用同一个数字键 Lua 表算法。

alive_enemies 的条件包括 main_script 加敌人/生命、敌人/死亡生成、**非 eternal** 生成器、picked_enemies 或 tunnel；KR3 的 nav_faerie 是额外分支。已有 health.dead 标记并不让它在此插入阶段自动跳过。删除时，只要存在 main_script 就会对 alive_enemies 写 nil，即使该对象从未属于该列表；这也会改变哈希槽状态。0按Lua真值处理。

独立 `export_native_persistent_entities.lua` 直接执行原始 sso_post。六组密集/稀疏和KR3开关轨迹，共612步，覆盖组件条件、无脚本对象、死亡标记、有限/永续生成器、0/false、缺失键删除、重复删除/重插及重置。原始轨迹检出了初版对 spawner.eternal 分支的误读和重置时漏建四个空列表的问题，均已修正。

22组真实首次插入结果也逐项比较这四个持久列表的成员和遍历顺序，包括教程中的地基删除及两个教学敌人。随后另行迁移了每tick的包围盒空间网格及粗筛，见 [NATIVE_SPATIAL_CLONE.md](NATIVE_SPATIAL_CLONE.md)；仍未接入正常战斗及完整调用方窄筛，不以持久列表一致代替空间行为一致。

## 随机调用观察

固定 math.randomseed1234，并记录原始调用参数、值、源行及当前插入回调：每例的 E.load 模板初始化在 templates_game.lua23927 消耗19次整数[0,360]调用；首次进关测试队伍的第一关另有7次、第二关29次 render.on_insert 的随机时间戳调用，第三关没有额外 render 调用。此次只保存证据，没有在网页里随意丢弃同样数量的随机值；正常战斗的完整随机流尚未迁移。

## 验证及未完成范围

`verify_level_entity_insertion.mjs` 比较22组的1803次创建、76个拒绝对象、嵌套创建/排队/删除、最终表遍历、count/max/nextId及四个SSO持久列表。原始执行共记录18,766次插入回调。TypeScript没有读取回调轨迹作为规则，也没有读取最终顺序作为排序输入。

新增导出及两个验证器已加入 export_web.lua / npm test。完整导出、全量测试和构建的最终结果记录于 VIDEO_OBSERVATIONS.md。正常渲染/战斗入口未切换，当前没有新的浏览器画面改善可宣称。下一步仍需运行期创建/克隆/排队/删除及全局阶段接入，之后再替换战斗中的编号和遍历。完整3-2、视频开局战况、C及其他技能、全局伤害/空间筛选和视觉音频验收保持未完成。
