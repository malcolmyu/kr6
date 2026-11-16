<script setup lang="ts">
import {computed,ref} from 'vue'
import {buttonHalo} from './game/NativeButton'
import NativeSlider from './NativeSlider.vue'
import NativeNineSlice from './NativeNineSlice.vue'
import type {UiNode,UiPose} from './game/OutcomeAnimation'
import type {Point} from './game/types'
export interface NativeUiNode extends UiNode {control?:{value:number;range?:[number,number];muted?:boolean};sliderStyle?:string;animation?:{prefix:string;from:number;to:number};animation_at?:number;loop?:boolean;overdraw_sides?:boolean;slice_rect?:{pos:Point;size:Point};image_offset?:Point;hit_rect?:{pos:Point;size:Point};action?:string;label?:string;disabled?:boolean;focus_image_order?:number;children?:NativeUiNode[]}
const props=defineProps<{node:NativeUiNode;images:Record<string,Point>;poses?:Record<string,UiPose>;age?:number}>(),emit=defineEmits<{action:[name:string];change:[id:string,value:number];sound:[name:string]}>(),hover=ref(false),focused=ref(false)
const pose=computed(()=>props.node.id?props.poses?.[props.node.id]:undefined)
const hidden=computed(()=>props.node.hidden||pose.value?.[6])
const animationImage=computed(()=>{const n=props.node,a=n.animation;if(!a)return;const frames=a.to-a.from+1,frame=Math.max(0,Math.floor(((props.age??0)-(n.animation_at??0))*30+1e-9));const name=a.prefix+'_'+String(a.from+(n.loop?frame%frames:Math.min(frame,frames-1))).padStart(4,'0');return props.images[name]?name:undefined})
const halo=computed(()=>props.node.class==='GG5Button'&&(hover.value||focused.value)&&!props.node.disabled?props.node.focus_image_name:undefined)
const image=computed(()=>animationImage.value??(props.node.class!=='GG5Button'&&hover.value&&props.node.focus_image_name?props.node.focus_image_name:props.node.image_name??props.node.default_image_name))
const haloStyle=computed(()=>{const image=props.images[halo.value??'']??{x:0,y:0},pose=buttonHalo(size.value,image,props.node.image_offset);return{left:pose.pos.x+'px',top:pose.pos.y+'px',width:image.x+'px',height:image.y+'px'}})
const label=computed(()=>props.node.class.includes('Label')),button=computed(()=>!!props.node.action)
const textFill=computed(()=>{const {filter,webkitTextStroke,paintOrder,...fill}=props.node.text_style??{};return fill})
const textFilter=computed(()=>props.node.text_style?.filter?{filter:props.node.text_style.filter}:undefined)
const textOutline=computed(()=>{const stroke=props.node.text_style?.webkitTextStroke;if(!stroke)return;return {webkitTextStroke:stroke,webkitTextFillColor:stroke.slice(stroke.indexOf('px')+3)}})
const size=computed(()=>props.node.size??props.images[image.value??'']??{x:0,y:0})
const style=computed(()=>{
 const n=props.node,p=pose.value,a=n.anchor??{x:0,y:0},font=n.font_name??'',color=n.colors?.text??[255,255,255]
 return {transition:n.transition,backgroundColor:n.background_color?`rgba(${n.background_color.slice(0,3).join(',')},${(n.background_color[3]??255)/255})`:undefined,left:(p?.[0]??n.pos?.x??0)+'px',top:(p?.[1]??n.pos?.y??0)+'px',width:size.value.x+'px',height:size.value.y+'px',opacity:p?.[4]??n.alpha??1,transform:`rotate(${p?.[5]??n.r??0}rad) scale(${p?.[2]??n.scale?.x??1},${p?.[3]??n.scale?.y??1}) translate(${-a.x}px,${-a.y}px)`,fontSize:(n.font_size??20)+'px',fontFamily:n.font_family??(font.includes('numbers')?'KingdomHudNumbers,sans-serif':font.includes('body')?'ComicBody,sans-serif':'KingdomChinese,sans-serif'),fontWeight:font.includes('body')?'400':'700',color:`rgb(${color.slice(0,3).join(' ')})`,textAlign:(n.text_align??'center') as 'center'|'left',alignItems:n.vertical_align==='top'?'flex-start':'center'}
})
const artStyle=computed(()=>{const n=props.node,frame=props.images[image.value??''],offset=n.image_offset??{x:0,y:0};return{filter:n.colors?.tint&&n.colors.tint[0]===n.colors.tint[1]&&n.colors.tint[1]===n.colors.tint[2]?`brightness(${n.colors.tint[0]/255})`:undefined,left:offset.x+'px',top:offset.y+'px',width:(frame?.x??size.value.x)+'px',height:(frame?.y??size.value.y)+'px'}})
const hitStyle=computed(()=>{const hit=props.node.hit_rect??{pos:{x:0,y:0},size:size.value};return{left:hit.pos.x+'px',top:hit.pos.y+'px',width:hit.size.x+'px',height:hit.size.y+'px'}})
</script>
<template>
 <div v-if="!hidden" class="native-ui-node" :class="{label}" :style="style" :data-ui-node="node.id">
  <img v-if="halo&&node.focus_image_order===1" class="native-ui-art native-ui-halo" :style="haloStyle" :src="'assets/'+halo+'.png'" alt=""/>
  <NativeNineSlice v-if="image&&node.slice_rect" :name="image" :size="size" :image-size="images[image]" :slice="node.slice_rect" :overdraw="node.overdraw_sides"/>
  <img v-else-if="image" class="native-ui-art" :style="artStyle" :src="'assets/'+image+'.png'" alt=""/>
  <img v-if="halo&&node.focus_image_order!==1" class="native-ui-art native-ui-halo" :style="haloStyle" :src="'assets/'+halo+'.png'" alt=""/>
  <span v-if="label" class="native-ui-text" :style="textFilter"><span v-if="textOutline" class="native-ui-text-outline" aria-hidden="true" :data-text="node.text" :style="textOutline"/><span class="native-ui-text-fill" :style="textFill">{{node.text}}</span></span>
  <button v-if="button" class="native-ui-hit" :style="hitStyle" :aria-label="node.label??node.id" :disabled="node.disabled" @focus="focused=true" @blur="focused=false" @pointerenter="hover=true" @pointerleave="hover=false" @click.stop="emit('action',node.action!)"/>
  <NativeSlider v-if="node.class==='GG5Slider'&&node.control" :node="node" :images="images" @change="(id,value)=>emit('change',id,value)" @sound="emit('sound',$event)"/>
  <NativeUiNode v-else v-for="(child,index) in node.children" :key="index" :node="child" :images="images" :poses="poses" :age="age" @action="emit('action',$event)" @change="(id,value)=>emit('change',id,value)" @sound="emit('sound',$event)"/>
 </div>
</template>
<style scoped>
.native-ui-node{position:absolute;transform-origin:0 0;margin:0;padding:0;pointer-events:none}.native-ui-art{position:absolute;max-width:none;pointer-events:none}.native-ui-node.label{display:flex;white-space:pre-wrap;line-height:1.05;overflow-wrap:anywhere}.native-ui-node.label>.native-ui-text{position:relative;width:100%;filter:drop-shadow(0 1px 1px #332e1a)}.native-ui-text-outline{position:absolute;inset:0}.native-ui-text-outline::before{content:attr(data-text)}.native-ui-text-fill{position:relative;display:block}.native-ui-hit{position:absolute;pointer-events:auto;appearance:none;background:transparent;border:0;border-radius:0;padding:0;margin:0;box-shadow:none;cursor:pointer}.native-ui-hit:focus-visible{outline:2px solid #ffe38d}.native-ui-hit:disabled{cursor:default}
</style>
