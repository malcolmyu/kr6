<script setup lang="ts">
import {computed,onMounted,onBeforeUnmount,ref} from 'vue'
import {SceneTransitionRenderer} from './game/SceneTransitionRenderer'
import type {TransitionData} from './game/SceneTransitionRenderer'
import {SceneTransitionController} from './game/SceneTransitionController'
import type {TransitionPhase} from './game/SceneTransitionController'
import {preloadNativeImages} from './game/NativeImageCache'
import {guiLayout} from './game/GuiLayout'
import {loadingSwordPose} from './game/LoadingSword'
const emit=defineEmits<{busy:[value:boolean];sound:[name:string]}>()
const host=ref<HTMLElement>(),active=ref(false),phase=ref<TransitionPhase>('closing'),progress=ref(0),width=ref(innerWidth),height=ref(innerHeight),data=ref<TransitionData>()
let disposed=false
let renderer:SceneTransitionRenderer|undefined,resolveReady:(v:TransitionData|undefined)=>void,rejectReady:(reason:unknown)=>void
const ready=new Promise<TransitionData|undefined>((resolve,reject)=>{resolveReady=resolve;rejectReady=reject});void ready.catch(()=>{})
const controller=new SceneTransitionController({visible:value=>{active.value=value;emit('busy',value)},pose:(p,age,value)=>{phase.value=p;progress.value=value;renderer?.draw(p,age)},sound:name=>emit('sound',name),now:()=>performance.now(),requestFrame:fn=>requestAnimationFrame(fn),cancelFrame:id=>cancelAnimationFrame(id)})
onMounted(()=>{renderer=new SceneTransitionRenderer(host.value!);renderer.onResize=(w,h)=>{width.value=w;height.value=h};void renderer.load().then(async value=>{if(value&&!disposed)await preloadNativeImages(['loading_asst_sword_off','loading_asst_sword_on','asst_shine','asst_handle_sword'].map(n=>'/assets/'+n+'.png'));if(!disposed)data.value=value;resolveReady(disposed?undefined:value)}).catch(rejectReady)})
const layout=computed(()=>guiLayout(width.value,height.value,true)),pixelScale=computed(()=>layout.value.scale),logicalWidth=computed(()=>layout.value.sw)
const pose=computed(()=>{const d=data.value;if(!d)return
 return loadingSwordPose({off:d.images.loading_asst_sword_off,on:d.images.loading_asst_sword_on,shine:d.images.asst_shine,mask:d.images.asst_handle_sword},progress.value,logicalWidth.value/1024,phase.value==='loading',logicalWidth.value/2-1.5,386)
})
function imageStyle(part:'off'|'shine'|'mask'|'clip'){
 const p=pose.value?.[part];if(!p)return {}
 return {left:layout.value.origin.x+(p.pos.x-p.anchor.x*p.scale.x)*pixelScale.value+'px',top:layout.value.origin.y+(p.pos.y-p.anchor.y*p.scale.y)*pixelScale.value+'px',width:p.size.x*p.scale.x*pixelScale.value+'px',height:p.size.y*p.scale.y*pixelScale.value+'px',opacity:p.alpha}
}
const onStyle=computed(()=>{const p=pose.value;if(!p)return{};const scale=p.clip.scale.x*pixelScale.value;return {left:p.on.pos.x*scale+'px',top:p.on.pos.y*scale+'px',width:p.on.size.x*scale+'px',height:p.on.size.y*scale+'px'}})
async function run(prepare:Parameters<SceneTransitionController['run']>[0]){
 if(active.value)return false
 active.value=true;emit('busy',true)
 try{await ready;if(disposed)return false;return await controller.run(prepare)}finally{if(!controller.busy){active.value=false;emit('busy',false)}}
}
defineExpose({run,cancel:()=>controller.cancel()})
onBeforeUnmount(()=>{disposed=true;controller.cancel();renderer?.dispose()})
</script>
<template><section class="scene-transition" :class="{active}" :aria-hidden="!active" :data-active="active" :data-phase="phase" role="status" aria-label="正在切换场景">
 <div ref="host" class="transition-canvas"/>
 <div v-if="pose&&phase==='loading'" class="loading-sword" aria-hidden="true">
  <img src="/assets/loading_asst_sword_off.png" :style="imageStyle('off')" alt=""/>
  <img src="/assets/asst_shine.png" :style="imageStyle('shine')" alt=""/>
  <div class="sword-clip" :style="imageStyle('clip')"><img src="/assets/loading_asst_sword_on.png" :style="onStyle" alt=""/></div>
  <img src="/assets/asst_handle_sword.png" :style="imageStyle('mask')" alt=""/>
 </div>
</section></template>
<style scoped>
.scene-transition{position:fixed;inset:0;z-index:10000;visibility:hidden;pointer-events:none;contain:layout paint}.scene-transition.active{visibility:visible;pointer-events:auto}.transition-canvas,.loading-sword{position:absolute;inset:0}.transition-canvas :deep(canvas){display:block;width:100%;height:100%}.loading-sword img,.sword-clip{position:absolute;max-width:none}.sword-clip{overflow:hidden}
</style>
