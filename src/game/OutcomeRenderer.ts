import * as THREE from 'three'
import {SpriteAtlas} from './SpriteAtlas'
import {ExoSprite} from './ExoSprite'
import type {OutcomeArt} from './OutcomeAnimation'
import {outcomePlan} from './OutcomeAnimation'
import type {Outcome} from './Outcome'
export class OutcomeRenderer {
 private renderer:THREE.WebGLRenderer
 private scene=new THREE.Scene()
 private camera:THREE.OrthographicCamera
 private atlas?:SpriteAtlas
 private textures:THREE.Texture[]=[]
 private actors:{art:ExoSprite;animation:string;duration:number;idle?:string;idleAt?:number}[]=[]
 private disposed=false
 constructor(private element:HTMLElement,private data:OutcomeArt,private outcome:Outcome,private iron:boolean){
  this.renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.setSize(data.width,data.height);this.element.appendChild(this.renderer.domElement)
  this.camera=new THREE.OrthographicCamera(-data.width/2,data.width/2,data.height/2,-data.height/2,.1,100);this.camera.position.z=10
 }
 async load(){
  const loader=new THREE.TextureLoader(),maps:Record<string,THREE.Texture>={}
  await Promise.all(this.data.textures.map(async name=>{maps[name]=await loader.loadAsync('assets/'+name)}))
  if(this.disposed){Object.values(maps).forEach(t=>t.dispose());return}
  this.textures=Object.values(maps);this.atlas=new SpriteAtlas(this.data.atlas,maps)
  const choices=outcomePlan(this.outcome.kind,this.outcome.stars,this.iron,this.data.noGems).actors
  for(const [order,node] of (this.data.template.children??[]).entries()){
   const choice=choices[node.id??''];if(!choice||!node.exo_name)continue
   const art=new ExoSprite(this.atlas,this.data.exos[node.exo_name],.5);art.setOrder(order);this.scene.add(art.root)
   this.actors.push({art,...choice,duration:art.duration(choice.animation)})
  }
  this.render(0)
 }
 render(time:number){for(const a of this.actors){const idle=a.idle&&time>=a.duration;a.art.animate(idle?a.idle!:a.animation,idle?time-a.duration:Math.min(time,a.duration-1e-6))}this.renderer.render(this.scene,this.camera)}
 dispose(){this.disposed=true;this.actors.forEach(a=>a.art.dispose());this.atlas?.dispose();this.textures.forEach(t=>t.dispose());this.renderer.dispose();this.renderer.domElement.remove()}
}
