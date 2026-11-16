<script setup lang="ts">
import {computed,nextTick,onBeforeUnmount,onMounted,ref,toRaw} from 'vue'
import NativeUiNode from './NativeUiNode.vue'
import {guiLayout} from './game/GuiLayout'
import {slotMenuView,slotFind} from './game/SlotMenu'
import type {SlotEntry,SlotMenuArt} from './game/SlotMenu'
const props=defineProps<{data:SlotMenuArt;slots:SlotEntry[]}>(),emit=defineEmits<{select:[index:number];delete:[index:number];sound:[name:string]}>()
const root=ref<HTMLElement>(),state=ref<'closed'|'delay'|'in'|'open'|'out'>('closed'),deleting=ref<number>(),size=ref({w:innerWidth,h:innerHeight}),age=ref(0),phaseAge=ref(0),startFade=ref(1)
let observer:ResizeObserver,raf=0,startedAt=0,phaseAt=0,fadeAt=0
const layout=computed(()=>guiLayout(size.value.w,size.value.h,true)),canvasStyle=computed(()=>({left:layout.value.origin.x+'px',top:layout.value.origin.y+'px',width:layout.value.sw+'px',height:'768px',transform:`scale(${layout.value.scale})`}))
const panelFrame=computed(()=>{const frames=props.data.panelFrames[state.value==='out'?'out':'in'];return frames[Math.min(frames.length-1,Math.floor(phaseAge.value*30+1e-9))]})
const panel=computed(()=>{const view=slotMenuView(toRaw(props.data),props.slots,deleting.value);view.pos={x:layout.value.sw/2,y:state.value==='open'?props.data.panel.pos_shown.y:panelFrame.value.y};view.hidden=state.value==='closed'||state.value==='delay'||state.value==='out'&&panelFrame.value.hidden;return view})
const startNode=computed(()=>{const view=structuredClone(toRaw(props.data.start));view.pos={x:layout.value.sw/2,y:768};const button=slotFind(view,'button_start')!;button.action='show';button.label='点击开始';button.disabled=state.value!=='closed'||menuFrame.value.startAge===undefined;slotFind(view,'label_start')!.alpha=startFade.value;return view})
const menuFrame=computed(()=>props.data.menuFrames[Math.min(props.data.menuFrames.length-1,Math.floor(age.value*30+1e-9))])
const startPoses=computed(()=>{const index=Math.max(0,Math.floor((menuFrame.value.startAge??0)*30+1e-9)),poses=structuredClone(toRaw(props.data.startFrames[Math.min(props.data.startFrames.length-1,index)]));if(poses.label_start)poses.label_start[4]*=startFade.value;return poses})
function focus(index:number,id:string){void nextTick(()=>root.value?.querySelector<HTMLButtonElement>(`[data-ui-node="slot_${index}"] [data-ui-node="${id}"] button`)?.focus({preventScroll:true}))}
function close(){if(state.value!=='open')return;emit('sound','GUIButtonCommon');state.value='out';phaseAt=performance.now();phaseAge.value=0;deleting.value=undefined}
function action(value:string){
 if(value==='show'){if(state.value!=='closed')return;emit('sound','GUIButtonCommon');state.value='delay';phaseAt=performance.now();fadeAt=phaseAt;phaseAge.value=0;return}
 if(value==='close'){close();return}
 if(state.value!=='open')return
 const [name,raw]=value.split(':'),index=Number(raw);emit('sound','GUIButtonCommon')
 if(name==='select')emit('select',index)
 else if(name==='request'){deleting.value=index;focus(index,'slot_delete_cancel')}
 else if(name==='cancel'){deleting.value=undefined;focus(index,'slot_used')}
 else if(name==='confirm'){emit('delete',index);deleting.value=undefined}
}
function frame(now:number){age.value=(now-startedAt)/1000;phaseAge.value=(now-phaseAt)/1000
 if(state.value==='delay'||state.value==='in'||state.value==='open')startFade.value=Math.max(0,1-(now-fadeAt)/300)
 if(state.value==='delay'&&phaseAge.value>=.1){state.value='in';phaseAt=now;phaseAge.value=0}
 else if(state.value==='in'&&!panelFrame.value.disabled){state.value='open'}
 else if(state.value==='out'&&panelFrame.value.hidden){state.value='closed';phaseAt=now;phaseAge.value=0;void nextTick(()=>root.value?.querySelector<HTMLButtonElement>('[data-ui-node="button_start"] button')?.focus({preventScroll:true}))}
 else if(state.value==='closed')startFade.value=Math.min(1,(now-phaseAt)/300)
 raf=requestAnimationFrame(frame)
}
onMounted(()=>{startedAt=performance.now();phaseAt=startedAt-300;observer=new ResizeObserver(entries=>{const b=entries[0].contentRect;size.value={w:b.width,h:b.height}});observer.observe(root.value!);raf=requestAnimationFrame(frame)})
onBeforeUnmount(()=>{cancelAnimationFrame(raf);observer?.disconnect()})
</script>
<template><div ref="root" class="native-main-menu-ui" @keydown.esc.prevent.stop="close">
 <div class="slot-canvas" :style="canvasStyle"><NativeUiNode :node="startNode" :images="data.images" :poses="startPoses" @action="action"/>
  <div class="slot-dialog" v-if="state!=='closed'&&state!=='delay'" role="dialog" aria-label="选择存档" aria-modal="true" :inert="state!=='open'" :data-slot-state="state"><NativeUiNode :node="panel" :images="data.images" @action="action"/></div>
 </div>
</div></template>
<style scoped>
.native-main-menu-ui{position:fixed;inset:0;pointer-events:none;z-index:2}.slot-dialog{position:absolute;inset:0;pointer-events:none}.slot-canvas{position:absolute;transform-origin:0 0;pointer-events:none}
</style>
