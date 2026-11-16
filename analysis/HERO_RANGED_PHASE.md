# 泽菲拉预测选敌、英雄main与弹体队列

2026-11-16。已修正常规GameSession的泽菲拉基础远程选敌、保留预瞄、主脚本阶段、弹体入场/删除、初始旋转与伤害结果门槛。完整前三关/3-2与视频一致性仍未验收。

## 先纠正上次对1261的判断

此前仅从8点伤害推测为法师法球，原版owner追踪已否定。1261创建damage470的owner是461，即1248创建的bullet_zefira；其目标是shadow_blades161（网页出生序18）。两枚此前法师法球的轨迹/停留位置其实一致。已扩展原生快照的bullet.target/to/from、force velocity、sprite rotation/hiddenCount，并只读记录原health输入及实际伤害结果，不改变原版系统或随机数。原完整25系统两次运行仍为2782tick/3714原注册事件，错误日志检查与重建验证通过。

## 原脚本与实际修正

all/script_utils.lua1466–1501的soldier_pick_ranged_target_and_attack以attack.node_prediction传FFE。最小和最大椭圆射程都基于未来路径节点，飞行目标仅豁免最小射程；未来无效节点仍拒绝。旧网页用当前连续位置选敌，首次射击到1280，原版1248，相差32tick。

1379–1463的实际远程协程保留选中时的预测点，依据该点转身/确定预瞄，风摇结束把其加上hit_offset写入bullet.to；不在发射时重算。预测选敌修正后，旧网页集中在所有敌人之后执行英雄仍提前一tick开打。现在英雄远程在真实RuntimeEntities的hero main绑定处执行；弹体也以heroProjectile绑定进入原实体遍历。

发射只创建/queue英雄弹体。下一tick入场，最初一步是原版yield，随后才跟踪/移动。声音insert在入场时触发。到达时先生成伤害、FX与删除队列；hero命中在后续health处理，pops用DR_DAMAGE=1/DR_KILL=2，非致死ZAP不再被错误当作kill播放。命中当帧仍保留弹体，下一tick同时从真实注册表和网页列表移除。初始旋转在insert按to-pos设置（原3109–3130），后续与原版Homing积分一致。

攻击动画结束检查上一帧render runs，并保留外层yield，不在动画结束当帧立即重开下一次攻击。既有取消/暴击/增益快照保留。

尚未全面证明的分支：全局统一main/health队列、所有技能和其他英雄/强制路点、入场目标拒绝的完整原注册回调、泽菲拉PS实际发射/清理和GPU、音频听感一致。此文不宣称这些已完成。

## 验证证据

- export_hero_ranged_targeting / verify_hero_ranged_targeting：21060次实际原SU+FFE+path选敌，三个地图所有路径/车道，半节点位置、实际英雄出生点、min/max内外边界、速度0/40/72、地面/飞行；2633次飞行目标在min内仍被接受、4168次当前坐标在max外但预测位置在内被接受。全部匹配。此夹具隔离并强制可用冷却，不证明整个英雄主循环。
- verify_native_hero_ranged：真实GameSession、同一组原地图/波次/smoke输入/constant-half随机，前两次原生queue1248/1278、insert1249/1279，22个活动弹体快照的身份/目标/pos/to/rotation、impact1261/1287、下一tick删除、8/8伤害以及英雄XP/等级至1288全部一致。来源独立于网页，是原25系统记录。仍为指定来源比较，不能推导其他单位已一致。
- 原生Homingoracle补3个初始目标近于一步速度的点，6条轨迹/91帧；近距离飞行目标豁免min后可在insert当帧直接命中，网页不再无条件多等一帧。追加原型/浏览器近目标命中、非致死ZAP拒绝与retained-body检查。
- 完整npm test通过（hero-ranged-final-tests.log），build通过。先前旧cancel/critical夹具拿onSound当create事件，现直接观察onQueueProjectile；断言仍比较原同一queue时间/载荷，移动取消断言明确检查queuedAt。增益/闪现载荷夹具实际不移动目标但保留非零预测速度，现显式frozen，和其静止载荷隔离目的相符；运动选敌由21060原版用例覆盖。
- 浏览器browser_hero_ranged：真实UI进入第三关，声明空波次/移动EnemyPath目标，验证预测范围独有目标、queue→下一tick插入/初始旋转→移动→8点伤害/删除queue→下一tick真正删除，并覆盖近距离飞行目标insert即时命中。无page/asset错误，web-hero-ranged-native-flight.png已检查。browser_zefira_critical实际近战/远程20%配置、伤害/原crit图集回归通过；该旧夹具原先用spawn后立即取enemies尾项，已改为实际pending引用并等插入后解锁英雄，不绕过生产入场。

## 全局进展和下一步

真实战斗前缀门槛从1260扩到1266：17070个存活敌人状态及数量、模板、HP、位置、路径节点、波次、金币、生命值一致。尸体/注册表/动画/音频及后续并非此门槛的内容。首个实际actor差异现在1267：原骑士469已选中并阻挡bandit249，位置701.764783,332.527439；网页替代骑士仍deploying并走到集结点，敌人因此多走了一步。原SU.y_soldier_new_rally只负责等待/免疫阶段，后续普通回家步之间仍可选敌；网页将等待与整段回家合成不可打断的deploying。下一步须运行原完整新生/重设集结骑士轨迹，按源控制流拆分，不能直接改坐标或人为延迟敌人。注册表首差仍585缺pop/tween等，亦未完成。

fresh opening：2055帧、4次投石/12次法球、7363个原生独立步行样本继续匹配，依旧是规定actor/HP/order输入的组件对比。fresh正常动作probe hero-ranged-playthrough.json：1-1胜20/270.7，1-2胜1/145.3667，2-1胜20/439.9，2-2败78.8，3-1胜8/675.5333，3-2败115.3333。仍4胜2败，没有调整战斗数值以追求胜利，完整目标保持未完成。
