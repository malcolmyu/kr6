import * as THREE from 'three'
import {guiLayout} from './GuiLayout'
import {SpriteAtlas} from './SpriteAtlas'
import {ExoSprite} from './ExoSprite'
import type {ExoDefinition} from './ExoSprite'
import type {AtlasFrame} from './SpriteAtlas'
interface OpeningData {atlas:Record<string,AtlasFrame>;exos:Record<string,ExoDefinition>;textures:string[];splashScale:number;splashFrames:{frame:string;fade:number;done:boolean}[]}
export class OpeningRenderer {
  private renderer:THREE.WebGLRenderer
  private scene=new THREE.Scene()
  private camera=new THREE.OrthographicCamera(-864,864,576,-576,.1,100)
  private atlas?:SpriteAtlas
  private data?:OpeningData
  private textures:THREE.Texture[]=[]
  private actors:ExoSprite[]=[]
  private started?:number
  private state:'ready'|'splash'|'menu'='ready'
  private observer:ResizeObserver
  private disposed=false
  private fadeMaterial=new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:0,depthTest:false,depthWrite:false})
  private fadeGeometry=new THREE.PlaneGeometry(10000,10000)
  private fade=new THREE.Mesh(this.fadeGeometry,this.fadeMaterial)
  menuMotion:{dx:number;dy:number}[]=[]
  onMenu:()=>void=()=>{}
  constructor(private element:HTMLElement) {
    this.renderer=new THREE.WebGLRenderer({antialias:true})
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.outputColorSpace=THREE.SRGBColorSpace
    this.camera.position.z=10;this.element.appendChild(this.renderer.domElement)
    this.observer=new ResizeObserver(()=>{
      this.renderer.setSize(element.clientWidth,element.clientHeight)
      this.resizeCamera()
    });this.observer.observe(element)
  }
  private resizeCamera(){
    const w=this.element.clientWidth,h=this.element.clientHeight
    const half=h/guiLayout(w,h,true).scale/2,aspect=w/h
    this.camera.left=-half*aspect;this.camera.right=half*aspect;this.camera.top=half;this.camera.bottom=-half;this.camera.updateProjectionMatrix()
  }
  async load(){
    const response=await fetch('/data/opening.json');if(!response.ok)throw new Error('启动资源载入失败')
    const data:OpeningData=await response.json(),loader=new THREE.TextureLoader()
    const maps:Record<string,THREE.Texture>={}
    await Promise.all(data.textures.map(async name=>{maps[name]=await loader.loadAsync(`/assets/${name}`)}))
    if(this.disposed){Object.values(maps).forEach(t=>t.dispose());return}
    this.textures=Object.values(maps);this.data=data;this.atlas=new SpriteAtlas(data.atlas,maps)
    this.renderer.render(this.scene,this.camera)
  }
  start(){
    if(!this.atlas||!this.data)throw new Error('Opening not loaded')
    this.state='splash';this.started=undefined
    const splash=new ExoSprite(this.atlas,this.data.exos.SplashScreenAnimationDef,.5)
    splash.root.scale.setScalar(this.data.splashScale)
    this.fadeMaterial.opacity=0;this.fade.position.z=8;this.fade.renderOrder=20000
    this.actors=[splash];this.scene.add(splash.root,this.fade)
    this.renderer.setAnimationLoop(time=>this.frame(time))
  }
  private showMenu(){
    this.actors.forEach(a=>a.dispose());this.scene.clear()
    const bg=new ExoSprite(this.atlas!,this.data!.exos.ScreenSlotsBGDef,.5),logo=new ExoSprite(this.atlas!,this.data!.exos.ScreenSlotsLogoDef,.5)
    // UI_main_menu's original logo view is centred, with a 0.9741 scale.
    logo.root.scale.setScalar(.9741);logo.setOrder(1000)
    // GGExo uses raw UI part positions with ipadhd ref_scale=.5.
    this.state='menu';this.resizeCamera()
    this.scene.add(bg.root,logo.root);this.actors=[bg,logo];this.started=undefined;this.onMenu()
  }
  private frame(time:number){
    if(this.started===undefined)this.started=time
    const elapsed=(time-this.started)/1000
    if(this.state==='splash'){
      const frames=this.data!.splashFrames,pose=frames[Math.min(frames.length-1,Math.floor(elapsed*30+1e-9))]
      if(pose.done){this.showMenu();return}
      const frame=Number(pose.frame.slice(-4))
      this.actors[0].animate('idle',(frame-1+1e-6)/30,false)
      this.fadeMaterial.opacity=pose.fade
    }else if(this.state==='menu'){
      const bgIntro=39/30,logoIntro=62/30,menuElapsed=elapsed+2/30
      const motion=this.menuMotion[Math.min(this.menuMotion.length-1,Math.floor(elapsed*30+1e-9))]
      if(motion)for(const actor of this.actors)actor.root.position.set(motion.dx,-motion.dy,0)
      this.actors[0].animate(menuElapsed<bgIntro?'in':'idle',menuElapsed<bgIntro?menuElapsed:menuElapsed-bgIntro)
      this.actors[1].animate(menuElapsed<logoIntro?'intro':'loop',menuElapsed<logoIntro?menuElapsed:menuElapsed-logoIntro)
    }
    this.renderer.render(this.scene,this.camera)
  }
  dispose(){this.disposed=true;this.renderer.setAnimationLoop(null);this.observer.disconnect();this.actors.forEach(a=>a.dispose());this.atlas?.dispose();this.textures.forEach(t=>t.dispose());this.fadeGeometry.dispose();this.fadeMaterial.dispose();this.renderer.dispose();this.renderer.domElement.remove()}
}
