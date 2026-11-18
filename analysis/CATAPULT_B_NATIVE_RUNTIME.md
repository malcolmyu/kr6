# 投石塔 B：延迟二次爆炸正式实体

原版依据为 APK `aura_catapult_skill_b_bomb` 的真实模板、main脚本与实际simulation。之前正式GameSession在 tick84 落地时缺少独立爆炸区域ID，差异保留于 `catapult-native-area-b-first-red.log`。

CatapultBombRuntime 现在分配/排队/插入真实区域，在全局实体遍历顺序执行main；保留原版fall全局sprite.ts=0、.08秒等待、activate时钟、10/30秒施法等待、按半径70的椭圆距离衰减伤害及动画结束后移除。伤害通过统一队列分配原版damage ID并进入health阶段；二次爆炸不继承来源塔增伤，查询使用实际SSO候选、原版0/0可见性与路径有效性，原版音效请求通过GameSession输出。正常渲染器读取正式实体集合。

验证：

- 四条实际GameSession整链 / 3600帧：rank1普通、rank3普通、rank2四目标集群、rank3爆炸生效阶段卖源塔，各900帧；全部实体ID/表顺序/计数/峰值、队列、事件序列与RNG，以及每帧敌人HP/移速、真实爆炸实体等级/动画/时钟/loop/位置匹配原版。
- rank1整链另采集全部原版引擎音效，21次有效请求名称、顺序和时刻全部匹配。
- Chrome普通菜单建造/四级升级/150、200、250购买，实际30/68/102二次伤害、原始装填/攻击/爆炸图集、音效请求名、满级说明、金币支出、卖塔后爆炸与清理通过；无页面或资源错误。截图 `web-catapult-explosive-rank3.png`、`web-catapult-explosive-menu.png` 已刷新并查看。
- 既有独立回归通过：20800塔控制器帧、1485原始延迟爆炸帧，以及实际独立RangedCombat的三级价格/退款/源塔增伤与独立载荷/源塔卖出/可见性0/0/扩展半径用例。
- 生产构建通过：`catapult-b-native-build.log`。整体默认回归已退出0（`catapult-tar-native-regression.log`）；新增B门禁另单独退出0（`catapult-b-native-final-gate.log`）。最终追加B门禁后的整个默认命令未再次完整重跑。

命令 `npm run test:native-catapult-b` 复核四条正式整链及原版21次音效。原版控制器/区域fixture保持完整帧和字段，未通过删减ID、改输入或放松HP比较来通过。

边界：本专项不是普通战役整场绘制验收或实际听感验收；投石塔C正式陷阱/眩晕、11星波林、新档六流程、视频和整体交付仍需继续。

卖源塔事件现统一置于tick670，此时该场景原版二次爆炸区域已在tick656创建、657插入，仍处于实际爆炸阶段。旧tick240轨迹完整保留为 `.before-scenario-correction.json`；更新后的整链另行重验。

B已补齐原始1400地面层和真实绘制排序：实际Chrome900个原版检查点、58613场景帧排序元数据，以及180个爆炸图集/alpha检查通过。详见 CATAPULT_C_NATIVE_RUNTIME.md。

图层修正后的正常三级购买、实际二次伤害、卖塔后爆炸/清理复验也已通过，见 `catapult-c-b-final-browser.log`。包含新增C门禁的完整默认回归已通过，见 `catapult-c-full-regression.log`。
