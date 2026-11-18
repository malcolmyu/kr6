import {driveBolinChain} from './bolin_chain_inputs.mjs'
import data from '../public/data/bolin-mines.json' with {type:'json'}
export function driveBolinMinesChain(g,tick,mode='normal'){
 driveBolinChain(g,tick)
 const h=g.heroes.team.find(h=>h.name==='hero_bolin'),e=g.enemies.find(e=>e.name==='enemy_bandit')
 if(tick===20&&mode!=='wave0')g.waves.wave=1
 if(tick===22&&mode!=='nearby')Object.assign(e.path.position,{x:1000,y:650})
 if(tick===21&&mode==='far-cap')for(let i=1;i<=4;i++)g.heroes.bolinMines.createMine(h,{x:50+i*50,y:100},g.time)
 if(mode==='no-space'&&tick===350)h.template.timed_attacks.list[1].min_dist_between_mines=1e6
 if((mode==='stun-start'&&tick===185)||(mode==='stun-throw'&&tick===200)||(mode==='stun-boundary'&&tick===210)||(mode==='stun-end'&&tick===222)||(mode.startsWith('stun')&&tick===230))h.template.unit.is_stunned=tick!==230
 if((mode==='death-start'&&tick===185)||(mode==='death-tail'&&tick===215)){h.hp=0;h.deathHealthAt=g.time}
 const early=['force-before-arm','enemy-before-arm'].includes(mode),move=['trigger','trigger-edge','damage-edge','damage-outside','flying','force-flying','immune','armor','combo'].includes(mode)
 const oldest=()=>[...g.heroes.bolinMines.models].filter(m=>m.kind==='mine').sort((a,b)=>a.id-b.id)[0]
 if(early&&tick===260||move&&tick===450||mode==='force'&&tick===450){
  const first=oldest();if(!first)throw Error('B fixture requires an actual armed/arming mine')
  if(['force-before-arm','force','damage-edge','damage-outside'].includes(mode))first.trigger=true
  if(!['force','force-before-arm'].includes(mode)){
   Object.assign(e.path.position,{x:first.pos.x+(mode==='trigger-edge'?30:mode==='damage-edge'?45:mode==='damage-outside'?45.001:0),y:first.pos.y})
   if(['flying','force-flying'].includes(mode))e.template.vis.flags|=data.flyingFlag
   else if(mode==='immune')e.template.health.ignore_damage=true
   else if(mode==='armor')e.template.health.armor=.6
  }
 }
 if(mode==='force-flying'&&tick===500){const m=oldest();if(!m)throw Error('Missing mine to force');m.trigger=true}
 if(mode==='combo'&&tick===600)for(let i=0;i<=2;i++){
  const p=g.level.paths.paths[0][0][79+i];g.spawnCinematicEnemy('enemy_bandit',1,{...p});const n=g.enemies.at(-1)
  n.hp=n.template.health.hp_max=10000;n.frozen=true;n.skillLocked=true;n.motionSpeed={x:0,y:0};n.path.pi=1;n.path.spi=1;n.path.ni=80+i
 }
}
