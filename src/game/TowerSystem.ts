import type { LevelData, GameMode, Point } from './types'
export type TowerKind = 'archers' | 'wizard' | 'knights' | 'catapult' | 'culverine'
export interface TowerPower {level:number;max_level:number;price:number[];price_base?:number;price_inc?:number}
export const implementedTowerPowers:Record<string,string[]>={archers:['skill_a','skill_b','skill_c'],wizard:['skill_a','skill_b','skill_c'],catapult:['skill_a','skill_b','skill_c'],knights:['skill_a','skill_b','skill_c']}
export interface TowerTemplate {
  powers?:Record<string,TowerPower>
  tower: { price:number; refund_factor:number; level:number; type:string;menu_offset?:Point;range_offset?:Point }
  build_duration?: number
  build_name?: string
  render: {sprites: {z?:number;draw_order?:number;sort_y?:number;sort_y_offset?:number;name:string;prefix?:string;exo?:boolean;animated?:boolean;loop?:boolean;offset:Point;anchor:Point;hidden?:boolean;scale?:Point;fps?:number;ts?:number}[]}
}
export interface TowerSite {
  id:string; pos:Point; terrain:number; holder:string; rally:Point
  tower?:string; building?:string; buildStartsAt?:number;completionQueuedAt?:number;completesAt?:number; spent:number
  powerChanges?:Set<string>;instance?:number;powerLevels?:Record<string,number>;powerPreview?:string
  selling?:boolean
  canBeModified?:boolean
  vis?:{flags:number;bans:number};towerBlocked?:boolean;canBeMod?:boolean;damageFactor?:number;rangeFactor?:number;attackDisabled?:boolean;attackBansOverride?:number
}
export class TowerSystem {
  onCompletionQueued:(site:TowerSite,name:string,time:number)=>void=()=>{}
  readonly sites: TowerSite[]=[]
  readonly available: string[]
  readonly locked:Set<string>
  private forced?:string[]
  private templates:Record<string,TowerTemplate>
  constructor(level:LevelData, mode:GameMode, templates:Record<string,TowerTemplate>,selected:TowerKind[]=['archers','knights','catapult']) {
    this.templates=templates
    const modeId=mode==='campaign'?1:3
    const data=level.data as LevelData['data'] & {locked_towers?:string[];level_mode_overrides?:({available_towers?:string[];locked_towers?:string[]}|null)[]}
    this.forced=data.level_mode_overrides?.[modeId-1]?.available_towers
    this.available=[...(this.forced??selected.map(kind=>`tower_build_${kind}`))]
    this.locked=new Set(data.level_mode_overrides?.[modeId-1]?.locked_towers??data.locked_towers??[])
    for(const entity of data.entities_list) {
      if(!entity.template.startsWith('tower_'))continue
      const filter=Number(entity['editor.game_mode']??0)
      if(filter!==0 && filter!==modeId)continue
      if(!entity.pos)continue
      const id=String(entity['tower.holder_id'])
      if(this.sites.some(s=>s.id===id))throw new Error(`Duplicate tower holder ${id}`)
      this.sites.push({id,pos:entity.pos,terrain:Number(entity['tower.terrain_style']??1),holder:entity.template.startsWith('tower_holder')?entity.template:'tower_holder_terrain_1_1',rally:(entity['tower.default_rally_pos'] as Point)??entity.pos,tower:entity.template.startsWith('tower_holder')?undefined:entity.template,spent:0})
    }
  }
  setLoadout(selected:TowerKind[]){this.available.splice(0,this.available.length,...(this.forced??selected.map(kind=>`tower_build_${kind}`)))}
  price(kind:TowerKind):number { return this.templates[`tower_${kind}_lvl1`].tower.price }
  menuPosition(site:TowerSite):Point {const offset=this.templates[site.tower??site.holder].tower.menu_offset??{x:0,y:0};return {x:site.pos.x+offset.x,y:site.pos.y+offset.y}}
  nextUpgrade(site:TowerSite):{name:string;price:number}|undefined {
    if(!site.tower || site.building || site.canBeModified===false)return
    const tower=this.templates[site.tower].tower
    if(tower.level>=4)return
    const name=`tower_${tower.type}_lvl${tower.level+1}`
    if(!this.templates[name] || this.locked.has(name))return
    return {name,price:this.templates[name].tower.price}
  }
  upgrade(id:string,gold:number):number {
    const site=this.sites.find(s=>s.id===id),next=site?this.nextUpgrade(site):undefined
    if(!site || !next)throw new Error('此防御塔无法升级')
    if(gold<next.price)throw new Error('金币不足')
    site.tower=next.name;site.spent+=next.price
    return gold-next.price
  }
  nextPower(site:TowerSite,power:string){
    if(!site.tower||site.building||site.canBeModified===false)return
    const template=this.templates[site.tower],kind=template.tower.type
    if(!implementedTowerPowers[kind]?.includes(power))return
    const config=template.powers?.[power],level=site.powerLevels?.[power]??config?.level??0
    if(!config||level>=config.max_level)return
    return {level:level+1,price:config.price[level],max:config.max_level}
  }
  upgradePower(id:string,power:string,gold:number){
    const site=this.sites.find(s=>s.id===id),next=site?this.nextPower(site,power):undefined
    if(!site||!next)throw new Error('此防御塔技能无法升级')
    if(gold<next.price)throw new Error('金币不足')
    site.powerLevels={...site.powerLevels,[power]:next.level};(site.powerChanges??=new Set()).add(power);site.spent+=next.price;site.powerPreview=undefined
    return gold-next.price
  }
  refund(site:TowerSite,wave:number):number {
    if(!site.tower || site.building || site.canBeModified===false)return 0
    return wave===0?site.spent:Math.floor(site.spent*this.templates[site.tower].tower.refund_factor+.5)
  }
  sell(id:string,gold:number,wave:number):number {
    const site=this.sites.find(s=>s.id===id)
    if(!site?.tower || site.building || site.canBeModified===false)throw new Error('此防御塔无法出售')
    const refund=this.refund(site,wave)
    site.tower=undefined;site.spent=0;site.instance=(site.instance??0)+1;site.powerLevels=undefined;site.powerChanges=undefined;site.powerPreview=undefined;site.damageFactor=1;site.rangeFactor=undefined;site.attackDisabled=undefined;site.attackBansOverride=undefined
    return gold+refund
  }
  build(id:string,kind:TowerKind,gold:number,time:number):number {
    const site=this.sites.find(s=>s.id===id)
    if(!site || site.tower || site.building)throw new Error('此位置无法建造')
    const build=`tower_build_${kind}`
    if(!this.available.includes(build))throw new Error('此挑战无法建造该塔')
    const price=this.price(kind)
    if(gold<price)throw new Error('金币不足')
    // GUI upgrade flag -> next tower_upgrade phase -> next insertion flush.
    site.building=build;site.buildStartsAt=(Math.round(time*30)+2)*(1/30);site.completesAt=site.buildStartsAt+this.templates[build].build_duration!;site.completionQueuedAt=undefined;site.spent=price
    return gold-price
  }
  update(time:number):TowerSite[] {
    const completed=[]
    for(const site of this.sites)if(site.building){
      if(site.completionQueuedAt!==undefined){
        if(time<=site.completionQueuedAt)continue
        site.tower=this.templates[site.building].build_name
        site.building=undefined;site.buildStartsAt=undefined;site.completesAt=undefined;site.completionQueuedAt=undefined;completed.push(site)
      }else if(time-site.buildStartsAt!>this.templates[site.building].build_duration!){site.completionQueuedAt=time;this.onCompletionQueued(site,this.templates[site.building].build_name!,time)}
    }
    return completed
  }
}
