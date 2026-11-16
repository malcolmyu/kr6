# 视频推定配置的原版开场对照

本轮建立了带英雄 XP、英雄技能、全局升级和真实移动指令的原版 simulation 开场输入，用来区分视频配置不确定性与网页引擎差异。它不是视频的精确复播：输入仍来自 page06-opening.json 的观测时间窗口和推定拖放端点，真实保存配置和随机状态未知。

export_level_entity_bootstrap.lua 现在可读取 heroXp、heroUpgrades、globalUpgrades；由 APK 的 level init、升级和英雄脚本处理。新增受控 LCG104 随机流，与网页同算法、同初始 seed。该流用于同输入差分，不声称识别出视频原始随机种子。

prepare_native_video_opening.mjs 生成前 82 秒的正常建塔、英雄移动、兵营集结和开波指令，场景起点推定为媒体 13.5 秒。角色为 Gerald XP3500/等级2、Zefira XP5500/等级3，使用现有推定技能；全局升级 mages:l1、artillery:l1+l2。角色移动执行提取出的原 GUI helper5113；兵营移动按原 GUI4979设置 rally_pos/rally_new。没有修改英雄位置来跳过移动，也没有补金币或强行接受 82.5 秒的建造。

原版命令：

reference/luajit-beta3/src/luajit scripts/export_level_entity_bootstrap.lua 3 iron cleared video-opening runtime 2055 analysis/native-runtime-video-opening-input.json lcg104 no-trace analysis/native-runtime-video-opening-profile.json

原版完成 2055 tick（媒体 82 秒）、702 个实体事件、next ID204；资源和动画缺失均为0，日志无 coroutine ERROR。此输入使用已通关前三个战役的存档，原版 playerLevel 为3；差分网页也用该值，避免继承旧重放中推定的4。两个英雄初始等级/XP均与输入一致。它是开场片段，没有到达关卡结局。

| 媒体秒 | 网页同输入金币 | 原版同输入金币 | 视频观测金币 |
| --- | ---: | ---: | ---: |
| 77 | 70 | 70 | 90 |
| 78 | 75 | 75 | 无该秒检查点 |
| 80 | 85 | 85 | 100 |
| 82 | 90 | 95 | 100 |

因此不能继续把媒体77秒的20金币缺口直接归因于网页选敌：这组推定输入下，原版自己也未达到视频数值。需要继续核实配置、释放位置/时间、难度与随机状态；不能据此宣称 APK 与视频版本不同，也不能调整平衡来填差额。

同时发现确定的网页遗漏：解锁 Zefira skill_b 后，原版自身第一帧 main 创建 aura_zefira_skill_b_check（ID60），下一 flush 入场；网页没有这个实际控制器。第1 tick分配器即差1，第2 tick实体数量差1。尽管随机调用数量一直相同到1937 tick，1938开始变化；1967出现英雄经验差异，1992开始有同输入经济差异。原版 helper7445 独立持有技能时钟、检查阻挡目标和范围敌人、发放技能 XP、排队护刃光环及声音。下一步应移植实际检测器与子光环/护甲/命中逻辑，不能用仅补 ID 的占位实体通过检查。

诊断文件 video-native-opening-diagnostic.json 保留首个分配/数量/事件/RNG/英雄经验/经济差异。分配器已经不同以后，普通敌人和士兵的相同数字 ID 不再代表同一对象；脚本只比较仍保持身份的两个英雄，避免将错位 ID 的对象冒充 HP/位置差异。两个英雄在整个片段的位置与原版一致，没有据此声称所有移动场景完整正确。

本轮只改分析/导出/诊断工具，没有改变生产游戏逻辑。22组原版 bootstrap 和既有完整1414帧 Royal 全图输入回归通过。没有重跑六路线或浏览器；上一轮3-2策略胜利242.13秒仍是历史记录。完整目标保持未完成。

Follow-up: the missing detector is now implemented with actual shield/slow controllers; the same2055-frame opening fully matches. Whole shield-family comparisons and remaining Gerald tick2112 gap are documented in [ZEFIRA_SHIELD_RUNTIME.md](ZEFIRA_SHIELD_RUNTIME.md). Native70 vs video90 at media77 remains unexplained by the inferred input/profile.

Longer observed/inferred actions now have a valid affordability-checked native export. The82–83s wizard build is moved from unaffordable midpoint2071 to first affordable2082 within that window. New2385-frame prefix/hero projectile comparisons and the next hammer2386failure are described in [VIDEO_OBSERVED_RUNTIME.md](VIDEO_OBSERVED_RUNTIME.md);4500native export alone is not web acceptance.
