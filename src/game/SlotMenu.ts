import type {NativeUiNode} from '../NativeUiNode.vue'
import type {Point} from './types'
import type {Progress} from './ProgressStore'
import type {UiPose} from './OutcomeAnimation'
import {progressStars} from './NativeProgression.ts'
export interface SlotEntry {index:number;progress?:Progress}
export interface SlotPanelFrame {y:number;hidden:boolean;disabled:boolean}
export interface SlotMenuArt {panel:NativeUiNode&{pos_hidden:Point;pos_shown:Point};start:NativeUiNode;images:Record<string,Point>;labels:{name:string;choose:string};panelFrames:{in:SlotPanelFrame[];out:SlotPanelFrame[]};startFrames:Record<string,UiPose>[];menuFrames:{dx:number;dy:number;startAge?:number}[]}
export function slotFind(n:NativeUiNode,id:string):NativeUiNode|undefined {if(n.id===id)return n;for(const c of n.children??[]){const result=slotFind(c,id);if(result)return result}}
export function slotMenuView(data:SlotMenuArt,entries:SlotEntry[],deleting?:number):NativeUiNode{
 const root=structuredClone(data.panel),close=slotFind(root,'button_close_popup')!;close.action='close';close.label='关闭存档列表'
 for(const entry of entries){const row=slotFind(root,`slot_${entry.index}`)!;const used=slotFind(row,'slot_used')!,empty=slotFind(row,'slot_empty')!,confirm=slotFind(row,'slot_delete')!
  used.hidden=!entry.progress||deleting===entry.index;empty.hidden=!!entry.progress;confirm.hidden=deleting!==entry.index
  for(const node of [used,empty]){node.action=`select:${entry.index}`;node.label=`选择存档 ${entry.index}`}
  const name=slotFind(row,'label_slot_name')!;name.text=`${data.labels.name} ${entry.index}`
  if(entry.progress)slotFind(row,'label_stars')!.text=String(progressStars(entry.progress))
  for(const [id,action,label]of [['slot_delete_request','request','删除存档'],['slot_delete_confirm','confirm','确认删除存档'],['slot_delete_cancel','cancel','取消删除存档']]){const node=slotFind(row,id)!;node.action=`${action}:${entry.index}`;node.label=`${label} ${entry.index}`}
 }
 return root
}
