<script setup lang="ts">
import {onMounted,onBeforeUnmount,ref} from 'vue'
import SlotMenu from './SlotMenu.vue'
import type {SlotEntry,SlotMenuArt} from './game/SlotMenu'
import {preloadNativeImages} from './game/NativeImageCache'
import {OpeningRenderer} from './game/OpeningRenderer'
const props=defineProps<{begin:()=>Promise<void>;slots:SlotEntry[]}>()
const emit=defineEmits<{menu:[];select:[index:number];delete:[index:number];sound:[name:string]}>()
const viewport=ref<HTMLElement>(),state=ref<'loading'|'ready'|'splash'|'menu'>('loading'),error=ref('')
const slotArt=ref<SlotMenuArt>()
let renderer:OpeningRenderer|undefined,disposed=false
onMounted(async()=>{
 try{renderer=new OpeningRenderer(viewport.value!);renderer.onMenu=()=>{state.value='menu';emit('menu')};await Promise.all([renderer.load(),(async()=>{const response=await fetch('data/slots.json');if(!response.ok)throw new Error('存档界面载入失败');const data:SlotMenuArt=await response.json();await preloadNativeImages(Object.keys(data.images).map(n=>'assets/'+n+'.png'));if(!disposed){slotArt.value=data;renderer!.menuMotion=data.menuFrames}})()]);if(!disposed)state.value='ready'}catch(e){error.value=String(e)}
})
async function start(){
  state.value='splash'
  try{await props.begin();renderer!.start()}catch(e){error.value=String(e);state.value='ready'}
}
onBeforeUnmount(()=>{disposed=true;renderer?.dispose()})
</script>
<template><section class="opening"><div ref="viewport" class="opening-scene"/>
  <p v-if="state==='loading'&&!error" class="opening-action">正在载入…</p>
  <button v-if="state==='ready'" class="opening-action" @click="start">开始游戏</button>
  <SlotMenu v-if="state==='menu'&&slotArt" :data="slotArt" :slots="slots" @select="emit('select',$event)" @delete="emit('delete',$event)" @sound="emit('sound',$event)"/>
  <p v-if="error" role="alert" class="opening-action">{{error}}</p>
</section></template>
<style scoped>
.opening{position:fixed;inset:0;background:#000}.opening-scene{width:100%;height:100%}.opening-action{position:absolute;left:50%;top:75%;transform:translate(-50%,-50%);white-space:nowrap}.tap-start{top:85%;font-size:32px;background:transparent;border:0;box-shadow:none;color:#ffe321;font-weight:bold;text-shadow:2px 3px #151008,-2px -2px #151008}
</style>
