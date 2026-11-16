import {readFileSync} from 'node:fs'
import {GameSession} from '../src/game/GameSession.ts'
import {RangedCombat} from '../src/game/RangedCombat.ts'
import {EnemyPath} from '../src/game/EnemyPath.ts'
const read=p=>JSON.parse(readFileSync(p))
// Execute current production controllers against the fixed pre-combat inputs.
// Native outputs are generated separately; recorded web states are not the subject.
export function openingSubject(input,kind){
 const level=read(`public/data/level0${input.stage}.json`),templates=read('public/data/entities.json'),g=new GameSession(level,read(`public/data/level0${input.stage}-iron.json`),templates,()=>.75,'iron',undefined,{},input.profile.globalUpgrades),combat=new RangedCombat(g.combat.templates,()=>input.wizardPairRoll,()=>{}),sources=new Map(),actors=new Map(),frames=[],shots=[]
 combat.targetValid=g.combat.targetValid;combat.predictTarget=g.combat.predictTarget
 if(kind==='wizard'){const fire=combat.wizardTowers.onShoot;combat.wizardTowers.onShoot=(site,name,from,target,sign,...rest)=>{shots.push({at:time,site:site.id,name,from:{...from},target:target.id,sign});fire(site,name,from,target,sign,...rest)}}
 else{const fire=combat.catapultTowers.onShoot;combat.catapultTowers.onShoot=(site,name,from,to,factor,...rest)=>{shots.push({at:time,site:site.id,name,from:{...from},to:{...to},factor});fire(site,name,from,to,factor,...rest)}}
 let time=0
 for(const frame of input.frames){
  time=frame.at
  const sites=(kind==='wizard'?frame.wizardSources:frame.sources).map(source=>{if(!sources.has(source.id))sources.set(source.id,{id:source.id,tower:source.name,pos:{...source.pos},instance:source.instance});return sources.get(source.id)})
  const enemies=frame.actors.map(actor=>{
   if(!actors.has(actor.id))actors.set(actor.id,{id:actor.id,name:actor.name,hp:actor.hp,template:structuredClone(templates[actor.name]),path:new EnemyPath(level.paths.paths,level.navigation,actor.pi,actor.spi)})
   const e=actors.get(actor.id);e.hp=actor.hp;e.diedAt=undefined;e.path.pi=actor.pi;e.path.spi=actor.spi;e.path.ni=actor.ni;Object.assign(e.path.position,actor.pos);e.path.direction={x:actor.maxSpeed?actor.motion.x/actor.maxSpeed:0,y:actor.maxSpeed?actor.motion.y/actor.maxSpeed:0};e.template.motion.max_speed=actor.maxSpeed;e.template.vis.flags=actor.flags;e.template.vis.bans=actor.bans;return e
  })
  combat.catapultTowers.waveGroupNumber=frame.wave;combat.advance(time,sites,enemies)
  const states=kind==='wizard'?combat.wizardTowers.states:combat.catapultTowers.states
  frames.push({at:time,states:[...states.entries()].map(([id,s])=>({id,parts:s.parts.map(p=>({...p,...(p.offset?{offset:{...p.offset}}:{})})),attackTs:kind==='wizard'?s.ts:s.attackTs,loading:s.loading,bobTime:s.bobTime}))})
 }
 return {frames,shots}
}
