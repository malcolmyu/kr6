# 法师FFE的 numeric-zero 路径节点射程

2026-11-16。修正正常GameSession中普通法球/火书的选敌射程；完整3-2与视频一致性仍未验收。

## 原版证据

kr6/scripts_game.lua17989 acquisition调用 `U.find_foremost_enemy(...,0,range,0,flags,bans,filter)`。第五参数是数值0；Lua中0为truthy，all/utils.lua的FFE进入预测分支，以 `P.node_pos(pi,spi,ni+0)` 判断射程。外层filter另用攻击的 `node_prediction` 检查未来路径节点有效性。地形筛选仍使用连续位置，发射目标仍是原始敌人对象。

真实level03 iron恒定半值RNG的第901帧：holder6的射程原点541,455，半径160；出生序10的敌人连续坐标502.41915438402555,346.05593040494193，而路径节点为504,347。连续坐标椭圆距离平方25710.543485>25600；节点25173.081633<25600。原版候选出生序[10,12]，网页旧实现只有[12]。双方当时HP/位置相同，第二发法球目标因此不同，926才出现8点HP差异。

`RangedCombat.wizardTargets`现将攻击预测节点valid与FFE numeric-zero节点valid/range分开。使用 `predictTarget(e,0).pos` 做射程，保留实际目标位置/对象供发射与跟踪。没有调整射程、伤害、金币或RNG。

## 新对照补足旧用例的盲区

旧16848基础/4212火书选敌夹具把敌人放在路径节点上，无法区分节点射程和连续坐标射程。`export_wizard_targeting --off-node [--firebook]` 新增25%/50%/75%路径间插值位置，配合最近真实holder及节点内/外侧±0.000001的射程边界；真实三个地图全部路径/车道、四个基础等级与火书、速度0/40/72，原版acquisition+FFE+path+grid实际运行。

修改前的独立失败记录 `wizard-off-node-before.log`：1/1/1/1/12/0/node-boundary-outside，网页多选1594，原版只有1596。修正后25272基础+6318火书=31590组全通过。原版明确接受“连续位置在外/节点在内”的827基础+175火书候选，也明确拒绝“连续位置在内/节点在外”的3411基础+801火书候选；验证器要求两个方向都存在。6336/1854个未来无效节点过滤继续通过。旧在节点测试也全部通过。新文件以precise_json保留原double，旧输入文件未改写。

## 实际GameSession与浏览器

same-input constant native smoke：首次HP/位置/节点差异由926推进至1261；已比较的1390网页tick内gold/lives没有差异。前42个法球队列的时间/holder/语义目标一致；下一个差异1301在1261伤害差异之后。注册表首差仍585（pop实体尚未接入），不能宣称完整全局实体状态一致。

新 `verify_native_combat_prefix` 明确核对前1260个真实GameSession tick、16944个存活敌人状态：敌人数目/模板/HP/位置/路径节点与波次/金币/生命值全部匹配。使用相同原始smoke命令、原地图/波次、constant0.5随机；尸体、注册表、动画、音频和1261之后不在此门槛内。完整npm test通过，新前缀门槛单独通过，build通过。

`browser_wizard_node_range` 用真实UI在holder6建法师，声明空波次和静止受控EnemyPath目标，复制901实际节点间坐标，验证原版规则接受并真实发射/造成伤害；截图 `web-wizard-node-range-bolt.png`。不是自然整关或视频验收。普通法师四级构建/升级/配对法球/拖尾/命中/免疫/删除等浏览器回归通过。浏览器引导/保存验证另记ledger的最终状态。

fresh opening：2055帧、4次投石/12次法球、7373独立原版行走样本匹配，仍为规定actor/HP/order的组件测试。fresh正常动作probe `wizard-node-range-playthrough.json`：1-1胜20/272.7，1-2胜1/151.1667，2-1胜20/429.7，2-2败123.7667，3-1胜8/678.8333，3-2败110；4胜2败，尚未达成完整目标。

下一处实际伤害差异1261：shadow_blades出生序18（原生161）位置/节点相同，网页HP38，原版30，少一次8点法球伤害；此前队列目标仍一致。需要对照弹体更新顺序/命中等待与原版全局main/health，不能据此直接假定某个原因或补偿伤害。主注册表仍585缺pop/tween/blood等，RangedCombat弹体仍在全部塔/敌人之后集中更新，尚未完全纳入原始Lua实体遍历。

后续纠正：1261的8点伤害来源已由原版owner追踪确定为bullet_zefira461，不是法师法球；原始伤害量推测不成立。详见HERO_RANGED_PHASE.md。
