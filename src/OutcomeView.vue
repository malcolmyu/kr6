<script setup lang="ts">
import {computed,onMounted,onBeforeUnmount,ref} from 'vue'
import OutcomeNode from './OutcomeNode.vue'
import type {Outcome} from './game/Outcome'
import type {OutcomeArt} from './game/OutcomeAnimation'
import {outcomePoses,outcomePlan} from './game/OutcomeAnimation'
import {OutcomeRenderer} from './game/OutcomeRenderer'
import {guiLayout} from './game/GuiLayout'
const props=defineProps<{outcome:Outcome;iron:boolean}>(),emit=defineEmits<{restart:[];continue:[];ready:[];sound:[name:string]}>()
const root=ref<HTMLElement>(),canvas=ref<HTMLElement>(),data=ref<OutcomeArt>(),elapsed=ref(0),ready=ref(false),error=ref(''),size=ref({width:1365.3333333333,height:768})
let disposed=false
let observer:ResizeObserver|undefined,renderer:OutcomeRenderer|undefined,handle=0,previous=0,starsPlayed=0
const victory=computed(()=>props.outcome.kind==='victory')
const poses=computed(()=>data.value?outcomePoses(data.value,elapsed.value,victory.value,props.iron):{})
const layout=computed(()=>guiLayout(size.value.width,size.value.height))
const sheet=computed(()=>{const l=layout.value,s=l.scale*.8,w=data.value?.width??1365.3333333333,h=768;return {left:(l.origin.x+l.sw*l.scale/2-w*s/2)+'px',top:(l.origin.y+l.sh*l.scale/2-h*s/2)+'px',width:w+'px',height:h+'px',transform:`scale(${s})`}})
function animate(now:number){const dt=previous?Math.min(.1,(now-previous)/1000):0;previous=now;elapsed.value+=dt;renderer?.render(elapsed.value)
 const sounds=outcomePlan(props.outcome.kind,props.outcome.stars,props.iron).sounds
 while(starsPlayed<sounds.length&&elapsed.value>=sounds[starsPlayed].delay){emit('sound',sounds[starsPlayed].name);starsPlayed++}
 handle=requestAnimationFrame(animate)
}
function action(name:string){emit('sound','GUIButtonCommon');if(name==='button_vd_restart')emit('restart');else emit('continue')}
onMounted(async()=>{
 observer=new ResizeObserver(entries=>{const r=entries[0].contentRect;size.value={width:r.width,height:r.height}});observer.observe(root.value!)
 try{const response=await fetch('/data/outcome.json');if(!response.ok)throw new Error('结算资源载入失败');data.value=await response.json();await document.fonts.ready;if(disposed)return;renderer=new OutcomeRenderer(canvas.value!,data.value!,props.outcome,props.iron);await renderer.load();if(disposed)return;ready.value=true;emit('ready');handle=requestAnimationFrame(animate)}catch(e){error.value=String(e)}
})
onBeforeUnmount(()=>{disposed=true;cancelAnimationFrame(handle);observer?.disconnect();renderer?.dispose()})
</script>
<template>
 <section ref="root" class="native-outcome" role="status" :aria-label="victory?'战斗胜利':'战斗失败'" :data-outcome="outcome.kind" :data-outcome-time="elapsed">
  <div class="outcome-dim" :style="{opacity:Math.min(1,elapsed/.3)*160/255}"/>
  <div class="outcome-sheet" :style="sheet">
   <div ref="canvas" class="outcome-exos"/>
   <template v-if="data&&ready"><OutcomeNode v-for="(node,index) in data.template.children?.filter(n=>n.class!=='GGExo')" :key="index" :node="node" :data="data" :poses="poses" :victory="victory" :iron="iron" @action="action"/></template>
  </div>
  <p v-if="error" role="alert">{{error}}</p>
 </section>
</template>
<style scoped>
.native-outcome{position:absolute;inset:0;z-index:30;overflow:hidden;pointer-events:auto}.outcome-dim{position:absolute;inset:0;background:black;pointer-events:none}.outcome-sheet{position:absolute;transform-origin:0 0;pointer-events:none}.outcome-exos{position:absolute;inset:0;pointer-events:none}.outcome-exos :deep(canvas){display:block;width:100%!important;height:100%!important}.native-outcome p{position:absolute;inset:40% 0 auto;text-align:center;color:white}
</style>
