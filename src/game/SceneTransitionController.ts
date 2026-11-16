export type TransitionPhase='closing'|'loading'|'opening'
interface Hooks {visible:(value:boolean)=>void;pose:(phase:TransitionPhase,age:number,progress:number)=>void;sound:(name:string)=>void;now:()=>number;requestFrame:(fn:(time:number)=>void)=>number;cancelFrame:(id:number)=>void}
/** Native loadingDef timing; async ownership/cancellation is independent of the battle clock. */
export class SceneTransitionController {
 busy=false
 private serial=0
 private phase:TransitionPhase='closing'
 private phaseAt=0
 private progress=0
 private raf?:number
 private finishWait?:()=>void
 private abort?:()=>void
 private hooks:Hooks
 constructor(hooks:Hooks){this.hooks=hooks}
 private draw(){this.hooks.pose(this.phase,(this.hooks.now()-this.phaseAt)/1000,this.progress)}
 private setPhase(phase:TransitionPhase){this.phase=phase;this.phaseAt=this.hooks.now();this.draw()}
 private wait(seconds:number,token:number){return new Promise<boolean>(resolve=>{
  const start=this.hooks.now();this.finishWait=()=>resolve(false)
  const frame=()=>{this.raf=undefined;if(token!==this.serial){resolve(false);return}this.draw();if((this.hooks.now()-start)/1000+1e-9>=seconds){this.finishWait=undefined;resolve(true)}else this.raf=this.hooks.requestFrame(frame)}
  this.raf=this.hooks.requestFrame(frame)
 })}
 cancel(){this.serial++;if(this.raf!==undefined)this.hooks.cancelFrame(this.raf);this.raf=undefined;this.finishWait?.();this.finishWait=undefined;this.abort?.();this.abort=undefined;this.busy=false;this.hooks.visible(false)}
 async run(prepare:(report:(images:number,audio?:number)=>void,current:()=>boolean)=>Promise<unknown>){
  if(this.busy)return false
  this.busy=true;const token=++this.serial,current=()=>token===this.serial;this.progress=0;this.hooks.visible(true)
  const aborted=new Promise<'cancelled'>(resolve=>{this.abort=()=>resolve('cancelled')})
  try{
   this.setPhase('closing');this.hooks.sound('GUITransitionClose')
   if(!await this.wait(22/30,token))return false
   this.setPhase('loading')
   // GGLoadingSword reveals at EXO completion; screen_loading defers "closed" one update.
   if(!await this.wait(1/30,token))return false
   const prepared=Promise.resolve(prepare((images,audio=1)=>{if(current()){this.progress=.8*Math.max(0,Math.min(1,images))+.2*Math.max(0,Math.min(1,audio));this.draw()}},current)).then(()=>true)
   const animate=()=>{if(current()){this.draw();this.raf=this.hooks.requestFrame(animate)}}
   this.raf=this.hooks.requestFrame(animate)
   const result=await Promise.race([prepared,aborted])
   if(this.raf!==undefined)this.hooks.cancelFrame(this.raf);this.raf=undefined
   if(result!=='cancelled'&&current()){
    this.progress=1;this.draw()
    // director initialises the queued screen and requires its first draw before opening.
    if(!await this.wait(1/30,token))return false
    this.setPhase('opening');this.hooks.sound('GUITransitionOpen')
    return await this.wait(23/30,token)
   }
   return false
  }finally{if(current()){if(this.raf!==undefined)this.hooks.cancelFrame(this.raf);this.raf=undefined;this.abort=undefined;this.busy=false;this.hooks.visible(false)}}
 }
}
