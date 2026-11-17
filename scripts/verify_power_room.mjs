import {readFileSync,existsSync} from 'node:fs'
import assert from 'node:assert/strict'
import {powerRoomView,powerRoomStats,powerRoomPoses,powerRoomBackdrop} from '../src/game/PowerRoom.ts'
import {roomFind} from '../src/game/HeroRoom.ts'
import {activatePowerUpgrade} from '../src/game/PowerUpgrades.ts'
import {equipPower} from '../src/game/NativeProgression.ts'
import {resetSkillTimestamp} from '../src/game/TowerSkillCooldown.ts'
import {GameSession} from '../src/game/GameSession.ts'
const read=p=>JSON.parse(readFileSync(p)),data=read('public/data/power-room.json'),near=(a,b,label)=>assert(Math.abs(a-b)<1e-8,label)
const stats=read('analysis/power-room-stats-oracle.json'),picks=read('analysis/power-room-pick-oracle.json'),equipment=read('analysis/power-room-equip-oracle.json')
for(const row of stats){const actual=powerRoomStats(data,row.profile,row.kind),expected=row.result;assert.equal(actual.name.toUpperCase(),expected.unit_name);assert.equal(actual.description,expected.unit_desc);assert.equal(actual.level,expected.level);assert.equal(actual.xp,expected.xp);assert.equal(actual.points,expected.remaining_points);assert.equal(actual.unlocked,expected.unlocked);assert.equal(actual.extraXp,expected.extra_xp);near(actual.fraction,expected.level_progress,'native power XP fraction');for(const key of ['type','cooldown','hp','damage','range'])assert.equal(actual.stats['stat_'+key],expected.stats[key])}
for(const row of picks)assert.deepEqual(activatePowerUpgrade(row.kind,90000,[...row.selected],row.id),[...row.result],`${row.kind}/${row.selected}/${row.id}`)
for(const row of equipment){const progress={levels:{1:{campaign:3},2:{campaign:3}},powers:row.selected},actual=equipPower(progress,row.kind,row.position);assert.deepEqual(actual.powers,row.result)}
const profile={levels:{1:{campaign:3},2:{campaign:3}},powerXp:{reinforcements:6000,rain_of_fire:90000},powers:['reinforcements']}
for(const name of data.order)for(const page of ['main','tree']){
 const view=powerRoomView(data,profile,name,page),unit=powerRoomStats(data,profile,name),panel=roomFind(view,'group_tower_upgrades');assert.equal(panel.hidden,page!=='tree');assert.equal(roomFind(view,'label_name').text,unit.name.toUpperCase());assert.equal(roomFind(view,'label_upgrade_points_general').text,String(unit.points))
 const visit=n=>{if(n.image_name){assert(data.images[n.image_name],n.image_name);assert(existsSync(`public/assets/${n.image_name}.png`),n.image_name)}for(const c of n.children??[])visit(c)};visit(view)
 for(const pose of Object.values(powerRoomPoses(data,.7,page)))assert(pose.every(v=>typeof v==='boolean'||Number.isFinite(v)))
}
const locked=powerRoomView(data,{levels:{}},'royal_edict','main');assert.equal(roomFind(locked,'button_select').hidden,true);assert.equal(roomFind(locked,'button_locked').hidden,false);assert.match(roomFind(roomFind(locked,'button_locked'),'label_button_locked').text,/5/)
assert.equal(equipPower({levels:{}},'royal_edict',1).powers,undefined)
assert.deepEqual(equipPower(profile,'reinforcements',1),profile)
for(const row of read('analysis/power-room-fit-oracle.json')){const art={...data,scale:row.scale},frame={width:row.width,height:row.height},view=powerRoomView(art,profile,'rain_of_fire','main',undefined,true,[],true,frame),overlay=roomFind(view,'towerhero_room_roster_sel_overlay'),pose=powerRoomPoses(art,1,'main',{at:0,active:true,angles:[1,2,3]},undefined,frame).towerhero_room_roster_sel_overlay;for(const key of ['x','y']){near(overlay.pos[key],row.pos[key],'native fitted overlay position');near(overlay.size[key],row.size[key],'native fitted overlay size');assert.equal(overlay.scale[key],row.overlayScale[key]);assert.equal(overlay.anchor[key],row.anchor[key])}near(pose[0],row.pos.x,'timeline fitted x');near(pose[1],row.pos.y,'timeline fitted y');assert.equal(pose[2],1);assert.equal(pose[3],1)}
const backdrop=powerRoomBackdrop(data),overlay=roomFind(backdrop,'overlay');assert.deepEqual(overlay.background_color,[0,0,0,160]);assert.equal(roomFind(backdrop,'vignette').image_name,'map_vignette_small');assert(existsSync('public/assets/map_vignette_small.png'))
const templates=read('public/data/entities.json')
for(const row of read('analysis/royal-skill-reset-oracle.json'))for(const [group,attacks]of Object.entries(row.before))for(const [index,a]of attacks.entries()){const expected=row.enabled&&templates[row.name].powers?resetSkillTimestamp({basic_attack:a.basic,static_cooldown:a.static},100)??a.ts:a.ts;assert.equal(expected,row.after[group][index],`${row.name}/${group}/${index}/${row.enabled}`)}
for(const enabled of [false,true]){
 const game=new GameSession(read('public/data/level02.json'),read('public/data/level02-campaign.json'),templates,()=>.5,'campaign',undefined,enabled?{royal_edict:['l2a','l3','l4a','l5a']}:{}),[wizard,archer]=game.towers.sites.slice(0,2)
 Object.assign(wizard,{tower:'tower_wizard_lvl4',pos:{x:500,y:350},powerLevels:{skill_b:3},building:undefined,canBeMod:true});Object.assign(archer,{tower:'tower_archers_lvl4',pos:{x:600,y:350},powerLevels:{skill_b:3},building:undefined,canBeMod:true})
 game.combat.wizardTowers.advance(100,[wizard],()=>[]);game.archerRange.advanceSource(archer,100,[wizard,archer]);const w=game.combat.wizardTowers.states.get(wizard.id),a=game.archerRange.states.get(archer.id);w.buffTs=100;w.ts=88;a.ts=100;game.combat.shooters.set(archer.id,{readyAt:123,startedAt:88,facingBack:false,archerTs:88})
 game.time=100;game.powers.royal.cast({x:550,y:350},100);assert.equal(w.buffTs,enabled?100-1e99:100);assert.equal(a.ts,enabled?100-1e99:100);assert.equal(w.ts,88);assert.equal(game.combat.shooters.get(archer.id).readyAt,123);assert.equal(game.combat.shooters.get(archer.id).archerTs,88)
}
console.log(`${stats.length} native power room stats, ${picks.length} node confirmations/branch swaps and ${equipment.length} equipment slot writes match; nine original roster views, lock state, assets and timeline poses verified`)
console.log('10 native Royal skill-reset cases match basic/static exclusions; actual purchased node resets wizard B/archer B clocks while preserving basic attack clocks')
console.log('8 original KView overlay fits match window margins/parent transforms across aspect ratios/scales; native modal backdrop and vignette restored')
