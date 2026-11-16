import type {NativeUiNode} from '../NativeUiNode.vue'
import type {Point,GameMode} from './types'
import type {Progress} from './ProgressStore'
import type {PopupFrame} from './PauseOptions'
import {nativeLabelStyle} from './NativeLabelStyle.ts'
export interface LevelSelectArt {
 template:NativeUiNode;images:Record<string,Point>;scale:Point
 states:Record<string,Record<string,Partial<NativeUiNode>>>[]
 popupFrames:{show:PopupFrame[];hide:PopupFrame[]}
}
export function levelSelectView(data:LevelSelectArt,stage:number,mode:GameMode,progress:Progress):NativeUiNode{
 const root=structuredClone(data.template),entry=progress.levels[stage],won=!!entry?.campaign
 const patches=data.states[stage-1][`${mode==='campaign'?1:3}-${won?'won':'new'}`]
 function visit(node:NativeUiNode,path:string){
  const previousWidth=node.size?.x;Object.assign(node,patches[path])
  // KUI's nine-slice anchor follows its resized bounds.
  if(node.id==='title_bg'&&previousWidth&&node.size&&node.anchor)node.anchor.x*=node.size.x/previousWidth
  if(node.id?.startsWith('toggle_level_select_')){
   const toggle=node as NativeUiNode&{true_image_name:string;false_image_name:string}
   const selected=mode==='campaign'?node.id.startsWith('toggle_level_select_campaign'):node.id.startsWith('toggle_level_select_iron')
   node.class='GG5Button';node.default_image_name=selected?toggle.true_image_name:toggle.false_image_name
   if(node.id.startsWith('toggle_level_select_campaign')){node.action='campaign';node.label='战役'}
   else if(node.id.startsWith('toggle_level_select_iron')){node.action='iron';node.label='钢铁挑战'}
  }
  if(node.id==='button_select'){node.action='fight';node.label='战斗'}
  if(node.id==='button_close'){node.action='close';node.label='关闭'}
  if(node.id?.startsWith('image_badge_star_'))node.hidden=Number(node.id.at(-1))>(entry?.campaign??0)
  if(node.id==='image_badge_iron')node.hidden=!entry?.iron
  if(node.class.includes('Label')&&node.font_name?.includes('body')){node.font_family='KingdomChineseRegular,sans-serif';node.font_size=(node.font_size??20)*1.1}
  if(node.class.includes('Label'))node.text_style=nativeLabelStyle(node)
  node.children?.forEach((child,index)=>visit(child,`${path}.${index+1}`))
 }
 visit(root,'0');return root
}
