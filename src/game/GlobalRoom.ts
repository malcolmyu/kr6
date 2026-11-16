import type {HeroRoomArt,RoomNode} from './HeroRoom'
import {roomFind} from './HeroRoom.ts'
import type {Progress} from './ProgressStore'
import {globalUpgradeData,globalUpgradePoints,globalUpgradeSpent} from './GlobalUpgrades.ts'
import type {GlobalUpgradeKind} from './GlobalUpgrades'
import {evaluateHeroGraph} from './HeroUpgrades.ts'
import {nativeLabelStyle} from './NativeLabelStyle.ts'
import type {UiPose} from './OutcomeAnimation'
export interface GlobalRoomArt extends HeroRoomArt {order:GlobalUpgradeKind[];backdrop:RoomNode;stateRootId:string}
export interface GlobalRoomFocus {kind:GlobalUpgradeKind;id:string}
export interface GlobalRoomPurchase extends GlobalRoomFocus {at:number}
const visit=(n:RoomNode,fn:(n:RoomNode)=>void)=>{fn(n);n.children?.forEach(c=>visit(c,fn))}
export function globalRoomPoses(data:GlobalRoomArt,age:number,closing=false){
 const frames=data.timelines.timeline_upgrades_room_desktop[closing?'anim_out':'anim_in']
 return frames[Math.min(Math.max(0,Math.floor(age*30+1e-9)),frames.length-1)] as Record<string,UiPose>
}
export function globalRoomView(data:GlobalRoomArt,progress:Progress,focus?:GlobalRoomFocus,purchases:GlobalRoomPurchase[]=[],age=1):RoomNode{
 const view=structuredClone(data.template),panel=roomFind(view,'timeline_upgrades_room_desktop')!,points=globalUpgradePoints(progress)-globalUpgradeSpent(progress.globalUpgrades??{}),poses=globalRoomPoses(data,age)
 visit(view,n=>{if(n.id&&['image_room_bg','timeline_room_back_btn','group_tw_upgrade_trees','timeline_upgrade_points'].includes(n.id))n.hidden=true;if(n.id==='button_close_popup'){n.action='close';n.label='关闭全局升级'}if(n.id==='button_upgrades_reset'){n.action='reset';n.label='重置全部塔升级'}if(n.id==='label_upgrades')n.text=String(points)})
 for(const [index,kind]of data.order.entries()){
  const tree=roomFind(panel,`group_power_lvl_tree_${index+1}`)!,graph=globalUpgradeData.graphs[kind],own=progress.globalUpgrades?.[kind]??[],result=evaluateHeroGraph(graph,own,points),used=new Set<string>()
  for(const [id,node]of Object.entries(graph)){
   if(id.startsWith('?')||id==='origin')continue
   const button=roomFind(tree,`button_upgrade_${node.coord_x}_${node.coord_y}`);if(!button)continue;used.add(button.id!)
   let state=own.includes(id)?'picked':result.enable_buttons[id]?'available':result.unavailable_buttons[id]?'unavailable':result.block_buttons[id]?'swapable':'unreachable'
   if(focus?.kind===kind&&focus.id===id&&state!=='unreachable')state+='_selected'
   const snap=data.nodeStates[kind][id][state]
   visit(button,n=>{const saved=n.id?snap[n.id]:undefined;if(saved){n.hidden=saved.hidden;if(saved.image)n.image_name=saved.image;if(saved.text!==undefined)n.text=String(saved.text);if(saved.alpha!==undefined)n.alpha=saved.alpha}})
   button.hidden=snap[data.stateRootId].hidden;button.action=`skill:${kind}:${id}`;button.label=data.labels[kind][id].title??id;button.hit_rect={pos:{x:-65,y:-65},size:{x:130,y:130}}
  }
  for(const child of tree.children??[]){if(child.class==='GGHexGridNode'&&!used.has(child.id!))child.hidden=true;if(child.id?.startsWith('connection_'))child.hidden=!result.active_links[child.id.slice(11)]}
  roomFind(tree,'image_tower_type_icon')!.image_name=(globalUpgradeData.nodes[kind].origin as {img:string}).img
  for(const p of purchases.filter(p=>p.kind===kind)){const node=graph[p.id],button=node&&roomFind(tree,`button_upgrade_${node.coord_x}_${node.coord_y}`);if(button){const fx=structuredClone(data.purchaseFx);fx.pos={...button.pos!};visit(fx,n=>{(n as RoomNode&{animation_at?:number}).animation_at=p.at});tree.children!.push(fx)}}
  if(focus?.kind===kind&&graph[focus.id]){
   const id=focus.id,node=graph[id],button=roomFind(tree,`button_upgrade_${node.coord_x}_${node.coord_y}`)!,info=data.labels[kind][id],definition=globalUpgradeData.nodes[kind][id] as {tooltip_index?:number},arrowIndex=definition.tooltip_index??5,tip=structuredClone(data.tooltip),pose=poses[tree.id!],sx=pose?.[2]??tree.scale?.x??1,sy=pose?.[3]??tree.scale?.y??1
   tip.id='tooltip_upgrades';tip.pos={x:(pose?.[0]??tree.pos!.x)+((button.pos?.x??0)+(arrowIndex<=4?(arrowIndex>=3?-100:100):0))*sx,y:(pose?.[1]??tree.pos!.y)+((button.pos?.y??0)+(arrowIndex<=4?0:-90))*sy}
   visit(tip,n=>{if(n.id?.startsWith('upgrade_tooltip_arrow_'))n.hidden=n.id!==`upgrade_tooltip_arrow_${arrowIndex}`;if(n.id==='label_upgrades_room_tooltip_title'){n.text=info.title??'';n.hidden=!info.title}if(n.id==='label_upgrades_room_tooltip_desc'){n.text=info.description??'';n.hidden=!info.title}if(n.id==='label_upgrades_room_tooltip_desc_no_title'){n.text=info.description??'';n.hidden=!!info.title}})
   tip.anchor={...roomFind(tip,`upgrade_tooltip_arrow_${arrowIndex}`)!.pos!};panel.children!.push(tip)
  }
 }
 visit(view,n=>{if(n.class.includes('Label'))n.text_style=nativeLabelStyle(n)})
 return view
}
