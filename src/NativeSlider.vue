<script setup lang="ts">
import {computed,ref,toRaw} from 'vue'
import NativeUiNode from './NativeUiNode.vue'
import type {NativeUiNode as Node} from './NativeUiNode.vue'
import type {Point} from './game/types'
import {slotFind} from './game/SlotMenu'
import {sliderPose,sliderPointer} from './game/NativeSlider'
const props=defineProps<{node:Node;images:Record<string,Point>}>(),emit=defineEmits<{change:[id:string,value:number];sound:[name:string]}>(),hit=ref<HTMLElement>(),hover=ref(false),focused=ref(false)
let dragging=false
const control=computed(()=>props.node.control!),range=computed(()=>control.value.range??[0,1] as [number,number])
const geometry=computed(()=>{const bg=slotFind(props.node,'background')!,bar=slotFind(props.node,'bar')!;return {left:bg.pos!.x-bg.anchor!.x,top:bg.pos!.y-bg.anchor!.y,width:bg.size!.x,height:bg.size!.y,bar}})
const pose=computed(()=>sliderPose(control.value.value,range.value,geometry.value.bar as {pos:Point;size:Point}))
const view=computed(()=>{const root=structuredClone(toRaw(props.node));root.class='KView';const bar=slotFind(root,'bar')!,knob=slotFind(root,'knob')!,glow=slotFind(root,'glow'),image=slotFind(knob,'image'),disabled=slotFind(knob,'disabled');bar.scale={x:pose.value.phase,y:1};knob.pos!.x=pose.value.knobX;if(glow)glow.hidden=!(hover.value||focused.value);if(image)image.hidden=!!control.value.muted;if(disabled)disabled.hidden=!control.value.muted;return root})
const hitStyle=computed(()=>({left:geometry.value.left+'px',top:geometry.value.top+'px',width:geometry.value.width+'px',height:geometry.value.height+'px'}))
const knobStyle=computed(()=>{const node=slotFind(slotFind(props.node,'knob')!,'image')!,size=props.images[node.image_name!]!,anchor=node.anchor??{x:0,y:0};return{left:(pose.value.knobX-anchor.x)+'px',top:-anchor.y+'px',width:size.x+'px',height:size.y+'px'}})
function set(value:number){emit('change',props.node.id!,Math.max(range.value[0],Math.min(range.value[1],value)))}
function localX(e:PointerEvent){const box=hit.value!.getBoundingClientRect();return geometry.value.left+(e.clientX-box.left)*geometry.value.width/box.width}
function down(e:PointerEvent){e.preventDefault();hit.value?.focus({preventScroll:true});dragging=false;hit.value!.setPointerCapture(e.pointerId)}
function knobDown(e:PointerEvent){down(e);dragging=true}
function move(e:PointerEvent){if(dragging){const bar=geometry.value.bar;set(sliderPointer(localX(e),range.value,bar.pos!.x,bar.size!.x))}}
function up(e:PointerEvent){if(dragging){move(e);if(props.node.sliderStyle==='sfx')emit('sound','GUISpellRefresh')}else set(sliderPointer(localX(e),range.value,geometry.value.left,geometry.value.width));dragging=false;hit.value?.releasePointerCapture(e.pointerId)}
function key(e:KeyboardEvent){if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight')return;e.preventDefault();e.stopPropagation();set(control.value.value+(e.key==='ArrowRight'?1:-1)*(range.value[1]-range.value[0])/25);if(props.node.sliderStyle==='sfx')emit('sound','GUISpellRefresh')}
</script>
<template><NativeUiNode v-for="(child,index) in view.children" :key="index" :node="child" :images="images"/>
 <div ref="hit" class="native-slider-hit" :style="hitStyle" role="slider" tabindex="0" :aria-label="node.label??node.id" :aria-valuemin="range[0]" :aria-valuemax="range[1]" :aria-valuenow="pose.value" @pointerdown.stop="down" @pointermove.stop="move" @pointerup.stop="up" @pointercancel="dragging=false" @focus="focused=true" @blur="focused=false" @keydown="key"/>
 <div class="native-slider-knob-hit" :style="knobStyle" @pointerdown.stop="knobDown" @pointerenter="hover=true;emit('sound','GUIButtonHover')" @pointerleave="hover=false"/>
</template>
<style scoped>.native-slider-knob-hit,.native-slider-hit{position:absolute;pointer-events:auto;touch-action:none;cursor:pointer;outline:none}</style>
