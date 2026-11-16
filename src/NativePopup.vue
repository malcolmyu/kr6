<script setup lang="ts">
import {computed,nextTick,onBeforeUnmount,onMounted,ref,toRaw} from 'vue'
import NativeUiNode from './NativeUiNode.vue'
import type {NativeUiNode as Node} from './NativeUiNode.vue'
import type {Point} from './game/types'
import type {PopupFrame} from './game/PauseOptions'
import {guiLayout} from './game/GuiLayout'
import {slotFind} from './game/SlotMenu'
const props=defineProps<{node:Node;images:Record<string,Point>;frames:{show:PopupFrame[];hide:PopupFrame[]};scale:Point;label:string;y?:number;initialFocus?:string}>(),emit=defineEmits<{action:[name:string];change:[id:string,value:number];sound:[name:string];closed:[];escape:[]}>()
const root=ref<HTMLElement>(),size=ref({w:1400,h:768}),age=ref(0),closing=ref(false)
let raf=0,observer:ResizeObserver,startedAt=0,focused=false,previousFocus:HTMLElement|null=null
const frame=computed(()=>{const rows=props.frames[closing.value?'hide':'show'];return rows[Math.min(rows.length-1,Math.floor(age.value*30+1e-9))]}),layout=computed(()=>guiLayout(size.value.w,size.value.h))
const plane=computed(()=>({left:layout.value.origin.x+'px',top:layout.value.origin.y+'px',width:layout.value.sw+'px',height:'768px',transform:`scale(${layout.value.scale})`}))
const contents=computed(()=>{const node=structuredClone(toRaw(slotFind(props.node,'contents')!));node.pos={x:layout.value.sw/2,y:(props.y??384)+frame.value.y};node.scale=props.scale;node.alpha=frame.value.alpha;return node})
function hide(){if(closing.value)return;closing.value=true;startedAt=performance.now();age.value=0;previousFocus?.focus({preventScroll:true})}
defineExpose({hide})
function tick(now:number){age.value=Math.max(0,(now-startedAt)/1000);if(closing.value&&frame.value.hidden){emit('closed');return}
 if(!focused&&!frame.value.disabled){focused=true;void nextTick(()=>{const id=props.initialFocus??'button_close_popup';root.value?.querySelector<HTMLButtonElement>(`[data-ui-node="${id}"] button`)?.focus({preventScroll:true});if(!root.value?.contains(document.activeElement))root.value?.focus({preventScroll:true})})}
 raf=requestAnimationFrame(tick)
}
onMounted(()=>{previousFocus=document.activeElement as HTMLElement;startedAt=performance.now();observer=new ResizeObserver(entries=>{const rect=entries[0].contentRect;size.value={w:rect.width,h:rect.height}});observer.observe(root.value!);raf=requestAnimationFrame(tick)})
onBeforeUnmount(()=>{cancelAnimationFrame(raf);observer?.disconnect()})
</script>
<template><section ref="root" class="native-popup" tabindex="-1" :class="{closing}" role="dialog" aria-modal="true" :aria-label="label" :data-popup-state="closing?'closing':frame.disabled?'opening':'open'" :style="{background:`rgba(0,0,0,${frame.background/255})`}" @keydown.esc.stop.prevent="emit('escape')" @pointerdown.stop @click.stop>
 <div class="popup-plane" :style="plane" :inert="frame.disabled"><NativeUiNode :node="contents" :images="images" @action="emit('action',$event)" @change="(id,value)=>emit('change',id,value)" @sound="emit('sound',$event)"/></div>
</section></template>
<style scoped>.native-popup{position:absolute;inset:0;z-index:30;overflow:hidden;pointer-events:auto}.native-popup.closing{pointer-events:none}.popup-plane{position:absolute;transform-origin:0 0;pointer-events:none}</style>
