# 血条与单位遮挡顺序

本次修复网页将全部血条绘制在最上层的问题。原版血条属于 `health_bar.z or Z_OBJECTS`（3000），与单位共同排序；前排单位可以遮住后方单位的血条。因此，视频里可见的绿色/红色色条长度不能直接作为完整血量读数。

依据为 APK `all/systems.lua` 的原始 render init/insert/update 字节码，导出脚本实际执行这些函数。可读反编译见 `analysis/functions/render_update.lua:159` 与末尾插入排序、`render_insert.lua`。原版规则：先 z 升序，再 `sort_y or pos.y + sort_y_offset` 降序，再 draw_order 升序，最后 X 升序。血条位置为 floor(X)、ceil(Y)，draw_order 为 `(health_bar.draw_order * 100000 + 1/2 or 200002/200003) + entity.id`。

网页现在将血条放回对象绘制平面，并使用原版 registry ID 和背景/前景绘制序号。敌人、士兵/英雄、塔与环境对象也携带原版绘制序号；EXO 作为一个原始帧整体参与排序，内部部件连续绘制。调用 setOrder 在动画之后的士兵也立即更新既有 EXO 部件。

验证与边界：

- `scripts/export_healthbars.lua` 重新执行原版函数，扩展 552 帧血条样本，包含 z、draw_order、sort_y_offset。对应测试覆盖现有淡入淡出、显示隐藏、坐标、宽度及新增排序元数据。
- 同一导出脚本将三组受控输入交给原版 render update 的真实排序函数，覆盖前后遮挡、同 Y 的 draw/X 决胜及 sort_y/sort_y_offset/z。未用网页比较器生成预期值。
- `scripts/export_video_render_order.lua` 在原版开场实际运行中，采集 1845、1850、1875、1905 帧的敌人 90–93 及血条在 `store.render_frames` 中的顺序。四组输出无缺失资源/动画，网页排序与其匹配。此为推定输入/profile/LCG104 的原版场景，不代表已定位视频的随机流。
- `verify_native_painter_order.mjs` 另外检查 EXO 部件整体排序、动画后的 setOrder、极近 Y 以及新旧渲染器混合时比较器的传递性。
- Chrome 整场 3-2 胜利回归通过 8699 帧、23700 实体事件、1762 原版命名音效请求；73 个实际绘制检查点检查 314 个血条网格、23690 个 EXO 部件及 1500 组前排单位/后方血条关系。数字为跨检查点累计，非独立对象数量。实际透明绘制队列用于验证；截图 `web-native-full-3151.png`、`web-native-full-6107.png` 已查看。
- 死亡/绝境求生/传送完整场景回归也通过6223帧、14142实体事件和1105原版命名音效请求；55个绘制点累计检查184个血条网格、16834个EXO部件及977组遮挡关系。自然败北为这组输入的原版结果，不是关卡通关验收。
- 生产构建、完整 `npm test`、胜利与复活两组浏览器进程均终止且退出码0。构建仍有既有大包体提示。
- 这次保留既有 world z bands。尚未宣称所有特效、投射物与所有非 3000 图层均已统一为原版完整帧调度；后续需要继续逐类核对。

# 视频配置的新证据

媒体 20 秒选中“守卫骑士团1级”，面板为 HP45、伤害2–4；原基础 HP40，经合法一级兵营全局升级 1.1 倍和 round_five 得到45。这给此前推定配置增加了可见数值约束，已记录于 `reference-inputs/page06-opening.json`。在当前有限的四技能点模型中，测试配置改为兵营 l1 + 投石 l1/l2（移除原推定法师 l1），输出独立的 `native-runtime-video-guard-evidence-profile.json`，未更改生产默认升级或伤害。

原版 seed104 实际配置为 guardHp45、wizardMin6、catapultMin15.4；四个金币采样仍为70/70/85/95。网页在此固定配置下检查 256 个 LCG 种子，四采样点仍无精确匹配。最佳 seed16 为70/75/90/95，而视频为70/90/100/100。这不是对任意随机状态、任意配置的排除，也不能用来改金币或伤害以硬凑视频。

原版 fresh-iron 与 cleared 对照在此前固定配置/seed104 下经济采样相同，不能用“已完成铁人”简单解释该差异。视频敌人图像匹配结果在 `video-bandit-hit-pixels.json`，仅作像素定位线索，尚未证明跨帧身份；血条遮挡使旧的可见色条反推 HP 方法不可靠。

完整视频输入、配置和随机流对应、其余混合能力、启动/建塔动效和听感验收仍待完成，原目标继续保持未完成。
