import type {Point} from './types'
import type {ExoDefinition} from './ExoSprite'
import type {AtlasFrame} from './SpriteAtlas'
export type UiPose=[number,number,number,number,number,number,boolean]
export interface UiNode {id?:string;class:string;pos?:Point;scale?:Point;anchor?:Point;size?:Point;alpha?:number;background_color?:number[];transition?:string;r?:number;hidden?:boolean;image_name?:string;default_image_name?:string;focus_image_name?:string;font_name?:string;font_family?:string;font_size?:number;text?:string;text_key?:string;text_align?:string;vertical_align?:string;colors?:{text?:number[];tint?:number[];background?:number[]};shaders?:string[];text_style?:Record<string,string>;shader_args?:Record<string,unknown>[];exo_name?:string;exo_animation?:string;children?:UiNode[]}
export interface OutcomeArt {noGems:boolean;template:UiNode;scale:number;width:number;height:number;images:Record<string,Point>;atlas:Record<string,AtlasFrame>;textures:string[];exos:Record<string,ExoDefinition>;timelines:Record<string,Record<string,Record<string,UiPose>[]>>}
export function outcomePoses(data:OutcomeArt,elapsed:number,victory:boolean,iron:boolean):Record<string,UiPose>{
 const result:Record<string,UiPose>={}
 for(const [id,sequences] of Object.entries(data.timelines)){
  let name=victory?'runvictory':'rundefeat',frame=Math.floor(elapsed*30+1e-9)
  if(id==='timeline_vd_modes_badge'){
   if(!iron)continue
   name=victory?'mode_victory_in':'mode_defeat_in'
   if(victory&&elapsed>=41/30){name='mode_victory_loop';frame=Math.floor((elapsed-41/30)*30+1e-9)%15}
  }
  const trace=sequences[name];if(trace)Object.assign(result,trace[Math.min(frame,trace.length-1)])
 }
 return result
}
export function outcomePlan(kind:'victory'|'defeat',stars:number,iron:boolean,noGems=true){
 const victory=kind==='victory'
 const actors:Record<string,{animation:string;idle?:string}>={vd_exo_gems:{animation:noGems?'runnogems':'run'}}
 if(victory)Object.assign(actors,{vd_exo_gerald:{animation:'run',idle:'IDLE'},vd_exo_victory_flag:{animation:iron?'run_modes_star':`run_${stars}_star`},vd_exo_victory_panel:{animation:'run'},vd_exo_stars:{animation:iron?'centerstar':`${stars}star`}})
 else Object.assign(actors,{vd_exo_veznan:{animation:'run',idle:'Idle'},vd_exo_defeat_panel:{animation:'run'}})
 const sounds=victory?Array.from({length:iron?1:stars},(_,i)=>({name:`GUIWinStars${i+1}`,delay:2.66+.4*(i+1)})):[]
 return {actors,sounds,initialSound:victory?'GUIStageVictory':'GUIStageDefeat'}
}
