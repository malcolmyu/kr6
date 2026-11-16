<script setup lang="ts">
import {computed,onMounted,onBeforeUnmount,ref} from 'vue'
import {ComicPlayer} from './game/ComicPlayer'
import type {ComicData,ComicSprite,ComicPose,ComicLabel} from './game/ComicPlayer'
import {guiLayout} from './game/GuiLayout'
const props=withDefaults(defineProps<{index?:number}>(),{index:1})
const emit=defineEmits<{done:[];sound:[name:string]}>()
const root=ref<HTMLElement>(),data=ref<ComicData>(),ready=ref(false),error=ref(''),tick=ref(0),size=ref({width:innerWidth,height:innerHeight})
let disposed=false
let player:ComicPlayer|undefined,observer:ResizeObserver|undefined,handle=0,previous=0
const page=computed(()=>{void tick.value;return player?.page})
const poses=computed(()=>{void tick.value;return player?.poses??[]})
const playing=computed(()=>{void tick.value;return player?.playing??false})
const frame=computed(()=>{void tick.value;return player?.frame??0})
const alpha=computed(()=>{void tick.value;return player?.alpha??1})
const layout=computed(()=>guiLayout(size.value.width,size.value.height))
const sheet=computed(()=>{
 const l=layout.value,s=l.scale*Math.min(1,l.sw/(data.value?.width??1365.3333333333)),w=data.value?.width??1365.3333333333,h=data.value?.height??768
 return {left:(l.origin.x+l.sw*l.scale/2-w*s/2)+'px',top:(l.origin.y+l.sh*l.scale/2-h*s/2)+'px',width:w+'px',height:h+'px',transform:`scale(${s})`,opacity:alpha.value}
})
function spriteStyle(sprite:ComicSprite,pose:ComicPose){return {left:pose[0]+'px',top:pose[1]+'px',width:sprite.size.x+'px',height:sprite.size.y+'px',opacity:pose[4],transform:`rotate(${pose[5]}rad) scale(${pose[2]},${pose[3]}) translate(${-sprite.anchor.x}px,${-sprite.anchor.y}px)`}}
function labelStyle(label:ComicLabel){return {left:label.pos.x+'px',top:label.pos.y+'px',width:label.size.x+'px',height:label.size.y+'px',fontSize:label.fontSize*(data.value?.fontScale??1.1)+'px',textAlign:label.align as 'left'|'center',color:`rgb(${label.color.slice(0,3).join(' ')})`,transform:`rotate(${label.rotation}rad)`}}
function skip(){player?.skip();tick.value++}
function key(event:KeyboardEvent){if(event.repeat||event.ctrlKey||event.metaKey||event.altKey)return;event.preventDefault();skip()}
function animate(now:number){if(ready.value&&player){player.advance(previous?Math.min(.1,(now-previous)/1000):0);tick.value++}previous=now;handle=requestAnimationFrame(animate)}
onMounted(async()=>{
 observer=new ResizeObserver(entries=>{const r=entries[0].contentRect;size.value={width:r.width,height:r.height}});observer.observe(root.value!)
 window.addEventListener('keydown',key)
 try {
  const response=await fetch('/data/comic'+String(props.index).padStart(2,'0')+'.json');if(!response.ok)throw new Error('漫画载入失败');data.value=await response.json()
  const images=[...new Set(data.value!.pages.flatMap(p=>p.sprites.map(s=>s.image)))]
  await Promise.all(images.map(name=>new Promise<void>((resolve,reject)=>{const img=new Image();img.onload=()=>resolve();img.onerror=()=>reject(new Error('漫画图片缺失：'+name));img.src='/assets/'+name+'.png'})))
  await document.fonts.load('22px ComicBody');if(disposed)return;player=new ComicPlayer(data.value!);player.onSound=name=>emit('sound',name);player.onDone=()=>emit('done');ready.value=true;handle=requestAnimationFrame(animate)
 }catch(e){error.value=String(e)}
})
onBeforeUnmount(()=>{disposed=true;cancelAnimationFrame(handle);observer?.disconnect();window.removeEventListener('keydown',key)})
</script>
<template>
<section ref="root" class="comic-screen" aria-label="开场漫画" :data-comic-page="(player?.pageIndex??0)+1" :data-frame="frame" :data-playing="playing">
 <div v-if="page&&ready" class="comic-sheet" :style="sheet">
  <div v-for="(sprite,index) in page.sprites" :key="sprite.id" class="comic-panel" :data-panel="sprite.id" :style="spriteStyle(sprite,poses[index])">
   <img :src="'/assets/'+sprite.image+'.png'" alt=""/>
   <span v-for="label in sprite.labels" :key="label.text" class="comic-label" :style="labelStyle(label)"><span>{{label.text}}</span></span>
  </div>
 </div>
 <button v-if="ready" class="comic-hit" :aria-label="playing?'漫画：点击快进':'漫画：点击继续'" @click="skip"/>
 <p v-if="!ready&&!error" class="comic-loading">正在载入…</p><p v-if="error" role="alert" class="comic-loading">{{error}}</p>
</section>
</template>
<style scoped>
@font-face{font-family:ComicBody;src:url('/fonts/NotoSansCJKsc-Regular.otf') format('opentype');font-display:swap}.comic-screen{position:fixed;inset:0;background:black;z-index:100;overflow:hidden}.comic-sheet{position:absolute;transform-origin:0 0}.comic-panel{position:absolute;transform-origin:0 0;pointer-events:none}.comic-panel img{width:100%;height:100%;display:block}.comic-label{position:absolute;display:flex;align-items:center;line-height:.9;transform-origin:0 0;color:black;white-space:normal;overflow-wrap:anywhere;font-family:ComicBody,sans-serif;font-weight:400}.comic-label>span{width:100%}.comic-hit{position:absolute;inset:0;width:100%;height:100%;background:transparent;border:0;border-radius:0;box-shadow:none;padding:0}.comic-hit[aria-pressed],.comic-hit:focus{background:transparent}.comic-loading{position:absolute;inset:45% 0 auto;text-align:center;color:white}
</style>
