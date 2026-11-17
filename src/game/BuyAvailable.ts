import style from '../../public/data/buy-available.json' with {type:'json'}
import type {TowerSite,TowerSystem} from './TowerSystem'
import type {Point} from './types'

interface BuyTarget {
 tower:{type:string;level?:number;max_level?:number;disable_spend_highlight?:boolean;override_next_level_e?:string|string[]}
 tower_holder?:{blocked:boolean;unblock_price:number}
 powers?:Record<string,{level:number;price:number[]|number}>
 repair?:{active:boolean;cost:number}
 user_selection?:{allowed:boolean};attacks?:{list:{price?:number}[]}
 ui?:{can_click?:boolean;hover_sprite_anchor?:Point;hover_sprite_scale?:Point;hover_sprite_offset?:Point}
}
/** Original mod_buy_available52629 priority and Lua truthiness. */
export function buyAvailableHidden(target:BuyTarget,gold:number,minCost:number,hide:boolean,locked:readonly string[],templates:Record<string,{tower:{price:number}}>){
 let hidden=true
 if(hide||target.tower.disable_spend_highlight)hidden=true
 else if(target.repair?.active)hidden=true
 else if(target.repair)hidden=gold<target.repair.cost
 else if(target.powers){
  let cost=1e99
  for(const [name,power]of Object.entries(target.powers))if(name!=='ultimate'&&Array.isArray(power.price)&&power.level<power.price.length)cost=Math.min(cost,power.price[power.level])
  hidden=gold<cost
 }else if(target.user_selection?.allowed&&target.attacks?.list.some(a=>a.price!==undefined))hidden=gold<target.attacks.list.find(a=>a.price!==undefined)!.price!
 else if(!target.tower_holder&&target.tower.level!==undefined&&target.tower.level<4&&(target.tower.max_level===undefined||target.tower.level<target.tower.max_level)){
  const next=target.tower.override_next_level_e??`tower_${target.tower.type}_lvl${target.tower.level+1}`
  for(const name of Array.isArray(next)?next:[next]){const t=templates[name];if(t)hidden=gold<t.tower.price||locked.includes(name)}
 }else if(target.tower_holder)hidden=gold<(target.tower_holder.blocked?target.tower_holder.unblock_price:minCost)
 if(target.ui&&!target.ui.can_click)hidden=true
 return hidden
}

/** Original tween2256 looping/quad_out, including duplicate key boundaries. */
export function buyAvailablePulse(time:number,startedAt:number){
 const result={alpha:0,scale:{x:1.2,y:1.2}}
 for(const property of style.tween.props){
  const keys=property.keys as [number,number|Point][],end=keys.at(-1)![0],start=keys[0][0],duration=end-start
  const remainder=(time-startedAt)%duration,elapsed=remainder<0?remainder+duration:remainder,t=Math.max(start,Math.min(end,elapsed))
  let a=keys[0],b=keys.at(-1)!
  for(const key of keys){if(key[0]<=t)a=key;if(t<=key[0]){b=key;break}}
  const f=a===b?0:1-(1-(t-a[0])/(b[0]-a[0]))**2
  if(typeof a[1]==='number')result.alpha=a[1]+((b[1] as number)-a[1])*f
  else{const p=b[1] as Point;result.scale={x:a[1].x+(p.x-a[1].x)*f,y:a[1].y+(p.y-a[1].y)*f}}
 }
 return result
}
export const buyAvailableSprite=style.render.sprites[0]
export interface BuyIndicator {site:TowerSite;targetId?:number;insertAt:number;checkedAt:number;hidden:boolean;anchor:Point;offset:Point}
/** controller52571 allocates once per tower and transfers its modifier across
 * upgrades. Creation is exposed for the shared entity allocator integration. */
export class BuyAvailableSystem {
 sitesInOrder:()=>TowerSite[]
 readonly indicators=new Map<string,BuyIndicator>()
 onCreate:(site:TowerSite,time:number)=>void=()=>{}
 onRemove:(state:BuyIndicator)=>void=()=>{}
 targetPresent:(state:BuyIndicator)=>boolean=()=>true
 forceCheck=false
 animationTs=0
 private started=false
 private initialized=false
 private checkTs=0
 private minCost=1e99
 private towers:TowerSystem
 private templates:Record<string,BuyTarget&{tower:{price:number}}>
 constructor(towers:TowerSystem,templates:Record<string,BuyTarget&{tower:{price:number}}>){this.towers=towers;this.templates=templates;this.sitesInOrder=()=>towers.sites}
 advance(time:number,gold:number,hide=false){
  if(!this.started){this.started=true;this.minCost=Math.min(1e99,...this.towers.available.map(name=>this.templates[name.replace('tower_build_','tower_')+'_lvl1'].tower.price));return}
  if(!this.initialized){this.initialized=true;this.checkTs=this.animationTs=time}
  if(time-this.checkTs>.25||this.forceCheck){
   this.checkTs=time;this.forceCheck=false
   for(const site of this.sitesInOrder()){
    const template=this.templates[site.tower??site.building??site.holder]
    if(template.tower.disable_spend_highlight||this.indicators.has(site.id))continue
    const ui=template.ui
    this.indicators.set(site.id,{site,insertAt:(Math.round(time*30)+1)*(1/30),checkedAt:-Infinity,hidden:true,anchor:ui?.hover_sprite_anchor??buyAvailableSprite.anchor,offset:ui?.hover_sprite_offset??buyAvailableSprite.offset})
    this.onCreate(site,time)
   }
  }
  for(const state of this.indicators.values()){
   if(time<state.insertAt||time-state.checkedAt<.2)continue
   if(!this.targetPresent(state)){this.onRemove(state);this.indicators.delete(state.site.id);continue}
   const site=state.site,key=site.building&&time>=(site.buildStartsAt??0)?site.building:site.tower??site.holder,template=this.templates[key]
   const target={...template,ui:{...template.ui,...(site.canBeModified===false?{can_click:false}:{})},...(template.powers?{powers:Object.fromEntries(Object.entries(template.powers).map(([k,p])=>[k,{...p,level:site.powerLevels?.[k]??p.level}]))}:{})}
   state.hidden=buyAvailableHidden(target,gold,this.minCost,hide,[...this.towers.locked],this.templates)
   // U.y_wait resumes at elapsed >= duration, retaining floating-point edges.
   state.checkedAt=time
  }
 }
}
