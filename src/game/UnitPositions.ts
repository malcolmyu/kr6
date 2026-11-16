import type {Point} from './types'
/** Shipped utils.rally_formation_position and utils.melee_slot_position. */
export function rallyFormation(index:number,count:number,center:Point,radius:number,angleOffset=0):Point {
  if(count===1)return {...center}
  const angle=(index-1)*2*Math.PI/count-Math.PI/2+angleOffset
  return {x:center.x+radius*Math.cos(angle),y:center.y+radius*.7*Math.sin(angle)}
}
export function meleeSlot(index:number,enemy:Point,heading:number,enemyOffset:Point,offset:Point,spread:Point={x:-3,y:-6}):Point {
  const rank=(index-1)%3+1
  const angle=Math.atan2(Math.sin(heading),Math.cos(heading))
  const sign=Math.abs(angle)<Math.PI/2?1:-1
  return {x:enemy.x+(enemyOffset.x+offset.x+(rank>1?spread.x:0))*sign,y:enemy.y+enemyOffset.y+offset.y+(rank===2?spread.y:rank===3?-spread.y:0)}
}
