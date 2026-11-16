import type {Point} from './types'
export interface ComicLabel {text:string;pos:Point;size:Point;fontSize:number;align:string;rotation:number;color:number[]}
export interface ComicSprite {id:string;image:string;size:Point;anchor:Point;labels:ComicLabel[]}
export type ComicPose=[number,number,number,number,number,number]
export interface ComicPage {startFrame:number;endFrame:number;sprites:ComicSprite[];frames:ComicPose[][]}
export interface ComicData {entryDelay?:number;fontScale:number;fps:number;width:number;height:number;pages:ComicPage[]}
/** Original screen_comics: frame animation, stop at each page, click to finish then fade/turn. */
export class ComicPlayer {
 pageIndex=0
 frame=0
 playing=true
 finishing=false
 fading=false
 done=false
 private entryRemaining=0
 private elapsed=0
 private pageFade=0
 private data:ComicData
 onSound:(name:string)=>void=()=>{}
 onDone:()=>void=()=>{}
 constructor(data:ComicData){this.data=data;this.entryRemaining=data.entryDelay??0;this.playing=this.entryRemaining===0}
 get page(){return this.data.pages[this.pageIndex]}
 get alpha(){return this.fading?Math.max(0,1-this.pageFade/.25):1}
 get poses():ComicPose[]{
  const index=Math.min(Math.floor(this.frame),this.page.frames.length-1),next=Math.min(index+1,this.page.frames.length-1),t=this.frame-index
  return this.page.frames[index].map((p,i)=>p.map((v,k)=>v+(this.page.frames[next][i][k]-v)*t) as ComicPose)
 }
 advance(dt:number){
  if(!Number.isFinite(dt)||dt<0)throw new Error('Invalid comic delta')
  if(this.done)return
  if(this.entryRemaining>0){this.entryRemaining=Math.max(0,this.entryRemaining-dt);if(this.entryRemaining<1e-9){this.entryRemaining=0;this.playing=true}return}
  if(this.fading){this.pageFade+=dt;if(this.pageFade+1e-9>=.25){
   if(this.pageIndex+1===this.data.pages.length){this.finishing=true;this.done=true;this.onDone()}
   else {this.pageIndex++;this.frame=0;this.playing=true;this.fading=false;this.pageFade=0}
  }return}
  if(!this.playing)return
  this.elapsed+=dt;this.frame=Math.min(this.page.frames.length-1,this.frame+dt*this.data.fps)
  if(this.frame>=this.page.frames.length-1)this.playing=false
 }
 skip(){
  if(this.elapsed<.5 || this.fading || this.finishing || this.done)return false
  if(this.playing){this.frame=this.page.frames.length-1;this.playing=false}
  else {this.fading=true;this.pageFade=0;this.onSound('GUINotificationPaperOver')}
  return true
 }
}
