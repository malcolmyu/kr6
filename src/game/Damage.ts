export interface Health {hp:number;armor:number;magic_armor:number;poison_armor?:number;damage_factor?:number;damage_factor_magical?:number}
export interface Damage {value:number;damage_type:number;reduce_armor?:number;reduce_magic_armor?:number;explosive_factor?:number}
/** Port of shipped utils.predict_damage; enemies floor post-armour damage. */
export function predictDamage(health:Health,damage:Damage,soldier=false):number {
  const type=damage.damage_type
  if(type & (1024|4096))return health.hp
  let armor=0
  if(type&32)armor=health.poison_armor??0
  else if(type&(1|64|2048))armor=0
  else if(type&2)armor=health.armor-(damage.reduce_armor??0)
  else if(type&4)armor=health.magic_armor-(damage.reduce_magic_armor??0)
  else if(type&(8|16))armor=(health.armor-(damage.reduce_armor??0))*(damage.explosive_factor===undefined?.5:Math.max(0,Math.min(1,1-damage.explosive_factor)))
  else if(type===0)armor=1
  let value=damage.value
  if(type&4 && health.damage_factor_magical!==undefined)value=Math.floor(value*health.damage_factor_magical+.5)
  value=Math.floor(value*(health.damage_factor??1)+.5)
  const applied=soldier?value-Math.floor(value*Math.max(0,Math.min(1,armor))):Math.floor(value*Math.max(0,Math.min(1,1-armor)))
  return type&8388608 && health.hp<=applied?health.hp-1:applied
}
