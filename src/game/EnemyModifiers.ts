import type {EnemyInstance} from './GameSession'
export function stunEnemy(enemy:EnemyInstance,delta:number){
 const unit=enemy.template.unit
 if(unit.ignore_stun)return
 unit.stun_count=Math.max(0,(unit.stun_count??(unit.is_stunned?1:0))+delta)
 unit.is_stunned=unit.stun_count>0
}
interface Status {enemy:EnemyInstance;at:number;animationAt?:number;duration?:number}
/** Same modifiers refresh their timestamp; separate stun sources own separate contributions. */
export class EnemyModifiers {
 readonly stuns=new Map<string,Status>()
 readonly slows=new Map<number,Status>()
 stun(enemy:EnemyInstance,time:number,duration=1,kind='mod_zefira_skill_a_stun'){
  if(enemy.hp<=0||enemy.template.vis.bans&4194308||enemy.template.vis.flags&32)return
  const key=`${enemy.id}:${kind}`,previous=this.stuns.get(key)
  if(previous)previous.at=time
  else{stunEnemy(enemy,1);this.stuns.set(key,{enemy,at:time,animationAt:time,duration})}
  if(enemy.template.unit.is_stunned){if(!enemy.meleeManaged)enemy.meleeAttack=undefined;enemy.idleStartedAt=time}
 }
 slow(enemy:EnemyInstance,time:number){
  if(enemy.hp<=0||enemy.template.vis.bans&4||enemy.template.motion.invulnerable)return
  if(!this.slows.has(enemy.id))enemy.template.motion.max_speed*=.75
  this.slows.set(enemy.id,{enemy,at:time})
 }
 advance(time:number){
  for(const [id,s]of this.stuns)if(s.enemy.hp<=0||time-s.at>=(s.duration??1)){stunEnemy(s.enemy,-1);this.stuns.delete(id)}
  for(const [id,s]of this.slows)if(s.enemy.hp<=0||time-s.at>=.3){s.enemy.template.motion.max_speed/=.75;this.slows.delete(id)}
 }
}
