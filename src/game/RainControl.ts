import {RoadPlacement} from './RoadPlacement.ts'
import type {LevelData,Point} from './types'
export interface RainControlConfig {meteor_count:number;cataclysm_count:number;upgrade_cataclysm:boolean;min_spread:number;max_spread:number}
export interface RainCast {pos:Point;index:number;last?:number;height?:number}
/** Original power_rain_of_fire_control31400, including per-burst waits and five-attempt road sampling. */
export class RainControl {
 readonly casts:RainCast[]=[]
 onRemove:(cast:RainCast)=>void=()=>{}
 onMeteor:(to:Point,time:number,cataclysm:boolean,height:number)=>void=()=>{}
 visibleTop=768
 private level:LevelData
 private config:RainControlConfig
 private random:()=>number
 constructor(level:LevelData,config:RainControlConfig,random:()=>number){this.level=level;this.config=config;this.random=random}
 cast(pos:Point){const cast={pos:{...pos},index:0};this.casts.push(cast);return cast}
 private integer(min:number,max:number){return Math.floor(min)+Math.floor(this.random()*(Math.floor(max)-Math.floor(min)+1))}
 private active(){return this.level.paths.paths.map((_,index)=>index).filter(index=>this.level.paths.active[index]!==false)}
 clamp(pos:Point){
  let best:{pi:number;ni:number;distance:number}|undefined
  for(const pi of this.active())for(const [ni,node]of this.level.paths.paths[pi][0].entries()){
   if(this.level.navigation?.rallyNodes?.[pi]?.[ni]===false)continue
   const distance=Math.hypot(pos.x-node.x,pos.y-node.y)
   if(!best||distance<best.distance)best={pi,ni,distance}
  }
  if(!best)return pos
  const lanes=this.level.paths.paths[best.pi],node=lanes[0][best.ni],side=lanes[1][best.ni],halfWidth=Math.hypot(node.x-side.x,node.y-side.y)
  if(best.distance>halfWidth){pos.x=node.x+(pos.x-node.x)*halfWidth/best.distance;pos.y=node.y+(pos.y-node.y)*halfWidth/best.distance}
  return pos
 }
 private randomDestination(){
  const active=this.active();if(!active.length)return
  const pi=active[this.integer(1,active.length)-1],spi=this.integer(1,3)-1,lanes=this.level.paths.paths[pi],flags=this.level.navigation?.targetNodes?.[pi],valid=lanes[0].map((_,index)=>index).filter(index=>flags?flags[index]:true)
  if(!valid.length)return
  for(let attempt=0;attempt<5;attempt++){
   const ni=valid[this.integer(1,valid.length)-1],validAt=(index:number)=>index>=0&&index<lanes[0].length&&(!flags||flags[index])
   if(!validAt(ni-10)||!validAt(ni+10))continue
   const pos=lanes[spi][ni];if(!(new RoadPlacement(this.level).cell(pos)&1))continue
   return {...pos}
  }
 }
 advance(time:number){
  for(const cast of [...this.casts].reverse())this.advanceOne(cast,time)
 }
 advanceOne(cast:RainCast,time:number){
   const c=this.config
   cast.height??=this.visibleTop
   if(cast.last!==undefined&&time-cast.last<.33)return
   if(cast.index>=Math.max(c.meteor_count,c.cataclysm_count)){this.casts.splice(this.casts.indexOf(cast),1);this.onRemove(cast);return}
   if(cast.index<c.meteor_count){const pos={...cast.pos};if(cast.index>0){const spread=this.integer(c.min_spread,c.max_spread);pos.x+=this.integer(-spread,spread);pos.y+=this.integer(-spread,spread)}this.onMeteor(this.clamp(pos),time,false,cast.height)}
   if(c.upgrade_cataclysm&&cast.index<c.cataclysm_count){const pos=this.randomDestination();if(pos)this.onMeteor(this.clamp(pos),time,true,cast.height)}
   cast.last=time;cast.index++
 }
}
