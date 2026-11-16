import {luaSort} from './LuaSort.ts'
import type {LevelData,Point} from './types'
/** path_db.nearest_nodes defaults to subpath1, including inactive paths.
 * It finds one strict minimum per path, then applies the original Lua sort. */
export function wizardBookBounceNode(level:LevelData,pos:Point){
 const nodes=level.paths.paths.map((lanes,pi)=>{
  let best=9e99,ni=-1
  for(const [index,p]of lanes[0].entries()){const dx=p.x-pos.x,dy=p.y-pos.y,distance=dx*dx+dy*dy;if(distance<best){best=distance;ni=index}}
  return{pi:pi+1,ni:ni+1,distance:Math.sqrt(best),pos:lanes[0][ni]}
 }).filter(n=>n.ni>0)
 return luaSort(nodes,(a,b)=>a.distance<b.distance)[0]
}
/** Original controller_tower_wizard_book_bounce18325, no yielding wait. */
export class WizardBookBounceSystem {
 onCreateShot:()=>void=()=>{}
 onShot:(shot:{name:string;from:Point;to:Point;level:number})=>void=()=>{}
 onRemove:()=>void=()=>{}
 private level:LevelData
 private random:()=>number
 constructor(level:LevelData,random:()=>number){this.level=level;this.random=random}
 advance(pos:Point,level:number){
  this.onCreateShot()
  let x=10+Math.floor(this.random()*21);if(this.random()>.5)x=-x
  let y=10+Math.floor(this.random()*21);if(this.random()>.5)y=-y
  const node=wizardBookBounceNode(this.level,{x:pos.x+x,y:pos.y+y})
  if(!node)throw Error('Original wizard book bounce has no path node')
  this.onShot({name:'bullet_skill_c_wizard_2',from:{...pos},to:{...node.pos},level})
  this.onRemove()
 }
}
