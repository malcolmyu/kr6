<script setup lang="ts">
import {computed,onMounted,onBeforeUnmount,ref,watch} from 'vue'
import {guiLayout} from './game/GuiLayout'
import {MapViewport} from './game/MapViewport'
import NativeUiNode from './NativeUiNode.vue'
import LevelSelect from './LevelSelect.vue'
import type {LevelSelectArt} from './game/LevelSelect'
import type {HeroRoomArt,RoomNode} from './game/HeroRoom'
import type {Progress} from './game/ProgressStore'
import type {GameMode,Point} from './game/types'
import {preloadNativeImages} from './game/NativeImageCache'
interface MapData {width:number;height:number;flags:{level:number;pos:Point}[];images:Record<string,Point>}
const props=defineProps<{progress:Progress;focus:number}>(),emit=defineEmits<{enter:[level:number,mode:GameMode];sound:[name:string];heroes:[];powers:[];upgrades:[];ready:[error?:string];loading:[progress:number]}>()
const root=ref<HTMLElement>(),data=ref<MapData>(),selected=ref<number>(),hover=ref<number>(),time=ref(0),size=ref({w:1365.333,h:768}),error=ref('')
const names=['利尼维亚城堡','奥术魔法学院','遭受入侵的农田']
const heroArt=ref<HeroRoomArt>(),powerArt=ref<HeroRoomArt>(),globalArt=ref<HeroRoomArt>(),levelArt=ref<LevelSelectArt>()
function entry(data:HeroRoomArt|undefined,action:string,label:string){if(!data)return;let node:RoomNode={...data.mapButton,action,label};for(const [index,parent]of data.mapButtonPath.slice(0,-1).reverse().entries())node={class:'KView',...parent,...(index===1?{scale:{x:data.scale,y:data.scale}}:{}),children:[node]};return node}
const heroEntry=computed(()=>entry(heroArt.value,'heroes','英雄')),powerEntry=computed(()=>entry(powerArt.value,'powers','法术')),globalEntry=computed(()=>entry(globalArt.value,'upgrades','升级'))
function hudAction(name:string){emit('sound','GUIButtonCommon');if(name==='upgrades')emit('upgrades');else if(name==='powers')emit('powers');else emit('heroes')}
let disposed=false,readySent=false
function finishReady(error?:string){if(!readySent){readySent=true;emit('ready',error)}}
let observer:ResizeObserver|undefined,handle=0,previous=0,drag:{x:number;y:number;pos:Point}|undefined,moved=false
const layout=computed(()=>guiLayout(size.value.w,size.value.h)),scale=computed(()=>layout.value.scale)
const mapViewport=ref(new MapViewport(layout.value.sw,layout.value.sh))
function resetViewport(){const focus=data.value?.flags.find(f=>f.level===props.focus)?.pos;mapViewport.value=new MapViewport(layout.value.sw,layout.value.sh,undefined,focus)}
watch(()=>[layout.value.sw,layout.value.sh],resetViewport)
const paper=computed(()=>{const view=mapViewport.value,s=scale.value;return {left:(layout.value.origin.x+view.pos.x*s)+'px',top:(layout.value.origin.y+view.pos.y*s)+'px',width:'2486px',height:'1339.5px',transform:`scale(${s*view.zoom})`}})
function unlocked(level:number){return level===1||!!props.progress.levels[level-1]?.campaign}
function image(name:string,x:number,y:number){const s=data.value!.images[name];return {left:x+'px',top:y+'px',width:s.x+'px',height:s.y+'px'}}
function flagFrame(level:number){const entry=props.progress.levels[level];if(entry?.iron)return hover.value===level?196+Math.floor(time.value*30)%25:221;if(entry?.campaign)return hover.value===level?101+Math.floor(time.value*30)%48:149;return hover.value===level?26+Math.floor(time.value*30)%48:1}
function flagName(level:number){return 'kr6_map_flags_animation_stage_flag_'+String(flagFrame(level)).padStart(4,'0')}
function pick(level:number){if(!moved&&unlocked(level)){selected.value=level;emit('sound','GUIButtonCommon')}}
function enter(mode:GameMode){if(selected.value)emit('enter',selected.value,mode)}
function down(e:PointerEvent){moved=false;if((e.target as HTMLElement).closest('button,select'))return;drag={x:e.clientX,y:e.clientY,pos:{...mapViewport.value.pos}};moved=false;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)}
function move(e:PointerEvent){if(!drag)return;const dx=(e.clientX-drag.x)/scale.value,dy=(e.clientY-drag.y)/scale.value;if(Math.hypot(dx,dy)>4)moved=true;mapViewport.value.pos={...drag.pos};mapViewport.value.pan(dx,dy)}
function wheel(e:WheelEvent){if(selected.value||e.deltaY===0)return;const rect=root.value!.getBoundingClientRect();mapViewport.value.scroll(e.deltaY>0?'wd':'wu',{x:(e.clientX-rect.left-layout.value.origin.x)/scale.value,y:(e.clientY-rect.top-layout.value.origin.y)/scale.value})}
function animate(now:number){time.value+=previous?Math.min(.1,(now-previous)/1000):0;previous=now;handle=requestAnimationFrame(animate)}
onMounted(async()=>{observer=new ResizeObserver(entries=>{const b=entries[0].contentRect;size.value={w:b.width,h:b.height}});observer.observe(root.value!);try{
 const [response,hero,power,level,global]=await Promise.all([fetch('/data/map.json'),fetch('/data/hero-room.json'),fetch('/data/power-room.json'),fetch('/data/level-select.json'),fetch('/data/global-room.json')]);if(!response.ok||!hero.ok||!power.ok||!level.ok||!global.ok)throw new Error('地图载入失败')
 const [map,room,powers,selection,globals]=await Promise.all([response.json(),hero.json(),power.json(),level.json(),global.json()]);if(disposed)return;data.value=map;heroArt.value=room;powerArt.value=powers;globalArt.value=globals;levelArt.value=selection;resetViewport()
 const urls=['/assets/screen_map_bg-1.png','/assets/screen_map_bg-2.png',...Object.keys(data.value!.images).map(n=>'/assets/'+n+'.png')]
 const visit=(node:RoomNode)=>{for(const key of ['image_name','default_image_name','focus_image_name','disabled_image_name'] as const){const value=(node as RoomNode&{disabled_image_name?:string})[key];if(typeof value==='string')urls.push('/assets/'+value+'.png')}for(const child of node.children??[])visit(child)}
 if(heroEntry.value)visit(heroEntry.value)
 if(powerEntry.value)visit(powerEntry.value)
 if(globalEntry.value)visit(globalEntry.value)
 for(const name of Object.keys(levelArt.value!.images))urls.push('/assets/'+name+'.png')
 await preloadNativeImages(urls,value=>{if(!disposed)emit('loading',value)});if(disposed)return;handle=requestAnimationFrame(animate);finishReady()
 }catch(e){if(!disposed){error.value=String(e);finishReady(error.value)}}})
