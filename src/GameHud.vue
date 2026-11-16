<script setup lang="ts">
import {computed,onMounted,onBeforeUnmount,ref} from 'vue'
import {guiLayout} from './game/GuiLayout'
import type {Point} from './game/types'
interface HudNode {id:string;pos:Point;anchor?:Point;size?:Point;font_size?:number;colors?:{text:number[]};image_name?:string;default_image_name?:string;focus_image_name?:string;scale?:Point;children?:HudNode[]}
export interface HudData {images:Record<string,Point>;variants:Record<string,{scale:number;hud:HudNode;pause:HudNode}>}
const props=defineProps<{data:HudData;lives:number;gold:number;wave:number;totalWaves:number;paused:boolean;disabled:boolean}>()
const emit=defineEmits<{pause:[]}>()
const root=ref<HTMLElement>(),size=ref({width:1400,height:768}),hovered=ref(false)
let observer:ResizeObserver|undefined
onMounted(()=>{observer=new ResizeObserver(entries=>{const box=entries[0].contentRect;size.value={width:box.width,height:box.height}});observer.observe(root.value!)})
onBeforeUnmount(()=>observer?.disconnect())
const layout=computed(()=>guiLayout(size.value.width,size.value.height))
const variant=computed(()=>props.data.variants.desktop)
const planeStyle=computed(()=>({left:layout.value.origin.x+'px',top:layout.value.origin.y+'px',width:layout.value.sw+'px',height:layout.value.sh+'px',transform:`scale(${layout.value.scale})`}))
const panelStyle=computed(()=>{
  const v=variant.value,h=v.hud,image=props.data.images[h.image_name!],sf=layout.value.safe
  return {left:(sf.lt-h.anchor!.x*v.scale)+'px',top:(sf.tl-h.anchor!.y*v.scale)+'px',width:image.x+'px',height:image.y+'px',transform:`scale(${v.scale})`}
})
const labels=computed(()=>variant.value.hud.children!.filter(n=>['hud_lives_label','hud_gold_label','hud_waves_label'].includes(n.id)).map(n=>{
  const key=n.id==='hud_lives_label'?'lives':n.id==='hud_gold_label'?'gold':'wave',color=n.colors!.text
  const value=key==='lives'?String(props.lives):key==='gold'?String(props.gold):`${props.wave}/${props.totalWaves}`
  return {key,value,aria:`${key==='lives'?'生命':key==='gold'?'金币':'波次'} ${value}`,style:{left:n.pos.x+'px',top:n.pos.y+'px',width:n.size!.x+'px',height:n.size!.y+'px',fontSize:n.font_size!*.97+'px',color:`rgb(${color[0]} ${color[1]} ${color[2]})`}}
}))
const pauseImage=computed(()=>{const button=variant.value.pause.children![0];return hovered.value?button.focus_image_name!:button.default_image_name!})
const pauseStyle=computed(()=>{
  const v=variant.value,p=v.pause,b=p.children![0],s=v.scale,bs=b.scale!,sf=layout.value.safe,image=props.data.images[b.default_image_name!]
  return {left:(layout.value.sw-sf.rt-p.anchor!.x*s+(b.pos.x-b.anchor!.x*bs.x)*s)+'px',top:(sf.tr-p.anchor!.y*s+(b.pos.y-b.anchor!.y*bs.y)*s)+'px',width:image.x*s*bs.x+'px',height:image.y*s*bs.y+'px'}
})
</script>
<template>
  <div ref="root" class="hud native-hud" aria-label="战斗状态">
    <div class="gui-plane" :style="planeStyle">
      <div class="hud-panel" :style="panelStyle">
        <img class="hud-background" :src="'assets/'+variant.hud.image_name+'.png'" alt=""/>
        <span v-for="label in labels" :key="label.key" class="hud-number" :data-hud="label.key" :data-wave="label.key==='wave'?wave:undefined" :aria-label="label.aria" :style="label.style">{{label.value}}</span>
      </div>
      <button class="native-pause" :style="pauseStyle" :disabled="disabled" :aria-label="paused?'继续':'暂停'" :aria-pressed="paused" @pointerenter="hovered=true" @pointerleave="hovered=false" @click="emit('pause')"><img :src="'assets/'+pauseImage+'.png'" alt=""/></button>
    </div>
  </div>
</template>
<style scoped>
@font-face{font-family:KingdomHudNumbers;src:url('/fonts/GroboldovPoulos.ttf') format('truetype');font-display:swap}
.hud.native-hud{position:absolute;inset:0;display:block;margin:0;padding:0;pointer-events:none;color:inherit;text-shadow:none}
.gui-plane{position:absolute;transform-origin:0 0;pointer-events:none}.hud-panel{position:absolute;transform-origin:0 0}.hud-background{display:block;width:100%;height:100%;pointer-events:none}
.hud.native-hud .hud-number{position:absolute;display:flex;align-items:center;justify-content:center;margin:0;padding:0;background:transparent;border:0;border-radius:0;font-family:KingdomHudNumbers,sans-serif;font-weight:400;line-height:1;white-space:nowrap;text-shadow:0 1px 1px #000}
.hud.native-hud .native-pause{position:absolute;margin:0;padding:0;border:0;border-radius:0;box-shadow:none;background:transparent;pointer-events:auto}.native-pause img{display:block;width:100%;height:100%}.native-pause:disabled{opacity:.55;cursor:default}
</style>
