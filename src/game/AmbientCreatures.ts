import data from '../../public/data/ambient-creatures.json' with {type:'json'}
import {nativeAnimationFrame,nativeLogicAnimationFrame} from './NativeAnimation.ts'
import type {GameMode,LevelData,Point} from './types'
interface Template {editor?:{game_mode?:number};taps_to_explode?:number;sound?:string;sound_cast?:string;ui:{click_rect:{pos:Point;size:Point}};render:{sprites:{prefix:string;name:string;ts:number;loop:boolean}[]}}
export interface AmbientCreature {name:string;sourceIndex:number;pos:Point;animation:string;at:number;loop:boolean;clicked:boolean;taps:number;eatAt?:number;eatCooldown?:number;phase:'normal'|'death'|'action'|'done';removalQueuedAt?:number}
export class AmbientCreatures {
 readonly models:AmbientCreature[]=[]
 onRemove:(model:AmbientCreature)=>void=()=>{}
 onSound:(name:string)=>void=()=>{}
 private templates:Record<string,Template>
 private random:()=>number
 private censored:boolean
 constructor(level:LevelData,mode:GameMode,templates:Record<string,Template>,random:()=>number,censored=false){
  this.templates=templates;this.random=random;this.censored=censored
  for(const [sourceIndex,e]of level.data.entities_list.entries()){
   if(!(data.names as string[]).includes(e.template))continue
   const t=templates[e.template],filter=Number(e['editor.game_mode']??t.editor?.game_mode??0)
   if(filter&&filter!==(mode==='campaign'?1:3))continue
   const s=t.render.sprites[0];this.models.push({name:e.template,sourceIndex,pos:{...e.pos!},animation:s.name,at:s.ts,loop:s.loop,clicked:false,taps:0,phase:'normal'})
  }
 }
 private animate(m:AmbientCreature,name:string,time:number,loop=false){m.animation=name;if(!loop)m.at=time;m.loop=loop}
 private config(m:AmbientCreature){const prefix=this.templates[m.name].render.sprites[0].prefix;return (data.animations as Record<string,{fps:number;counts:Record<string,number>}>)[prefix]}
 private finished(m:AmbientCreature,time:number){const c=this.config(m);return nativeLogicAnimationFrame(c.counts[m.animation],time,m.at,m.loop,c.fps).runs>0}
 fps(m:AmbientCreature){return this.config(m).fps}
 frame(m:AmbientCreature,time:number){const c=this.config(m);return nativeAnimationFrame(c.counts[m.animation],time-m.at,m.loop,c.fps).frame}
 click(pos:Point){const m=this.models.find(m=>m.removalQueuedAt===undefined&&(()=>{const r=this.templates[m.name].ui.click_rect;return pos.x>=m.pos.x+r.pos.x&&pos.x<=m.pos.x+r.pos.x+r.size.x&&pos.y>=m.pos.y+r.pos.y&&pos.y<=m.pos.y+r.pos.y+r.size.y})());if(!m)return false;m.clicked=true;return true}
 beginTick(time:number){for(let i=this.models.length-1;i>=0;i--){const m=this.models[i];if(m.removalQueuedAt!==undefined&&time>m.removalQueuedAt)this.models.splice(i,1)}}
 advance(time:number){this.beginTick(time);for(const m of this.models)this.advanceOne(m,time)}
 advanceOne(m:AmbientCreature,time:number){
  if(m.removalQueuedAt!==undefined||m.phase==='done')return
  const cow=m.name==='decal_stage_03_cow',t=this.templates[m.name]
  if(m.eatAt===undefined){m.eatAt=time;m.eatCooldown=((cow?150:90)+Math.floor(this.random()*(cow?91:121)))/30;if(cow){if(m.clicked){this.animate(m,'idle_symbol',time,true);m.phase='done'}return}}
  if(m.phase==='death'||m.phase==='action'){
   if(!this.finished(m,time))return
   if(m.phase==='death'){m.removalQueuedAt=time;this.onRemove(m)}else{this.animate(m,'idle_symbol',time,true);m.phase='done'}
   return
  }
  if(!cow&&m.clicked&&!this.censored){m.clicked=false;m.taps++;if(m.taps===t.taps_to_explode){if(t.sound)this.onSound(t.sound);this.animate(m,'death',time);m.phase='death';return}else this.animate(m,'tap',time)}
  if(time-m.eatAt>m.eatCooldown!){this.random();m.eatAt=time;this.animate(m,'eat',time)} // Native redraw shadows, but never replaces, the first cooldown.
  if((m.animation==='eat'||m.animation==='tap')&&this.finished(m,time))this.animate(m,'idle',time,m.animation==='eat')
  if(cow&&m.clicked){if(t.sound_cast)this.onSound(t.sound_cast);this.animate(m,'action',time);m.phase='action'}
 }
}
