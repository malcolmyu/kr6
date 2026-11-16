<script setup lang="ts">
import {computed,ref,watch} from 'vue'
import type {GameSession} from './game/GameSession'
import {implementedTowerPowers} from './game/TowerSystem'
import type {TowerSite,TowerKind} from './game/TowerSystem'
import type {Point} from './game/types'
interface NativeItem {action:string;action_arg?:string;image:string;check:string;place?:number;type?:TowerKind|'slot_locked';tt_title?:string;tt_desc?:string;tt_list?:{tt_title:string;tt_desc:string}[];sounds?:string[]}
export interface TowerMenuData {powerPositions:Point[];positions:Point[];menus:{holder:NativeItem[];[key:string]:NativeItem[]|NativeItem[][]};sizes:Record<string,number[]>}
const props=defineProps<{site:TowerSite;session:GameSession;data:TowerMenuData;center:Point;scale:number;gold:number;time:number}>()
const emit=defineEmits<{build:[kind:TowerKind];upgrade:[];sell:[];rally:[];cancel:[];power:[key:string,sounds:string[]]}>()
const armed=ref(''),purchased=ref(''),purchaseAt=ref(-Infinity)
watch(()=>props.site.id,()=>{armed.value='';purchased.value=''})
watch(armed,value=>{props.site.powerPreview=value==='power:skill_b'?'skill_b':undefined})
const labels:Record<TowerKind,string>={archers:'弓箭塔',knights:'兵营',wizard:'法师塔',catapult:'投石塔',culverine:'矮人炮塔'}
interface MenuEntry extends NativeItem {key:string;place:number;price?:number;label:string;disabled:boolean;rank?:number;max?:number}
const items=computed<MenuEntry[]>(()=>{
  void props.gold;void props.time
  if(!props.site.tower)return Array.from({length:5},(_,index)=>{
    const build=props.session.towers.available[index],item=props.data.menus.holder.find(i=>i.action_arg===build)
    if(!item)return {action:'tw_locked',type:'slot_locked',image:'quickmenu_main_icon_locked',check:'quickmenu_main_icon_locked',key:`locked-${index}`,place:index+1,label:'未装备防御塔',disabled:true}
    const kind=item.type as TowerKind,price=props.session.towers.price(kind)
    return {...item,key:kind,place:index+1,price,label:`${labels[kind]} · ${price}`,disabled:props.gold<price || !!props.session.tutorial&&!props.session.tutorial.canBuild(props.site,kind)}
  })
  if(props.site.canBeModified===false)return []
  const [,kind,level]=props.site.tower.match(/^tower_(.+)_lvl(\d+)$/)??[]
  const native=(props.data.menus[kind] as NativeItem[][])?.[Number(level)-1]??[]
  return native.filter(item=>item.action==='tw_rally'||item.action==='tw_sell'||item.action==='tw_upgrade'&&props.session.towers.nextUpgrade(props.site)||item.action==='upgrade_power'&&implementedTowerPowers[kind]?.includes(item.action_arg!)).map(item=>{
    if(item.action==='upgrade_power'){
      const rank=props.site.powerLevels?.[item.action_arg!]??0,next=props.session.towers.nextPower(props.site,item.action_arg!),tt=item.tt_list![Math.min(rank,item.tt_list!.length-1)]
      return {...item,...tt,key:'power:'+item.action_arg,place:item.place!,price:next?.price,rank,max:item.tt_list!.length,label:tt.tt_title+(next?` · ${next.price}`:' · 已满级'),disabled:!!next&&props.gold<next.price}
    }
    const price=item.action==='tw_rally'?undefined:item.action==='tw_sell'?props.session.towers.refund(props.site,props.session.waves.wave):props.session.towers.nextUpgrade(props.site)!.price
    return {...item,key:item.action,place:item.place!,price,label:item.action==='tw_rally'?'设置集结点':`${item.action==='tw_sell'?'出售':'升级'} · ${price}`,disabled:item.action==='tw_upgrade'&&props.gold<price!}
  })
})
const tooltip=computed(()=>items.value.find(i=>i.key===armed.value))
function activate(item:typeof items.value[number]) {
  if(item.action==='tw_rally'){emit('rally');return}
  if(armed.value!==item.key){armed.value=item.key;props.session.onSound('GUIQuickMenuOver');return}
  if(item.action==='upgrade_power'){if(item.rank===item.max)return;purchased.value=item.key;purchaseAt.value=props.time;emit('power',item.action_arg!,item.sounds??[]);armed.value='';return}
  if(!props.site.tower)emit('build',item.type as TowerKind)
  else if(item.action==='tw_sell')emit('sell')
  else emit('upgrade')
}
function style(item:typeof items.value[number]) {
  const point=props.data.positions[item.place-1],image=armed.value===item.key?item.check:item.disabled&&props.data.sizes[item.image+'_disabled']?item.image+'_disabled':item.image,size=props.data.sizes[image]??[120,120]
  return {left:`${point.x}px`,top:`${point.y}px`,width:`${size[0]/2}px`,height:`${size[1]/2}px`}
}
function rankStyle(index:number,name:string){const p=props.data.powerPositions[index],s=props.data.sizes[name];return {left:(p.x-s[0]/4)+'px',top:(p.y-s[1]/4)+'px',width:s[0]/2+'px',height:s[1]/2+'px'}}
function rankImage(item:MenuEntry,index:number){return `ingame_ui_power_rank_000${index}_${(item.rank??0)>=index?'enabled':'disabled'}`}
function image(item:typeof items.value[number]){return armed.value===item.key?item.check:item.disabled&&props.data.sizes[item.image+'_disabled']?item.image+'_disabled':item.image}
</script>
<template>
  <aside class="tower-menu radial-menu" :aria-label="site.tower?'管理防御塔':'建造防御塔'" :style="{left:center.x+'%',top:center.y+'%',transform:`scale(${scale})`}">
    <button v-for="item in items" :key="item.key" class="radial-action" :style="style(item)" :disabled="item.disabled" :aria-label="item.label" :aria-pressed="armed===item.key" :title="item.tt_title" @click="activate(item)">
      <img :src="'assets/'+image(item)+'.png'" alt=""/>
      <img v-for="rank in item.rank!==undefined?3:0" :key="rank" class="power-rank" :style="rankStyle(rank-1,rankImage(item,rank))" :src="'assets/'+rankImage(item,rank)+'.png'" alt=""/>
      <img v-if="item.key===purchased&&time-purchaseAt<.4" class="power-buy-fx" :src="'assets/effect_powerbuy_'+String(Math.max(1,Math.min(12,Math.ceil((time-purchaseAt)*30)))).padStart(4,'0')+'.png'" alt=""/><span class="price" v-if="item.price!==undefined"><span class="price-number">{{item.price}}</span></span>
    </button>
    <button class="cancel" aria-label="取消" @click="emit('cancel')"/>
    <div v-if="tooltip" class="tower-tooltip"><strong>{{tooltip.tt_title??(tooltip.action==='tw_sell'?'出售防御塔':'升级防御塔')}}</strong><p v-if="tooltip.tt_desc">{{tooltip.tt_desc}}</p><span>再次点击确认</span></div>
  </aside>
