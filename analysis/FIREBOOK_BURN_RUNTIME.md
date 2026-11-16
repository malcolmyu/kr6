# 火球燃烧的真实实体与自身主脚本

本轮调查发现，火球燃烧虽然已有独立伤害与动画模拟，却没有注册为普通GameSession的原始修饰器实体，也没有按其自身main_script回合执行。仅把它改成原始绘制序号会掩盖这个更大的运行时遗漏。因此先接入实际生命周期。

## 原始依据与实现

- APK `all/scripts.lua` mod_lifecycle insert：先处理同目标已有修饰器。同级刷新原实体并拒绝新实体；强级排队移除旧实体并继续接受新实体；弱级拒绝。该流程先于修饰器自身的可见性/生死验证。
- APK `kr6/scripts_game.lua` firebook insert1884：接受活着、已注册且通过vis的目标；继承目标精灵z，设置原始sprite时钟、四秒持续时间、按等级2/3/4的固定伤害与首轮立即可执行的quarter-second DPS时钟。
- APK `all/scripts.lua` mod_dps4837：首次自身main将pos引用目标位置；每个自身回合检查目标、死亡与持续时间；每0.25秒创建damage实体并排队交给health。即使固定伤害也消耗原始随机调用。结束时排队移除，下一次flush才从注册表退出。
- 原始bullet34100字节码先创建/排队命中damage，再创建火球修饰器。RangedCombat中已将修饰器排队移动到命中damage之后，恢复实体创建顺序。

新增FirebookBurnRuntime并接到RuntimeEntities和普通GameSession：真实queue/insert/reject/remove、modifiers持久索引、按原始实体表顺序执行main、DPS伤害创建。保留旧的无注册表独立模拟路径，原来的独立函数对照仍可执行。目标修饰器查询遵循原版从持久索引过滤到新Lua表再遍历的顺序，供本次修饰器替换使用。

进一步核对bullet34100发现其范围目标来自真实U.find_enemies_in_range/SSO，而不是敌人生成数组。火球范围命中现通过普通GameSession的原始空间候选查询，再做原版半径与vis过滤；命中damage与mod按该顺序创建。新增12组真实SSO跨网格边界的原始火球执行，对修饰器目标顺序作严格比较，不排序后掩盖差异。一组原版顺序为1、7、2、3，原生成数组顺序为1、2、3、7；新实现与原版一致。

渲染器使用已注册修饰器的ID、目标z与原draw_order2，不再给它虚构身份或固定epsilon；视觉位置、排序位置与unit.mod_offset分别处理。依据teleport5680中SU.hide_modifiers，目标传送隐藏时保留燃烧对象与动画时钟，仅隐藏其图像，随后恢复；浏览器另验证了该隐藏标志的图像行为，完整传送与燃烧混合原版轨迹仍待采样。

## 验证范围

`export_native_firebook_burn.lua` 真正运行原始mod_lifecycle/main_script/health，控制目标和指令以隔离该家族，不替换原始修饰器函数。39组、8190帧覆盖3级的基础、同级刷新、强级替换、弱级拒绝、连续多实体插入、到期边界刷新、死亡/移除目标、vis拒绝、immune及ignore_damage。

`verify_native_firebook_burn.mjs` 使用生产的原始注册表模型、生产燃烧运行时与实际RangedCombat伤害队列，逐帧比较HP、随机数调用、所有create/queue/insert/reject/remove事件、分配ID、Lua实体表顺序、count/max、待插入与待删除队列、完整注册燃烧位置和时钟。39组完整匹配，已加入默认npm test；另有12组跨网格原始SSO火球命中顺序对照也进入默认门禁。该测试是受控原函数集成，不代表整个原版健康系统调度已经全部还原。

实际Chrome火球法师测试通过三级技能购买/施放、命中、燃烧及卖塔后的存续/清理；新增断言要求燃烧对象确实注册、pos确实引用目标、实际绘制帧携带该修饰器ID及原始draw/z/Y/X，并检查前一个分配实体为该次命中damage。此页面使用受控5000金币与冻结目标，不能当作正常关卡通关证据。

生产构建、完整npm test和既有3-2完整胜利浏览器回归均通过。既有合法输入仍匹配8699tick/23700实体事件/1762命名音效请求，187个画面检查点的原始帧队列检查保留。文件日志为firebook-runtime前缀。

另外进行了正常600金币铁人配装的单法师塔策略探测，所有购买按实际金币支付，不注入经济或胜利。当前最后一组在3271帧自然败北，买到四级塔但没有足够金币买A，burnFrames=0；其输入/profile/probe日志仅作下一步策略与完整原始混战采样线索，不能拿来验收火球整场运行时。完整普通输入高级能力/全局health交错、其他高级塔实体与画面、视频流程/启动/建塔/听感仍待继续核对。原目标保持未完成。
