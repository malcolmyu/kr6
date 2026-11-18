# 前三关的防御塔终极能力可达性

原始 `game_settings.upgrades_points_per_stage` 前三项为0、2、4。原始 `UpgradesRoomView.available_points` 函数的54组 oracle 已保留在 `global-upgrade-points-oracle.json`；未选择升级的前三关记录显示，星数1/2/3与铁人模式完成状态都不会增加该阶段上限。这里的升级点按已完成的最高关卡计算，不能把它当成累计星星。

四类防御塔的 `ulti` 节点自身价格都是5，已经高于前三关最多4点；再计入 l1/l2/l3/l4 前置，常规最短路径需要14点。原始 `artillery_ulti` 补丁会将四级矮人炮塔等的 `powers.ultimate.active` 设为true，但该补丁不能通过前三关的合法升级房流程购买。

`verify_first_three_tower_ultimates.mjs` 使用原始点数 oracle、原始节点价格、实际网页存档校验和模板补丁流程验证：到3-2为止，这些终极能力保持不可用。Culverine终极控制器不属于前三关合法流程所需内容；默认inactive与原版一致。这不排除未来扩展关卡需要实现终极能力，也不能作为当前六流程、画面/视频或声音验收完成的证明。
