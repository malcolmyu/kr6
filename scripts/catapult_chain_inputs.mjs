/** Controlled scene inputs shared by Node and actual Chrome; expectations come only from APK execution. */
export function driveCatapultChain(g,tick,rank=1,mode='normal',skill='skill_a'){
 if(tick===20){for(const h of g.heroes.team){h.scriptLocked=true;h.pos={x:1000,y:650}}g.spawnCinematicEnemy('enemy_bandit',1,{x:550,y:400});const e=g.enemies.at(-1);e.hp=e.template.health.hp_max=10000;e.frozen=true;e.skillLocked=true;e.motionSpeed={x:0,y:0};e.path.pi=1;e.path.spi=1;e.path.ni=100;Object.assign(e.path.position,{x:550,y:400});const site={id:'culverine-source',tower:'tower_catapult_lvl4',pos:{x:450,y:400},terrain:1,holder:'tower_holder_terrain_1_1',spent:0,powerLevels:{[skill]:rank},powerChanges:new Set([skill])};g.towers.sites.push(site);g.entities.queue(site.tower,site,'tower',site.id)}
 if(mode==='aligned'&&tick===20)Object.assign(g.enemies.at(-1).path.position,{x:570,y:358})
 if(skill==='skill_c'&&tick===20)g.waves.wave=1
 if(mode==='cluster'&&tick===20)for(const delta of [-5,5,10]){g.spawnCinematicEnemy('enemy_bandit',1,{x:550+delta,y:400});const e=g.enemies.at(-1);e.hp=e.template.health.hp_max=10000;e.frozen=true;e.skillLocked=true;e.motionSpeed={x:0,y:0};e.path.pi=1;e.path.spi=1;e.path.ni=100;Object.assign(e.path.position,{x:550+delta,y:400})}
 if(tick===670&&mode==='sale-after-tar')g.entities.remove(g.towers.sites.find(s=>s.id==='culverine-source'))
 if(tick===670&&mode==='remove-target-after-tar')g.entities.remove(g.enemies.find(e=>e.name==='enemy_bandit'))
 if(mode==='trigger-orphan'&&tick===180)g.entities.remove(g.towers.sites.find(s=>s.id==='culverine-source'))
 if(mode.startsWith('trigger')&&tick===400){const trap=[...g.combat.nativeTraps.traps].sort((a,b)=>a.id-b.id)[0],enemy=g.enemies.find(e=>e.name==='enemy_bandit'),owner=g.towers.sites.find(s=>s.id==='culverine-source');if(!trap||!enemy)throw Error('Expected armed trap and target');Object.assign(enemy.path.position,trap.pos)
  if(mode==='trigger-stun-banned')enemy.template.vis.bans|=4194308
  if(mode==='trigger-boss')enemy.template.vis.flags|=32
  if(mode==='trigger-ignore')enemy.template.unit.ignore_stun=true
  if(mode==='trigger-damage-immune')enemy.template.health.immune_to=2
  if(mode.includes('overlap'))g.combat.nativeTraps.queue(trap.pos,mode==='trigger-overlap-higher'?Math.min(3,rank+1):mode==='trigger-overlap-lower'?Math.max(1,rank-1):rank,g.entities.entity(owner).id)
  if(mode==='trigger-multi')for(const delta of [-5,5,10]){const pos={x:trap.pos.x+delta,y:trap.pos.y};g.spawnCinematicEnemy('enemy_bandit',1,pos);const e=g.enemies.at(-1);e.hp=e.template.health.hp_max=10000;e.frozen=true;e.skillLocked=true;e.motionSpeed={x:0,y:0};e.path.pi=1;e.path.spi=1;e.path.ni=100;Object.assign(e.path.position,pos)}
 }
 if(mode==='trigger-leave'&&tick===405)for(const e of g.enemies)if(e.name==='enemy_bandit')Object.assign(e.path.position,{x:950,y:650})
 if(mode==='trigger-sale'&&tick===402)g.entities.remove(g.towers.sites.find(s=>s.id==='culverine-source'))
 if(mode==='trigger-remove'&&tick===405)g.entities.remove(g.enemies.find(e=>e.name==='enemy_bandit'))
}
