import {nativeAnimationFrame} from './NativeAnimation.ts'
import {nativeSpriteOrder} from './NativePainterOrder.ts'
import shieldData from '../../public/data/zefira-shield.json' with {type:'json'}
import hammerData from '../../public/data/zefira-hammer.json' with {type:'json'}
import type * as THREE from 'three'
import {ExoSprite} from './ExoSprite'
import type {ExoDefinition} from './ExoSprite'
import type {AtlasSprite,Animation,SpriteAtlas} from './SpriteAtlas'
import type {GameSession} from './GameSession'
import {zefiraShieldPose} from './ZefiraSkills'
/** The hammer decal contains two independently animated EXOs. */
export class ZefiraSkillsRenderer {
 private exoSprites=new Map<string,ExoSprite>()
 private stunSprites=new Map<string,AtlasSprite>()
 private scene:THREE.Scene
 private atlas:SpriteAtlas
 private exos:Record<string,ExoDefinition>
 private animations:Record<string,Animation>
 constructor(scene:THREE.Scene,atlas:SpriteAtlas,exos:Record<string,ExoDefinition>,animations:Record<string,Animation>){this.scene=scene;this.atlas=atlas;this.exos=exos;this.animations=animations}
 advance(session:GameSession){
  const live=new Set<string>(),system=session.heroes.zefiraSkills,time=session.time
  const draw=(key:string,prefix:string,name:string,age:number,loop:boolean,x:number,y:number,order:number,flip=false,nativeFps?:number)=>{
   live.add(key);let art=this.exoSprites.get(key)
   if(!art){art=new ExoSprite(this.atlas,this.exos[prefix]);this.scene.add(art.root);this.exoSprites.set(key,art)}
   art.root.position.set(x,y,2);art.root.scale.x=flip?-1:1;art.setOrder(order);art.animate(name,age,loop,nativeFps);return art
  }
  const blink=session.heroes.zefiraMovement.buff
  for(const s of session.heroes.zefiraUltimate.spears)if(!s.removed&&s.at!==undefined){draw(`spear-${s.id}`,'hero_zefira_ultimateDef',s.phase,time-s.animationAt!,s.phase==='loop',s.pos.x,s.pos.y,13000-s.pos.y,s.flip)}
  for(const f of session.heroes.zefiraUltimate.floors)if(time>f.at)draw(`spear-floor-${f.id}`,'hero_zefira_ultimate_decalDef','out',time-f.at,false,f.pos.x,f.pos.y,5000-f.pos.y)
  if(blink){const p=blink.hero.pos,age=time-blink.animationAt,loop=blink.phase==='loop'
   draw('blink-ground','hero_zefira_teleport_decalDef',blink.phase,age,loop,p.x,p.y,5000-p.y)
   draw('blink-buff','hero_zefira_teleport_buffDef',blink.phase,age,loop,p.x,p.y,13000-p.y)
  }
  for(const [id,m]of session.heroes.zefiraTalents.weaknesses){
   const e=m.enemy;if(e.teleportHidden)continue
   const big=(e.template.unit.size??1)>=2,p=e.path.position,offset=e.template.unit.mod_offset??{x:0,y:0},age=time-m.animationAt
   draw(`weak-${id}-ground`,big?'hero_zefira_talent_decal_bigDef':'hero_zefira_talent_decalDef','idle',age,true,p.x,p.y,5000-p.y)
   draw(`weak-${id}-upper`,big?'hero_zefira_talent_mod_bigDef':'hero_zefira_talent_modDef','loop',age,true,p.x+offset.x,p.y+offset.y,13000-p.y)
  }
  for(const s of system.nativeShield.shields)if(s.inserted){const config=shieldData.aura_zefira_skill_b.render.sprites[0],art=draw(s.buffKey,config.prefix,s.name,time-s.ts,s.phase==='loop',s.pos.x,s.pos.y,0,false,30);art.setOrder(...nativeSpriteOrder(config,s.pos,session.entities?.entity(s)?.id??0))}
  if(system.shield){const s=system.shield,p=zefiraShieldPose(s,time);draw('shield','hero_zefira_skill2Def',p.name,p.age,p.loop,s.hero.pos.x,s.hero.pos.y,13000-s.hero.pos.y)}
  for(const decal of system.decals){const age=time-decal.at,key=`hammer-${decal.at}`,p=decal.pos
   draw(key,'hero_zefira_skill1_decalDef',age<1?'idle':'out',age<1?age:age-1,age<1,p.x,p.y,5000-p.y)
   draw(`${key}-particles`,'hero_zefira_skill1_decalfxDef','skill_1',age,false,p.x,p.y,13000-p.y)
  }
  for(const decal of system.nativeHammer.decals){const p=decal.pos
   const id=session.entities?.entity(decal)?.id??0,configs=hammerData.decal_zefira_skill_a_hit.render.sprites
   const ground=draw(decal.key,configs[0].prefix,decal.name,time-decal.ts,decal.name==='idle',p.x,p.y,0,false,30)
   ground.setOrder(...nativeSpriteOrder(configs[0],p,id,1))
   const particles=draw(decal.key+'-particles',configs[1].prefix,'skill_1',time-decal.at,false,p.x,p.y,0,false,30)
   particles.setOrder(...nativeSpriteOrder(configs[1],p,id,2))
  }
  const stunLive=new Set<string>()
  const stuns=[...session.knightLegacy.stuns.stuns.map(s=>({key:`knight-legacy-${session.entities?.entity(s)?.id}`,enemy:s.enemy,at:s.spriteTs,model:s})),...session.archerPierceStun.stuns.map(s=>({key:`archer-pierce-${session.entities?.entity(s)?.id}`,enemy:s.enemy,at:s.spriteTs,model:s})),...[...system.modifiers.stuns].map(([id,s])=>({key:String(id),enemy:s.enemy,at:s.animationAt??s.at,model:undefined})),...[...system.nativeHammer.stuns.values()].map(s=>({key:s.key,enemy:s.enemy,at:s.spriteTs,model:s}))]
  for(const s of stuns){
   const e=s.enemy,key=s.key;if(e.teleportHidden)continue
   stunLive.add(key);let art=this.stunSprites.get(key)
   if(!art){art=this.atlas.create();this.scene.add(art.root);this.stunSprites.set(key,art)}
   const model=s.model,pos=model?.pos??e.path.position,offset=model&&'offset'in model?model.offset:e.template.unit.mod_offset??{x:0,y:0},name=`stun_${(e.template.unit.size??1)>1?'big':'small'}_loop`
   art.root.position.set(pos.x+offset.x,pos.y+offset.y,2);if(model)art.setOrder(...nativeSpriteOrder(hammerData.mod_zefira_skill_a_stun.render.sprites[0],pos,session.entities?.entity(model)?.id??0));else art.setOrder(13020-pos.y);if(model&&'offset'in model){const a=this.animations[name],frame=nativeAnimationFrame(a.to-a.from+1,time-s.at,true,30).frame;art.setFrame(`${a.prefix}_${String(a.from+frame).padStart(4,'0')}`,{x:.5,y:.5},model.flip)}else art.animate(this.animations[name],time-s.at,30,{x:.5,y:.5})
  }
  for(const [key,art]of this.exoSprites)if(!live.has(key)){art.dispose();this.exoSprites.delete(key)}
  for(const [key,art]of this.stunSprites)if(!stunLive.has(key)){art.dispose();this.stunSprites.delete(key)}
 }
 dispose(){for(const a of this.exoSprites.values())a.dispose();for(const a of this.stunSprites.values())a.dispose();this.exoSprites.clear();this.stunSprites.clear()}
}