onBeforeUnmount(()=>{disposed=true;finishReady('地图已取消载入');cancelAnimationFrame(handle);observer?.disconnect()})
</script>
<template>
 <section ref="root" class="native-map" aria-label="王国地图" @pointerdown="down" @pointermove="move" @pointerup="drag=undefined" @pointercancel="drag=undefined" @wheel.prevent="wheel">
  <div v-if="data" class="map-paper" :style="paper"><img class="map-bg first" src="/assets/screen_map_bg-1.png" alt=""/><img class="map-bg second" src="/assets/screen_map_bg-2.png" alt=""/>
   <div v-for="flag in data.flags.filter(f=>unlocked(f.level))" :key="flag.level" class="map-flag" :style="{left:flag.pos.x+'px',top:flag.pos.y+'px'}">
    <img :style="image(flagName(flag.level),-43.95,-106.55)" :src="'/assets/'+flagName(flag.level)+'.png'" alt=""/>
    <img v-for="star in 3" :key="star" :style="image('kr6_map_flags_animation_stage_flag_star_'+star+'_0001',[-16.45,3.2,21.35][star-1]-[12.15,17.45,17.6][star-1],[-63.45,-63.9,-64.55][star-1]-[15.6,24.75,16.25][star-1])" :src="'/assets/kr6_map_flags_animation_stage_flag_star_'+star+'_'+((progress.levels[flag.level]?.campaign??0)>=star?'0022':'0001')+'.png'" alt=""/>
    <span class="flag-number">{{flag.level}}</span>
    <button :aria-label="flag.level+'. '+names[flag.level-1]" @pointerenter="hover=flag.level" @pointerleave="hover=undefined" @click="pick(flag.level)"/>
   </div>
  </div>
  <div v-if="heroEntry&&heroArt" class="map-hud" :style="{transform:`translateX(-50%) scale(${scale})`}"><NativeUiNode :node="heroEntry" :images="heroArt.images" @action="hudAction"/><NativeUiNode v-if="powerEntry&&powerArt" :node="powerEntry" :images="powerArt.images" @action="hudAction"/><NativeUiNode v-if="globalEntry&&globalArt" :node="globalEntry" :images="globalArt.images" @action="hudAction"/></div>
  <LevelSelect v-if="selected&&levelArt" :key="selected" :data="levelArt" :stage="selected" :progress="progress" @enter="enter" @close="selected=undefined" @sound="emit('sound',$event)"/>
  <p v-if="error" role="alert">{{error}}</p>
 </section>
</template>
<style scoped>
.native-map{position:fixed;inset:0;overflow:hidden;background:#000;z-index:60;touch-action:none}.map-hud{position:absolute;left:50%;top:0;width:1365.333333px;height:768px;transform-origin:top center;pointer-events:none}.map-paper{position:absolute;transform-origin:0 0}.map-bg{position:absolute;top:0;height:1390px;pointer-events:none}.map-bg.first{left:0;width:2048px}.map-bg.second{left:2048px;width:438px}.map-flag{position:absolute;width:0;height:0}.map-flag img{position:absolute;max-width:none;pointer-events:none}.map-flag button{position:absolute;left:-25.4px;top:-53.35px;width:61px;height:64px;background:transparent;border:0;padding:0;box-shadow:none}.flag-number{position:absolute;left:-14.5px;top:-88.75px;width:30.05px;height:25.05px;text-align:center;font-family:ComicBody,sans-serif;font-size:16.5px;font-weight:400;color:black;pointer-events:none}.level-selection{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);padding:24px;background:#e8dfbe;color:#31271c;border:4px solid #6a5a40;border-radius:8px;text-align:center}.level-selection button{margin:8px}.level-selection button:disabled{opacity:.45}.native-map p{position:absolute;inset:45% 0 auto;text-align:center;color:white}
</style>
