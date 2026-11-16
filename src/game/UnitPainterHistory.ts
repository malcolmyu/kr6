import {nativeSpriteOrder} from './NativePainterOrder.ts'
import type {GameSession} from './GameSession'
import type {HealthBarConfig} from './HealthBar'
interface Frame {key:string;z:number;y:number;draw:number;x:number}
/** Native render insertion sort is stable across simulation ticks, including hidden
 * frames. Keep unit-frame history independent of the browser's paint frequency. */
export class UnitPainterHistory {
 private frames:Frame[]=[]
 private ranks=new Map<string,number>()
 private inserted=new Map<number,number>()
 private eventCursor=0
 rank(key:string){return this.ranks.get(key)}
 advance(session:GameSession){
  const runtime=session.entities;if(!runtime)return
  for(;this.eventCursor<runtime.events.length;this.eventCursor++){const e=runtime.events[this.eventCursor];if(e.kind==='insert')this.inserted.set(e.id,this.eventCursor)}
  const previous=new Map(this.frames.map(f=>[f.key,f]))
  const next=new Map<string,Frame>(),fresh:{frame:Frame;insertion:number;ordinal:number}[]=[]
  const add=(frame:Frame,entity:number,ordinal:number)=>{next.set(frame.key,frame);fresh.push({frame,insertion:this.inserted.get(entity)??0,ordinal})}
  const units=[...session.enemies.map(e=>({model:e,pos:e.path.position,template:e.template})),...session.barracks.soldiers.map(s=>({model:s,pos:s.pos,template:s.template}))]
  for(const unit of units){const entity=runtime.entity(unit.model);if(!entity||!runtime.registry.entities.get(entity.id))continue
   for(const [i,s]of unit.template.render.sprites.entries()){const [,k]=nativeSpriteOrder(s,unit.pos,entity.id,i+1);add({key:k.key!,z:k.z!,y:k.y!,draw:k.draw,x:k.x},entity.id,i)}
   const hb=(unit.template as unknown as {health_bar?:HealthBarConfig}).health_bar
   if(hb)for(let i=0;i<2;i++){
    const key=`${entity.id}:health:${i+1}`,hidden=hb.hidden||unit.model.hp<=0||('healthBarHidden'in unit.model&&unit.model.healthBarHidden)||('teleportHidden'in unit.model&&unit.model.teleportHidden)
    const frame=hidden?(previous.get(key)??{key,z:3000,y:hb.sort_y_offset??0,x:0,draw:(hb.draw_order!==undefined?100000*hb.draw_order+1+i:200002+i)+entity.id}):{key,z:hb.z??3000,y:Math.ceil(unit.pos.y)+(hb.sort_y_offset??0),x:Math.floor(unit.pos.x),draw:(hb.draw_order!==undefined?100000*hb.draw_order+1+i:200002+i)+entity.id}
    add(frame,entity.id,unit.template.render.sprites.length+i)
   }
  }
  const retained=new Set(this.frames.map(f=>f.key));this.frames=this.frames.filter(f=>next.has(f.key)).map(f=>next.get(f.key)!)
  fresh.sort((a,b)=>a.insertion-b.insertion||a.ordinal-b.ordinal)
  this.frames.push(...fresh.filter(f=>!retained.has(f.frame.key)).map(f=>f.frame))
  this.frames.sort((a,b)=>a.z-b.z||b.y-a.y||a.draw-b.draw||a.x-b.x)
  this.ranks.clear();this.frames.forEach((f,index)=>this.ranks.set(f.key,index))
 }
}
