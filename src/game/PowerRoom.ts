import {roomFind} from './HeroRoom.ts'
import type {HeroRoomArt,RoomNode} from './HeroRoom'
import type {HeroUpgradeData} from './HeroUpgrades'
import {evaluateHeroGraph} from './HeroUpgrades.ts'
import type {Progress} from './ProgressStore'
import {playerLevel} from './ProgressStore.ts'
import {powerLevel,powerXpFraction} from './PowerProgression.ts'
import {equippedPowers,powerUnlocked,powerRequiredStars} from './NativeProgression.ts'
import {nativeLabelStyle} from './NativeLabelStyle.ts'
import type {PowerKind} from './PowerSystem'
import type {UiPose} from './OutcomeAnimation'
export interface PowerRoomArt extends HeroRoomArt {
 order:string[];roster:RoomNode;backdrop:RoomNode;stateRootId:string;graphs:HeroUpgradeData['graphs'];nodes:HeroUpgradeData['nodes'];previewSlots:Record<string,number>;xpExpected:number[];showXpOffset:number
 units:Record<string,{name:string;description:string;typeDescription:string;stats:{stat_type:string;stat_damage?:number;stat_hp?:number;stat_range?:number;stat_cooldown?:number};taunt?:string}>
 text:Record<string,string>
}
const visit=(n:RoomNode,fn:(n:RoomNode)=>void)=>{fn(n);n.children?.forEach(c=>visit(c,fn))}
export function powerRoomStats(data:PowerRoomArt,progress:Progress,kind:string){
 const xp=progress.powerXp?.[kind as PowerKind]??0,selected=progress.powerUpgrades?.[kind as PowerKind]??[],source=`power_${kind}`,level=powerLevel(xp)
 return {...data.units[kind],xp,level,fraction:powerXpFraction(xp),selected,points:level-1-selected.reduce((sum,id)=>sum+(data.nodes[source]?.[id]?.cost??0),0),unlocked:powerUnlocked(progress,kind),extraXp:level<=(data.xpExpected[playerLevel(progress)-1]??0)-data.showXpOffset}
}
export interface PowerRoomPickMotion {at:number;active:boolean;angles:number[]}
export interface RoomFrame {width:number;height:number}
function fittedOverlay(data:PowerRoomArt,frame:RoomFrame){const parent=roomFind(data.template,'timeline_tower_room')!,x=Math.round(-(frame.width/2+40)/data.scale-(parent.pos?.x??0)),y=Math.round(-(frame.height/2+40)/data.scale-(parent.pos?.y??0)),right=Math.round((Math.round(frame.width)+40-frame.width/2)/data.scale-(parent.pos?.x??0)),bottom=Math.round((Math.round(frame.height)+40-frame.height/2)/data.scale-(parent.pos?.y??0));return {pos:{x,y},size:{x:right-x,y:bottom-y}}}
export function powerRoomBackdrop(data:Pick<PowerRoomArt,'backdrop'|'width'|'height'>,frame:RoomFrame={width:data.width,height:data.height}){
 const view=structuredClone(data.backdrop),overlay=roomFind(view,'overlay')!,vignette=roomFind(view,'vignette')!;view.hidden=false;view.pos={x:frame.width/2,y:frame.height/2};overlay.pos={x:-frame.width/2,y:-frame.height/2};overlay.size={x:frame.width,y:frame.height};overlay.background_color=overlay.colors?.background;vignette.pos={x:-frame.width*.51,y:-frame.height*.51};vignette.scale={x:frame.width*1.04/vignette.size!.x,y:frame.height*1.04/vignette.size!.y};return view
}
export function powerRoomPoses(data:PowerRoomArt,age:number,page:'main'|'tree',pick?:PowerRoomPickMotion,sequence?:'anim_in'|'upgrades_in'|'upgrades_out',screen:RoomFrame={width:data.width,height:data.height}){
 const frame=Math.max(0,Math.floor(age*30+1e-9)),frames=data.timelines.timeline_tower_room[sequence??(page==='tree'?'upgrades_in':'anim_in')]
 const result={...frames[Math.min(frame,frames.length-1)]} as Record<string,UiPose>
 const fit=fittedOverlay(data,screen),old=result.towerhero_room_roster_sel_overlay;if(old)result.towerhero_room_roster_sel_overlay=[fit.pos.x,fit.pos.y,1,1,old[4],0,old[6]]
 if(pick){const id='towerhero_room_roster_sel_overlay',original=result[id],elapsed=Math.max(0,age-pick.at),alpha=pick.active?Math.min(1,elapsed/.08):Math.max(0,1-elapsed/.08);if(original)result[id]=[...original.slice(0,4),alpha,original[5],!pick.active&&elapsed>=.08] as UiPose
  if(pick.active)for(let index=1;index<=3;index++){const button=roomFind(data.template,`button_selected_power_0${index}`)!;result[button.id!]=[button.pos!.x,button.pos!.y,button.scale?.x??1,button.scale?.y??1,1,.015*Math.cos(2*Math.PI*age*4+pick.angles[index-1]),false]}
 }
 return result
}
export function powerRoomView(data:PowerRoomArt,progress:Progress,kind:string,page:'main'|'tree',focus?:string,picking=false,purchases:{id:string;at:number}[]=[],pickOverlay=false,screen:RoomFrame={width:data.width,height:data.height}):RoomNode{
 const view=structuredClone(data.template),stats=powerRoomStats(data,progress,kind),source=`power_${kind}`,equipped=equippedPowers(progress),panel=roomFind(view,'group_tower_upgrades')!,tree=roomFind(panel,'group_power_lvl_tree')!,graph=data.graphs[source],result=evaluateHeroGraph(graph,stats.selected,stats.points)
 const hidden=new Set(['image_room_bg','timeline_upgrade_points','timeline_room_back_btn','timeline_popup_lvlup_gems','timeline_levelup_gems','group_button_upgrades_lvlup_gems','button_proxy_add_upgrade_points','group_popup_lvlup_gems','group_bgdark','group_hero_roster','group_tower_roster','group_hero_selected','group_tower_ring','group_name_towers','label_txt_selected_heroes','label_txt_selected_towers','group_tower_stats','group_tower_skills','group_tower_type','group_hero_stats','group_hero_skills','label_description','label_description_hero','group_hero_lvl_tree','roster_upgrade_bg_heroes_desktop','image_equipped_heroes_bg'])
 visit(view,n=>{
  if(n.id&&(hidden.has(n.id)||n.id.includes('tutorial_focus')))n.hidden=true
  if(n.class.includes('Label'))n.text_style=nativeLabelStyle(n)
  if(n.id==='label_item_name')n.text=data.text.MAP_BUTTON_POWERS
  if(n.id==='label_txt_selected_power')n.text=data.text.POWER_ROOM_EQUIPPED_POWERS
  if(n.id==='label_upgrade_points_general')n.text=String(stats.points)
  if(n.id==='label_name')n.text=stats.name.toUpperCase()
  if(n.id==='label_lvl_number')n.text=String(stats.level)
  if(n.id==='image_xp_bar')n.scale={x:stats.fraction,y:1}
  if(n.id==='group_xp_boost')n.hidden=!stats.extraXp
  if(n.id==='image_portrait_big')n.image_name=`power_portraits_big_${kind}`
  if(n.id==='label_power_description')n.text=stats.description
  if(n.id==='label_power_type_desc')n.text=stats.typeDescription
  if(n.id?.startsWith('image_power_type_icon_'))n.hidden=n.id!==`image_power_type_icon_${stats.stats.stat_type==='damage'?1:stats.stats.stat_type==='utility'?2:3}`
  if(n.id==='button_close_popup'){n.action='back';n.label=page==='tree'?'返回法术详情':'关闭法术房间'}
  if(n.id==='button_upgrades_reset'){n.action='reset';n.label='重置法术升级';n.disabled=!stats.unlocked}
 })
 panel.hidden=page!=='tree'
 const action=(id:string,name:string,label:string)=>{const n=roomFind(view,id);if(n){n.action=name;n.label=label}return n}
 const upgrade=action('button_upgrade','upgrades','升级法术'),plain=action('button_upgrade_static','upgrades','查看法术升级')
 if(upgrade)upgrade.hidden=!(stats.points>0&&stats.unlocked);if(plain)plain.hidden=stats.points>0&&stats.unlocked
 const glow=roomFind(view,'animation_upgrade_select_fx');if(glow)glow.hidden=!(stats.points>0&&stats.unlocked)
 const select=action('button_select','equip','装备法术')!,selected=roomFind(view,'button_selected')!,locked=roomFind(view,'button_locked')!,buy=roomFind(view,'button_buy')!
 select.hidden=!stats.unlocked||equipped.includes(kind as PowerKind);selected.hidden=!equipped.includes(kind as PowerKind);locked.hidden=stats.unlocked;locked.disabled=true;buy.hidden=true
 const lockText=roomFind(locked,'label_button_locked');if(lockText)lockText.text=data.text.PLAYER_PROGRESSION_UNLOCK_STAR_NUMBER.replace('%s',String(powerRequiredStars(kind))).replace('%i',String(powerRequiredStars(kind))).replace('%d',String(powerRequiredStars(kind)))
 const groupStats=roomFind(view,'group_power_stats')!,values=[stats.stats.stat_damage!==undefined?['attack',stats.stats.stat_damage]:undefined,stats.stats.stat_hp!==undefined?['health',stats.stats.stat_hp]:undefined,stats.stats.stat_range!==undefined?['range',stats.stats.stat_range]:undefined,stats.stats.stat_cooldown!==undefined?['respawn',stats.stats.stat_cooldown]:undefined].filter(Boolean) as [string,number][]
 for(let index=0;index<2;index++){const group=roomFind(groupStats,`group_power_stats_0${index+1}`)!;group.hidden=!values[index];if(values[index]){roomFind(group,'image_tower_stats_icon')!.image_name=`room_stat_icon_${values[index][0]}`;roomFind(group,'image_towr_stats_bar')!.scale={x:values[index][1]/10,y:1};roomFind(group,'image_towr_stats_bar')!.transition='transform .2s linear'}}
 const slot=(name:string|undefined,shown:boolean,lockedSlot=false)=>{
  const n=structuredClone(data.slot),s=name?powerRoomStats(data,progress,name):undefined
  visit(n,c=>{if(c.id==='image_tower_icon'){c.image_name=name?`icon_room_power_${name}`:undefined;c.hidden=!name}if(c.id==='frame_selected')c.hidden=!shown;if(c.id==='alert_heroes')c.hidden=!s||!s.unlocked||s.points<=0;if(c.id==='group_xp_small_portrait')c.hidden=!s?.extraXp;if(c.id==='image_equipped_unit_slot_locked_icon')c.hidden=!lockedSlot;if(c.id&&['group_sale_label_small','image_equiped_item_selected_highlight'].includes(c.id))c.hidden=true})
  n.action=name?`power:${name}`:undefined;n.label=name?data.units[name].name:undefined
  return n
 }
 const selectedGroup=roomFind(view,'group_power_selected')!
 for(let index=1;index<=3;index++){const old=roomFind(selectedGroup,`button_selected_power_0${index}`)!,name=equipped[index-1],n=slot(name,name===kind,!name&&!picking);Object.assign(old,{children:n.children,action:picking?`slot:${index}`:n.action,label:picking?`装备到法术槽位 ${index}`:n.label})}
 const overlay=roomFind(view,'towerhero_room_roster_sel_overlay');if(overlay){Object.assign(overlay,fittedOverlay(data,screen),{scale:{x:1,y:1},anchor:{x:0,y:0}});overlay.hidden=!picking&&!pickOverlay;overlay.background_color=[0,0,0,150];overlay.action=picking?'cancel-equip':undefined;overlay.label='取消装备法术'}
 const roster=roomFind(roomFind(view,'group_power_roster')!,'tower_room_towers')!,rosterSize=data.images[data.roster.default_image_name!]
 roster.children=data.order.map((name,index)=>{const n=structuredClone(data.roster),s=powerRoomStats(data,progress,name);n.pos={x:roster.size!.x*((index%8)+.5)/8,y:rosterSize.y*(.5+Math.floor(index/8))+10};n.action=`power:${name}`;n.label=data.units[name].name;visit(n,c=>{if(c.id==='image_portrait_small')c.image_name=`power_portraits_small_${name}`;if(c.id==='image_portrait_small_selected_highlight')c.hidden=name!==kind;if(c.id==='label_portrait_small_lvl_number')c.text=String(s.level);if(c.id==='image_portrait_small_xp_bar')c.scale={x:s.fraction,y:1};if(c.id==='image_towr_locked_padlock')c.hidden=s.unlocked;if((c.id==='image_portrait_small_bg'||c.id==='image_portrait_small')&&!s.unlocked)c.colors={...c.colors,tint:[102,102,102,255]};if(c.id==='group_check_bg')c.hidden=!equipped.includes(name as PowerKind);if(c.id==='alert_sign')c.hidden=!s.unlocked||s.points<=0;if(c.id&&['group_sale_label_small','group_label_new_sign','group_xp_small_portrait','label_coming_soon'].includes(c.id))c.hidden=true});return n})
 const skills=roomFind(view,'group_power_skills')!,previewMap=new Map<number,string>()
 for(const id of stats.selected){let index=data.previewSlots[id];if(!index)continue;if(previewMap.has(index)&&index<5)index++;previewMap.set(index,id)}
 for(let index=1;index<=5;index++){const empty=roomFind(groupStats,`button_upgrade_slot_0${index}`),button=roomFind(skills,`button_upgrade_equipped_slot_0${index}`),id=previewMap.get(index);if(empty)empty.hidden=!!id;if(button){button.hidden=!id;if(id){roomFind(button,'image_equipped_icon')!.image_name=data.nodes[source][id].img;button.action=`preview:${id}`;button.label=data.labels[source][id].title??id}}}
 const previewTip=roomFind(skills,'group_tooltip');if(previewTip){previewTip.hidden=page!=='main'||!focus||!stats.selected.includes(focus);if(!previewTip.hidden){const info=data.labels[source][focus!],index=[...previewMap].find(([,id])=>id===focus)?.[0];visit(previewTip,n=>{if(n.id==='label_tooltip_title')n.text=info.title??'';if(n.id==='label_tooltip_description')n.text=info.description??'';if(n.id?.startsWith('image_tooltip_arrow_top_'))n.hidden=n.id!==`image_tooltip_arrow_top_0${index}`})}}
 const used=new Set<string>()
 for(const [id,node]of Object.entries(graph)){if(id.startsWith('?'))continue;const button=roomFind(tree,`button_upgrade_${node.coord_x}_${node.coord_y}`);if(!button)continue;used.add(button.id!);if(id==='origin'){button.hidden=true;continue}
  let state=stats.unlocked&&stats.selected.includes(id)?'picked':stats.unlocked&&result.enable_buttons[id]?'available':result.unavailable_buttons[id]?'unavailable':result.block_buttons[id]?'swapable':'unreachable';if(focus===id&&state!=='unreachable')state+='_selected'
  const snapshot=data.nodeStates[source][id][state];visit(button,n=>{const saved=n.id?snapshot[n.id]:undefined;if(saved){n.hidden=saved.hidden;if(saved.image)n.image_name=saved.image;if(saved.text!==undefined)n.text=String(saved.text);if(saved.alpha!==undefined)n.alpha=saved.alpha}});button.hidden=snapshot[data.stateRootId].hidden;button.action=`skill:${id}`;button.label=data.labels[source][id].title??id;button.hit_rect={pos:{x:-65,y:-65},size:{x:130,y:130}}
 }
 for(const child of tree.children??[]){if(child.class==='GGHexGridNode'&&!used.has(child.id!))child.hidden=true;if(child.id?.startsWith('connection_'))child.hidden=!result.active_links[child.id.slice(11)];if(child.id?.startsWith('mask_')){const [x,y]=child.id.slice(5).split('_').map(Number);child.hidden=Object.values(result.active_links).filter(e=>e.coord_x===x&&Math.abs(e.coord_y-y)===1).length<2}}
 const origin=roomFind(tree,'button_tower_roster')!;visit(origin,n=>{if(n.id==='image_portrait_small')n.image_name=`power_portraits_small_${kind}`;if(n.id==='label_portrait_small_lvl_number')n.text=String(stats.level);if(n.id==='image_portrait_small_xp_bar')n.scale={x:stats.fraction,y:1};if(n.id&&['group_label_new_sign','alert_sign','group_sale_label_small','label_coming_soon','group_check_bg','group_xp_small_portrait'].includes(n.id))n.hidden=true;if(n.id==='image_towr_locked_padlock')n.hidden=stats.unlocked})
 const size=data.images[data.slot.default_image_name!],eq=roomFind(panel,'image_equipped_powers_bg')!,eqScale=Math.min(eq.size!.x/(3*size.x),eq.size!.y/size.y)
 eq.children=Array.from({length:3},(_,i)=>{const n=slot(equipped[i],equipped[i]===kind);n.pos={x:(eq.size!.x-3*size.x*eqScale)/2+size.x*eqScale*(i+.5),y:eq.size!.y/2};n.scale={x:eqScale,y:eqScale};return n})
 const rest=data.order.filter(name=>!equipped.includes(name as PowerKind)),r=roomFind(panel,'roster_upgrade_bg_powers_desktop')!,host=roomFind(r,'group_upgrade_tree_roster')!,back=r.children![0],columns=Math.max(1,Math.ceil(rest.length/2)),gw=size.x*1.2,gh=size.y*1.2,gap=.04*gw,w=columns*gw+(columns-1)*gap,h=2*gh+gap,padX=back.slice_rect!.pos.x*.9,padY=back.slice_rect!.pos.y*.9,old=back.size!
 back.anchor={x:back.anchor!.x/old.x*(w+2*padX),y:back.anchor!.y/old.y*(h+2*padY)};back.size={x:w+2*padX,y:h+2*padY};host.pos={x:back.pos!.x-back.anchor.x+padX,y:back.pos!.y-back.anchor.y+padY};host.size={x:w,y:h};host.children=rest.map((name,index)=>{const n=slot(name,name===kind,!powerUnlocked(progress,name));n.pos={x:gw*.5+(index%columns)*(gw+gap),y:gh*.5+Math.floor(index/columns)*(gh+gap)};n.scale={x:1.2,y:1.2};return n})
 const parentCenter=panel.children?.find(n=>n.image_name==='room_tower_image_upgrades_bg_desktpo_')?.pos?.x??0,rosterWidth=back.size.x*r.scale!.x,pairGap=back.slice_rect!.pos.x*r.scale!.x,pairX=parentCenter-(eq.size!.x+pairGap+rosterWidth)/2
 eq.pos!.x=pairX+eq.size!.x/2;r.pos={x:pairX+eq.size!.x+pairGap+rosterWidth/2-(back.pos!.x-back.anchor.x+back.size.x/2)*r.scale!.x,y:eq.pos!.y-(back.pos!.y-back.anchor.y+back.size.y/2)*r.scale!.y}
 for(const p of purchases){const node=graph[p.id],button=node&&roomFind(tree,`button_upgrade_${node.coord_x}_${node.coord_y}`);if(button){const fx=structuredClone(data.purchaseFx);fx.pos={...button.pos!};visit(fx,n=>{(n as RoomNode&{animation_at?:number}).animation_at=p.at});tree.children!.push(fx)}}
 if(page==='tree'&&focus&&graph[focus]){const node=graph[focus],definition=data.nodes[source][focus] as {tooltip_index?:number},index=definition.tooltip_index??5,button=roomFind(tree,`button_upgrade_${node.coord_x}_${node.coord_y}`)!,tip=structuredClone(data.tooltip),info=data.labels[source][focus];tip.id='tooltip_upgrades';tip.pos={x:tree.pos!.x+((button.pos?.x??0)+(index<=4?(index>=3?-100:100):0))*tree.scale!.x,y:tree.pos!.y+((button.pos?.y??0)+(index<=4?0:-90))*tree.scale!.y};visit(tip,n=>{if(n.id?.startsWith('upgrade_tooltip_arrow_'))n.hidden=n.id!==`upgrade_tooltip_arrow_${index}`;if(n.id==='label_upgrades_room_tooltip_title'){n.text=info.title??'';n.hidden=!info.title}if(n.id==='label_upgrades_room_tooltip_desc'){n.text=info.description??'';n.hidden=!info.title}if(n.id==='label_upgrades_room_tooltip_desc_no_title'){n.text=info.description??'';n.hidden=!!info.title}});tip.anchor={...roomFind(tip,`upgrade_tooltip_arrow_${index}`)!.pos!};panel.children!.push(tip)}
 if(page==='tree'){const strip=(n:RoomNode)=>{if(n===panel)return;n.action=undefined;n.children?.forEach(strip)};strip(view)}
 visit(view,n=>{if(n.class.includes('Label'))n.text_style=nativeLabelStyle(n)})
 return view
}
