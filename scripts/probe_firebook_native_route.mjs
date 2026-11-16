import {readFileSync,writeFileSync} from 'node:fs'
import {GameSession} from '../src/game/GameSession.ts'
import {heroUpgradeData,validateHeroUpgrades} from '../src/game/HeroUpgrades.ts'
import {applyStageSetup} from '../src/game/StageSetup.ts'
const read=p=>JSON.parse(readFileSync(p)),p=read('analysis/native-runtime-video-continued-profile.json'),templates=read('public/data/entities.json'),commands=[],opening=read('analysis/native-runtime-video-continued-input.json').filter(c=>(c.kind==='hero-rally'&&c.name!=='hero_zefira')||c.kind==='rally'||c.kind==='send_wave'||c.kind==='power');let seed=104,draws=0
for(const name of ['hero_gerald','hero_zefira']){p.heroXp[name]=6500;p.heroUpgrades[name]=validateHeroUpgrades(heroUpgradeData,name,6500,['skill_a','skill_b','upg_a','upg_d','upg_b'])}
writeFileSync('analysis/native-runtime-firebook-route-profile.json',JSON.stringify(p,null,2)+'\n')
const g=new GameSession(read('public/data/level03.json'),read('public/data/level03-iron.json'),templates,()=>{draws++;seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296},'iron',['archers','knights','catapult','wizard'],p.powerUpgrades??{},p.globalUpgrades)
g.heroes.savedXp=p.heroXp;g.heroes.savedUpgrades=p.heroUpgrades;g.heroes.playerLevel=3;g.powers.equip(['reinforcements','rain_of_fire','royal_edict']);g.powers.progression.configure(p.powerXp,3,3);applyStageSetup(g,3,'iron',true,true)
opening.push({tick:1470,kind:'power',power:'royal_edict',pos:{x:617,y:279}},{tick:2100,kind:'hero-rally',name:'hero_gerald',pos:{x:400,y:350}},{tick:2301,kind:'power',power:'rain_of_fire',pos:{x:520,y:240}})
const escapes=[],onCommand=g.onCommand;g.onCommand=c=>{onCommand(c);if(c.name==='signal'&&c.signal_name==='enemy-reached-goal')escapes.push(...g.enemies.filter(e=>e.escapedAt===g.time).map(e=>({name:e.name,pos:{...e.path.position},pi:e.path.pi,at:g.tick})))}
const holder=process.argv[2]??'7',site=g.towers.sites.find(s=>s.id===holder);let burnFrames=0,purchases=0;const snapshots=[]
for(let tick=1;tick<=10000&&!g.outcome;tick++){
 for(const c of opening.filter(c=>c.tick===tick)){if(c.kind==='send_wave')g.callNextWave();else if(c.kind==='hero-rally'){g.heroes.selectedId=g.heroes.team.find(h=>h.name===c.name).id;if(!g.heroes.moveSelected(c.pos))throw Error('rally rejected')}else if(c.kind==='rally')g.setRally(c.holder,c.pos);else if(c.kind==='power'){if(!g.powers.select(c.power,g.time)||!g.powers.cast(c.pos,g.time))continue}commands.push(c)}
 if(tick===541){g.build(holder,'wizard');commands.push({tick,kind:'build',holder,tower:'wizard'})}
 if(tick%15===0&&site.tower&&!site.building){const next=g.towers.nextUpgrade(site);if(next&&g.gold>=next.price){g.upgradeTower(holder);commands.push({tick,kind:'upgrade',holder,tower:next.name??site.upgrading})}else if(site.tower==='tower_wizard_lvl4'){const power=g.towers.nextPower(site,'skill_a');if(power&&g.gold>=power.price){g.upgradeTowerPower(holder,'skill_a');commands.push({tick,kind:'tower-power',holder,power:'skill_a'});purchases++}}}
 g.advance(1/30);if([2100,2300,2500,2700].includes(tick))snapshots.push({tick,heroes:g.heroes.team.map(h=>({name:h.name,pos:{...h.pos},hp:h.hp,target:h.target?.name})),guards:g.enemies.filter(e=>e.name==='enemy_blackguard').map(e=>({pos:{...e.path.position},hp:e.hp,blocked:e.blocked}))});burnFrames+=g.combat.firebook.burns.length
}
writeFileSync('analysis/native-runtime-firebook-route-input.json',JSON.stringify(commands,null,2)+'\n')
console.log(JSON.stringify({tick:g.tick,gold:g.gold,outcome:g.outcome,draws,burnFrames,purchases,tower:site.tower,commands,snapshots,escaped:escapes},null,2))
