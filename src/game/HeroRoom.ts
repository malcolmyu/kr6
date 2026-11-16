import {heroUpgradeData,evaluateHeroGraph,remainingHeroPoints} from './HeroUpgrades.ts'
import type {UiNode,UiPose} from './OutcomeAnimation'
import type {Point} from './types'
export interface RoomNode extends UiNode {slice_rect?:{pos:Point;size:Point};image_offset?:Point;hit_rect?:{pos:Point;size:Point};action?:string;label?:string;disabled?:boolean;children?:RoomNode[]}
interface NodeState {hidden:boolean;image?:string;text?:string;alpha?:number}
export interface HeroRoomArt {purchaseFx:RoomNode;scale:number;slot:RoomNode;heroOrder:string[];template:RoomNode;images:Record<string,Point>;labels:Record<string,Record<string,{title?:string;description?:string}>>;nodeStates:Record<string,Record<string,Record<string,Record<string,NodeState>>>>;timelines:Record<string,Record<string,Record<string,UiPose>[]>>;tooltip:RoomNode;mapButton:RoomNode;mapButtonPath:{pos?:Point;scale?:Point}[];width:number;height:number}
export function roomFind(node:RoomNode,id:string):RoomNode|undefined {if(node.id===id)return node;for(const c of node.children??[]){const result=roomFind(c,id);if(result)return result}}
const visit=(n:RoomNode,fn:(n:RoomNode)=>void)=>{fn(n);n.children?.forEach(c=>visit(c,fn))}
export function heroRoomPoses(data:HeroRoomArt,age:number){
 const frame=Math.max(0,Math.floor(age*30+1e-9)),result:Record<string,UiPose>={}
 for(const [id,seq]of [['timeline_tower_room','upgrades_in'],['timeline_upgrade_points','upgrade_points_in']]){const frames=data.timelines[id][seq];Object.assign(result,frames[Math.min(frame,frames.length-1)])}
 return result
}
export function heroRoomView(data:HeroRoomArt,hero:string,xp:number,selected:string[],focus?:string,purchases:{id:string;at:number}[]=[]):RoomNode{
 const view=structuredClone(data.template),tree=roomFind(view,'group_hero_lvl_tree')!,graph=heroUpgradeData.graphs[hero],nodes=heroUpgradeData.nodes[hero],points=remainingHeroPoints(heroUpgradeData,hero,xp,selected),result=evaluateHeroGraph(graph,selected,points)
 const panel=roomFind(view,'group_tower_upgrades')!,timeline=roomFind(view,'timeline_tower_room')!
 // The native upgrade-page timeline contains the full-screen desktop tree panel.
 const background=roomFind(view,'l11_room_desktop_bg')!
 const title=roomFind(background,'label_item_name');if(title)title.text='英雄'
 timeline.children=[background,panel]
 const hide=new Set(['image_room_bg','timeline_upgrade_points','timeline_room_back_btn','timeline_popup_lvlup_gems','timeline_levelup_gems','group_button_upgrades_lvlup_gems','button_proxy_add_upgrade_points','roster_upgrade_bg_powers_desktop','image_equipped_powers_bg','group_power_lvl_tree','hero_room_tutorial_focus_circle_step_4'])
 visit(view,n=>{if(n.id&&(hide.has(n.id)||n.id.includes('tutorial_focus')))n.hidden=true;if(n.id==='label_upgrade_points_general')n.text=String(points);if(n.id==='button_close_popup'){n.action='close';n.label='关闭英雄技能';}if(n.id==='button_upgrades_reset'){n.action='reset';n.label='重置英雄技能'}})
 const backgroundClose=roomFind(background,'button_close_popup');if(backgroundClose)backgroundClose.action=undefined
 const used=new Set<string>()
 for(const [id,node]of Object.entries(graph)){
  if(id.startsWith('?'))continue
  const button=roomFind(tree,`button_upgrade_${node.coord_x}_${node.coord_y}`);if(!button)continue;used.add(button.id!)
  if(id==='origin'){button.hidden=true;continue}
  let state=selected.includes(id)?'picked':result.enable_buttons[id]?'available':result.unavailable_buttons[id]?'unavailable':result.block_buttons[id]?'swapable':'unreachable'
  if(focus===id&&state!=='unreachable')state+='_selected'
  const snapshot=data.nodeStates[hero][id][state]
  visit(button,n=>{const saved=n.id?snapshot[n.id]:undefined;if(saved){n.hidden=saved.hidden;if(saved.image)n.image_name=saved.image;if(saved.text!==undefined)n.text=String(saved.text);if(saved.alpha!==undefined)n.alpha=saved.alpha}})
  button.hidden=snapshot.button_upgrade_3_5.hidden;button.action=`skill:${id}`;button.label=data.labels[hero][id].title??data.labels[hero][id].description??id;button.hit_rect={pos:{x:-65,y:-65},size:{x:130,y:130}}
 }
 for(const child of tree.children??[]){if(child.class==='GGHexGridNode'&&!used.has(child.id!))child.hidden=true;if(child.id?.startsWith('connection_'))child.hidden=!result.active_links[child.id.slice(11)];if(child.id?.startsWith('mask_')){const [x,y]=child.id.slice(5).split('_').map(Number);child.hidden=Object.values(result.active_links).filter(e=>e.coord_x===x&&Math.abs(e.coord_y-y)===1).length<2}}
 const origin=roomFind(tree,'button_tower_roster')!
 visit(origin,n=>{if(n.id==='image_portrait_small')n.image_name=`hero_portraits_small_${hero}`;if(n.id&&['group_label_new_sign','alert_sign','group_sale_label_small','label_coming_soon','image_towr_locked_padlock','group_check_bg','group_xp_small_portrait','group_xp_info'].includes(n.id))n.hidden=true})
 const team=['hero_gerald','hero_zefira'],slotSize=data.images[data.slot.default_image_name!]
 const slot=(name:string,x:number,y:number,scale:number)=>{
  const n=structuredClone(data.slot);n.pos={x,y};n.scale={x:scale,y:scale};n.action=team.includes(name)?`hero:${name}`:undefined;n.label=name==='hero_gerald'?'杰拉尔德':'泽菲拉'
  visit(n,c=>{if(c.id==='image_tower_icon')c.image_name=`icon_room_${name}`;if(c.id==='frame_selected')c.hidden=name!==hero;if(c.id&&['group_sale_label_small','alert_heroes','group_xp_small_portrait','image_equipped_unit_slot_locked_icon','image_equiped_item_selected_highlight'].includes(c.id))c.hidden=true})
  return n
 }
 const equipped=roomFind(panel,'image_equipped_heroes_bg')!,eqSize=equipped.size!,eqScale=Math.min(eqSize.x/(team.length*slotSize.x),eqSize.y/slotSize.y)
 equipped.children=team.map((name,index)=>slot(name,(eqSize.x-team.length*slotSize.x*eqScale)/2+slotSize.x*eqScale*(index+.5),eqSize.y/2,eqScale))
 const roster=roomFind(panel,'roster_upgrade_bg_heroes_desktop')!,host=roomFind(roster,'group_upgrade_tree_roster')!,back=roster.children![0],others=data.heroOrder.filter(name=>!team.includes(name)),columns=Math.max(1,Math.ceil(others.length/2)),cellW=slotSize.x*1.2,cellH=slotSize.y*1.2,gap=cellW*.04,w=columns*cellW+Math.max(0,columns-1)*gap,h=2*cellH+gap,padX=back.slice_rect!.pos.x*.9,padY=back.slice_rect!.pos.y*.9
 const oldSize=back.size!,oldAnchor=back.anchor!;back.size={x:w+2*padX,y:h+2*padY};back.anchor={x:oldAnchor.x/oldSize.x*back.size.x,y:oldAnchor.y/oldSize.y*back.size.y};host.size={x:w,y:h};host.pos={x:back.pos!.x-back.anchor!.x+padX,y:back.pos!.y-back.anchor!.y+padY};host.children=others.map((name,index)=>slot(name,cellW*.5+(index%columns)*(cellW+gap),cellH*.5+Math.floor(index/columns)*(cellH+gap),1.2))
 for(const purchase of purchases){const node=graph[purchase.id],button=node&&roomFind(tree,`button_upgrade_${node.coord_x}_${node.coord_y}`);if(button){const fx=structuredClone(data.purchaseFx);fx.pos={...button.pos!};visit(fx,n=>{(n as RoomNode&{animation_at?:number}).animation_at=purchase.at});tree.children!.push(fx)}}
 if(focus&&graph[focus]&&data.tooltip){
  const info=data.labels[hero][focus],definition=nodes[focus] as typeof nodes[string]&{tooltip_index?:number},button=roomFind(tree,`button_upgrade_${graph[focus].coord_x}_${graph[focus].coord_y}`)!,tip=structuredClone(data.tooltip),index=definition.tooltip_index??5
  tip.id='tooltip_upgrades';tip.pos={x:tree.pos!.x+((button.pos?.x??0)+(index<=4?(index>=3?-100:100):0))*(tree.scale?.x??1),y:tree.pos!.y+((button.pos?.y??0)+(index<=4?0:-90))*(tree.scale?.y??1)}
  visit(tip,n=>{if(n.id?.startsWith('upgrade_tooltip_arrow_'))n.hidden=n.id!==`upgrade_tooltip_arrow_${index}`;if(n.id==='label_upgrades_room_tooltip_title'){n.text=info.title??'';n.hidden=!info.title}if(n.id==='label_upgrades_room_tooltip_desc'){n.text=info.description??'';n.hidden=!info.title}if(n.id==='label_upgrades_room_tooltip_desc_no_title'){n.text=info.description??'';n.hidden=!!info.title}})
  const arrow=roomFind(tip,`upgrade_tooltip_arrow_${index}`)!;tip.anchor={...arrow.pos!};panel.children!.push(tip)
 }
 return view
}
