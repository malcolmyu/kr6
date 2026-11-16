import * as THREE from 'three'
import {SpriteAtlas} from './SpriteAtlas'
import type {AtlasFrame} from './SpriteAtlas'
import {guiLayout} from './GuiLayout'
import {ExoSprite} from './ExoSprite'
import type {ExoDefinition} from './ExoSprite'
import type {TransitionPhase} from './SceneTransitionController'
export interface TransitionData {atlas:Record<string,AtlasFrame>;exo:ExoDefinition;textures:string[];images:Record<string,{x:number;y:number}>;refWidth:number;refHeight:number}
export class SceneTransitionRenderer {
 private renderer:THREE.WebGLRenderer
 private scene=new THREE.Scene()
 private camera=new THREE.OrthographicCamera(-1024,1024,768,-768,.1,100)
 private atlas?:SpriteAtlas
 private actor?:ExoSprite
 private textures:THREE.Texture[]=[]
 private observer:ResizeObserver
 private disposed=false
 private scale=1
 onResize:(width:number,height:number)=>void=()=>{}
 constructor(private host:HTMLElement){
  this.renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.setClearColor(0,0);this.camera.position.z=10;host.append(this.renderer.domElement)
  this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(host)
 }
 private resize(){const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return
  const layout=guiLayout(w,h,true),width=w/layout.scale,height=h/layout.scale;this.scale=layout.sw/1024;this.renderer.setSize(w,h);this.camera.left=-width/2;this.camera.right=width/2;this.camera.top=height/2;this.camera.bottom=-height/2;this.camera.updateProjectionMatrix();if(this.actor)this.actor.root.scale.setScalar(this.scale);this.onResize(w,h)
 }
 async load(){
  const r=await fetch('/data/scene-transition.json');if(!r.ok)throw new Error('转场资源载入失败');const data:TransitionData=await r.json(),loader=new THREE.TextureLoader(),maps:Record<string,THREE.Texture>={}
  await Promise.all(data.textures.map(async name=>{maps[name]=await loader.loadAsync(`/assets/${name}`)}))
  if(this.disposed){Object.values(maps).forEach(t=>t.dispose());return}
  this.textures=Object.values(maps);this.atlas=new SpriteAtlas(data.atlas,maps);this.actor=new ExoSprite(this.atlas,data.exo,.5);this.scene.add(this.actor.root);this.resize();return data
 }
 draw(phase:TransitionPhase,age:number){if(!this.actor)return;this.actor.animate(phase==='closing'?'doors_in':phase==='opening'?'doors_out':'loading',age,phase==='loading');this.renderer.render(this.scene,this.camera)}
 dispose(){this.disposed=true;this.observer.disconnect();this.actor?.dispose();this.atlas?.dispose();this.textures.forEach(t=>t.dispose());this.renderer.dispose();this.renderer.domElement.remove()}
}
