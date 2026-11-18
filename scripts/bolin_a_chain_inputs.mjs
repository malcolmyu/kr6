import data from '../public/data/bolin-mortar.json' with {type:'json'}
import {driveBolinChain} from './bolin_chain_inputs.mjs'
export function driveBolinMortarChain(g,tick,mode='normal'){
 driveBolinChain(g,tick)
 if(tick===20){const h=g.heroes.team.find(h=>h.name==='hero_bolin');h.pos={x:350,y:358};h.rally={...h.pos};h.center={...h.pos};g.enemies.find(e=>e.name==='enemy_bandit').path.position=mode==='no-target'?{x:1000,y:650}:{x:570,y:358}}
 if(tick===21)for(let i=1;i<=2;i++){
  const pos=g.level.paths.paths[0][0][99+i];g.spawnCinematicEnemy('enemy_bandit',1,{...pos});const e=g.enemies.at(-1)
  e.hp=e.template.health.hp_max=10000;e.frozen=true;e.skillLocked=true;e.motionSpeed={x:0,y:0};e.path.pi=1;e.path.spi=1;e.path.ni=100+i
 }
 const enemies=g.enemies.filter(e=>e.name==='enemy_bandit'),h=g.heroes.team.find(h=>h.name==='hero_bolin')
 if(tick===22){
  if(mode==='mortar-left'){h.pos={x:790,y:358};h.rally={...h.pos};h.center={...h.pos}}
  for(const e of enemies){if(mode==='few'&&e.path.ni===102)g.entities.remove(e);if(mode==='flying'&&e.path.ni===102)e.template.vis.flags|=data.flyingFlag;if(mode==='no-target')Object.assign(e.path.position,{x:1000,y:650})}
  if(['edge20','edge19','edge20-path6'].includes(mode)){const last=mode==='edge19'?19:20,pi=mode==='edge20-path6'?6:1,center=g.level.paths.paths[pi-1][0][last-1];h.pos={x:center.x-220,y:center.y};h.rally={...h.pos};h.center={...h.pos};for(const e of enemies){e.path.ni=last+e.path.ni-102;e.path.pi=pi;e.path.position={...g.level.paths.paths[pi-1][0][e.path.ni-1]}}}
 }
 if((mode==='a-stun-before'&&tick===500)||(mode==='a-stun-boundary'&&tick===526)||(mode==='a-stun-after'&&tick===530)||(mode.startsWith('a-stun')&&tick===550))h.template.unit.is_stunned=tick!==550
 if((mode==='a-death-before'&&tick===500)||(mode==='a-death-after'&&tick===530)){h.hp=0;h.deathHealthAt=tick/30}
 if(mode==='a-remove'&&tick===500)for(const e of enemies)g.entities.remove(e)
 if((mode==='a-leave'&&(tick===580||tick===650))||(mode==='invulnerable'&&tick===550)||(mode==='flying-after'&&tick===550))for(const e of enemies){if(mode==='invulnerable')e.template.motion.invulnerable=true;else if(mode==='flying-after')e.template.vis.flags|=data.flyingFlag;else Object.assign(e.path.position,tick===580?{x:1000,y:650}:g.level.paths.paths[0][0][e.path.ni-1])}
}
