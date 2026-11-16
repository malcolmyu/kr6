import * as THREE from 'three'
import {worldSpriteOrder} from './NativePainterOrder.ts'
import {HealthBar} from './HealthBar.ts'
import type {HealthBarConfig} from './HealthBar.ts'
import type {GameSession} from './GameSession'
interface Bar {state:HealthBar;bg:THREE.Mesh<THREE.PlaneGeometry,THREE.MeshBasicMaterial>;fg:THREE.Mesh<THREE.PlaneGeometry,THREE.MeshBasicMaterial>}
/** Original solid-color render frames, sorted with world sprites at health_bar.z. */
export class HealthBarRenderer {
  private geometry=new THREE.PlaneGeometry(1,1)
  private bars=new Map<string,Bar>()
  private scene:THREE.Scene
  constructor(scene:THREE.Scene){this.scene=scene}
  advance(session:GameSession) {
    const live=new Set<string>()
    const units=[...session.enemies.map(e=>({key:`enemy-${e.id}`,source:e,id:e.id,hp:e.hp,max:Array.isArray(e.template.health.hp_max)?e.template.health.hp_max[1]:e.template.health.hp_max,pos:e.path.position,config:(e.template as unknown as {health_bar?:HealthBarConfig}).health_bar,removed:e.escapedAt!==undefined||e.teleportHidden})),...session.barracks.soldiers.map(s=>({key:`soldier-${s.id}`,source:s,id:s.id,hp:s.hp,max:s.template.health.hp_max,pos:s.pos,config:(s.template as unknown as {health_bar?:HealthBarConfig}).health_bar,removed:s.healthBarHidden}))]
    for(const unit of units) {
      if(!unit.config || unit.hp<=0 || unit.removed)continue
      live.add(unit.key)
      let bar=this.bars.get(unit.key)
      if(!bar) {
        const mesh=()=>{const m=new THREE.Mesh(this.geometry,new THREE.MeshBasicMaterial({transparent:true,depthTest:false,depthWrite:false}));this.scene.add(m);return m}
        bar={state:new HealthBar(unit.config),bg:mesh(),fg:mesh()};this.bars.set(unit.key,bar)
      }
      const frame=bar.state.sample(session.time,unit.hp,unit.max,unit.pos)
      for(const [mesh,width,color,order] of [[bar.bg,frame.width,frame.colors.bg,0],[bar.fg,frame.fillWidth,frame.colors.fg,1]] as const) {
        mesh.visible=!frame.hidden && frame.opacity>0
        mesh.scale.set(width,frame.height,1);mesh.position.set(frame.x+width/2,frame.y-frame.height/2,3)
        mesh.renderOrder=worldSpriteOrder(unit.config.z??3000,Math.ceil(unit.pos.y)+(unit.config.sort_y_offset??0))
        mesh.userData.nativePaint={draw:(unit.config.draw_order!==undefined?100000*unit.config.draw_order+1+order:200002+order)+(session.entities?.entity(unit.source)?.id??unit.id),x:Math.floor(unit.pos.x),y:Math.ceil(unit.pos.y)+(unit.config.sort_y_offset??0),z:unit.config.z??3000,key:`${session.entities?.entity(unit.source)?.id??unit.id}:health:${order+1}`}
        const history=session.paintOrder?.rank(mesh.userData.nativePaint.key)
        if(history!==undefined)mesh.userData.nativePaint.history=history
        mesh.material.color.setRGB(color[0]/255,color[1]/255,color[2]/255,THREE.SRGBColorSpace)
        mesh.material.opacity=frame.opacity
      }
    }
    for(const [key,bar] of this.bars)if(!live.has(key)){this.remove(bar);this.bars.delete(key)}
  }
  private remove(bar:Bar){for(const mesh of [bar.bg,bar.fg]){this.scene.remove(mesh);mesh.material.dispose()}}
  clear(){this.bars.forEach(bar=>this.remove(bar));this.bars.clear()}
  dispose(){this.clear();this.geometry.dispose()}
}
