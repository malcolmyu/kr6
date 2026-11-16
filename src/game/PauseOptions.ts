import type {NativeUiNode} from '../NativeUiNode.vue'
import type {Point} from './types'
import type {AudioVolumes} from './AudioSettings'
import {slotFind} from './SlotMenu.ts'
export interface PopupFrame {y:number;alpha:number;background:number;disabled:boolean;hidden:boolean}
export interface PauseArt {template:NativeUiNode;confirmation:NativeUiNode;images:Record<string,Point>;scale:Point;labels:Record<string,string>;popupFrames:{show:PopupFrame[];hide:PopupFrame[]}}
export function pauseView(data:PauseArt,volumes:AudioVolumes){
 const root=structuredClone(data.template)
 for(const [id,action,label]of [['button_close_popup','resume','继续'],['button_restart','restart','重新开始'],['button_quit','quit','退出关卡']]){const node=slotFind(root,id)!;node.action=action;node.label=label}
 for(const [kind,key]of [['music','volume_music'],['sfx','volume_fx']] as const){
  const toggle=slotFind(root,'toggle_ingame_'+kind)! as NativeUiNode&{true_image_name:string;false_image_name:string};toggle.class='GG5Button';toggle.default_image_name=volumes[key]!==0?toggle.true_image_name:toggle.false_image_name;toggle.action='toggle:'+key;toggle.label=kind==='music'?'音乐':'音效'
  const slider=slotFind(root,key)!;slider.control={value:volumes[key],muted:volumes[key]===0};slider.label=kind==='music'?'音乐音量':'音效音量'
 }
 return root
}
export function confirmationView(data:PauseArt,kind:'restart'|'quit'){
 const root=structuredClone(data.confirmation);slotFind(root,'label_desc')!.text=data.labels[kind==='restart'?'CONFIRM_RESTART':'CONFIRM_EXIT'];slotFind(root,'label_button_yes')!.text=data.labels.BUTTON_YES;slotFind(root,'label_button_no')!.text=data.labels.BUTTON_NO
 for(const [id,action,label]of [['button_popup_yes','yes','是'],['button_popup_no','no','否']]){const node=slotFind(root,id)!;node.action=action;node.label=label}
 return root
}