</template>
<style scoped>
@font-face{font-family:KingdomNumbers;src:url('/fonts/GroboldovPoulos.ttf') format('truetype');font-display:swap}
.tower-menu.radial-menu{position:absolute;bottom:auto;width:0;height:0;max-width:none;padding:0;border:0;background:none;display:block;transform-origin:0 0;overflow:visible;z-index:10}
.radial-menu .radial-action{position:absolute;padding:0;border:0;box-shadow:none;background:transparent;border-radius:50%;transform:translate(-50%,-50%);animation:menu-enter .15s ease-out both}
.radial-action img{width:100%;height:100%;pointer-events:none}.radial-menu .radial-action:disabled{opacity:1;cursor:default}.radial-menu .radial-action[aria-pressed=true]{background:transparent;filter:drop-shadow(0 0 4px #ffe1a1)}
.power-rank{position:absolute;max-width:none;pointer-events:none}.radial-action .power-buy-fx{position:absolute;left:-8px;top:-20px;width:77px;height:88px;max-width:none;pointer-events:none}
.price{position:absolute;left:50%;top:100%;width:78px;height:56px;transform:translate(-50%,-50%);background:url('/assets/ingame_ui_price_tag.png') center/100% 100%;color:#ffe729;text-shadow:0 2px #000,1px 0 #000,-1px 0 #000;line-height:56px;pointer-events:none}.price-number{position:relative;left:1px;top:-5px;font-family:KingdomNumbers,sans-serif;font-size:13.58px;font-weight:400}.radial-action:disabled .price{color:#922f27}
.radial-menu .cancel{position:absolute;width:32px;height:32px;left:-16px;top:-16px;padding:0;border:0;background:transparent;box-shadow:none}
.tower-tooltip{position:absolute;left:115px;top:-60px;width:230px;padding:12px;border:2px solid #82674a;border-radius:5px;background:#ece0b9;color:#33251a;font-size:13px;line-height:1.5;box-shadow:2px 3px 4px #0008;pointer-events:none}.tower-tooltip strong{font-size:16px}.tower-tooltip p{margin:5px 0}.tower-tooltip span{font-size:11px;color:#746046}
@keyframes menu-enter{from{opacity:0;transform:translate(-50%,-50%) scale(.6)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}
</style>
