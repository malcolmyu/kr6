<script setup lang="ts">
import {computed,ref} from 'vue'
import type {UiNode,UiPose,OutcomeArt} from './game/OutcomeAnimation'
const props=defineProps<{node:UiNode;poses:Record<string,UiPose>;data:OutcomeArt;victory:boolean;iron:boolean}>()
const emit=defineEmits<{action:[name:string]}>(),hovered=ref(false)
const pose=computed(()=>props.node.id?props.poses[props.node.id]:undefined)
const hidden=computed(()=>{const n=props.node;if(n.class==='GGExo'||n.id==='label_gems_amount'&&props.data.noGems)return true;if(n.id==='timeline_vd_modes_badge'&&!props.iron)return true;if(n.id==='group_mode_completed_txt'&&!props.victory||n.id==='group_mode_failed_txt'&&props.victory)return true;return pose.value?pose.value[6]:!!n.hidden})
const image=computed(()=>props.node.id==='image_mode_bagde'?`victory_defeat_mode_badges_${props.victory?'0001':'0003'}`:hovered.value&&props.node.focus_image_name?props.node.focus_image_name:props.node.default_image_name??props.node.image_name)
const label=computed(()=>props.node.class.includes('Label'))
const button=computed(()=>props.node.class.includes('Button'))
const text=computed(()=>props.node.id==='label_gems_amount'?'0':props.node.text)
const style=computed(()=>{
 const n=props.node,p=pose.value,x=p?.[0]??n.pos?.x??0,y=p?.[1]??n.pos?.y??0,sx=p?.[2]??n.scale?.x??1,sy=p?.[3]??n.scale?.y??1,a=p?.[4]??n.alpha??1,r=p?.[5]??n.r??0,anchor=n.anchor??{x:0,y:0},size=n.size??(image.value?props.data.images[image.value]:undefined)??{x:0,y:0},color=n.colors?.text??[255,255,255],font=n.font_name??''
 return {left:x+'px',top:y+'px',width:size.x+'px',height:size.y+'px',opacity:a,transform:`rotate(${r}rad) scale(${sx},${sy}) translate(${-anchor.x}px,${-anchor.y}px)`,fontSize:(n.font_size??20)*(font==='numbers_bold'?.97:1)+'px',fontFamily:font.includes('numbers')?'KingdomHudNumbers, sans-serif':font.includes('body')?'ComicBody, sans-serif':'KingdomChinese, sans-serif',fontWeight:font.includes('body')?'400':'700',color:`rgb(${color.slice(0,3).join(' ')})`,textAlign:(n.text_align??'center') as 'center'|'left',alignItems:n.vertical_align==='top'?'flex-start':'center'}
})
const bandStyle=computed(()=>{const args=props.node.shader_args?.find(a=>a.c1&&a.c2);if(!args)return undefined;const rgb=(v:unknown)=>(v as number[]).slice(0,3).map(c=>Math.round(c*255)).join(' ');return {backgroundImage:`linear-gradient(rgb(${rgb(args.c1)}) 50%,rgb(${rgb(args.c2)}) 50%)`,color:'transparent',backgroundClip:'text'}})
</script>
<template>
 <component :is="button?'button':'div'" v-if="!hidden" class="outcome-node" :class="{label,button}" :style="style" :data-outcome-node="node.id" :aria-label="button?(node.id==='button_vd_restart'?'重新挑战':'继续'):undefined" @pointerenter="hovered=true" @pointerleave="hovered=false" @click="button&&emit('action',node.id!)">
  <img v-if="image" :src="'assets/'+image+'.png'" alt=""/>
  <span v-if="label" :style="bandStyle">{{text}}</span>
  <OutcomeNode v-for="(child,index) in node.children" :key="index" :node="child" :poses="poses" :data="data" :victory="victory" :iron="iron" @action="emit('action',$event)"/>
 </component>
</template>
<style scoped>
.outcome-node{position:absolute;transform-origin:0 0;margin:0;padding:0;border:0;border-radius:0;background:transparent;box-shadow:none;pointer-events:none}.outcome-node img{display:block;width:100%;height:100%;max-width:none;pointer-events:none}.outcome-node.label{display:flex;line-height:1.05;white-space:pre-wrap;overflow-wrap:anywhere}.outcome-node.label>span{width:100%;filter:drop-shadow(0 0 1px #332e1a)}.outcome-node.button{pointer-events:auto;cursor:pointer}.outcome-node.button:focus-visible{outline:2px solid #ffe38d;outline-offset:-8px}
</style>
