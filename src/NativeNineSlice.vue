<script setup lang="ts">
import {onMounted,onBeforeUnmount,ref,watch} from 'vue'
import {nineSliceDraws} from './game/NineSlice'
import type {SliceRect} from './game/NineSlice'
import type {Point} from './game/types'
const props=defineProps<{name:string;size:Point;imageSize:Point;slice:SliceRect;overdraw?:boolean}>(),canvas=ref<HTMLCanvasElement>()
let generation=0,disposed=false
async function draw(){
 const current=++generation,image=new Image();image.src='assets/'+props.name+'.png';await image.decode()
 if(disposed||current!==generation||!canvas.value)return
 const c=canvas.value;c.width=Math.max(1,Math.ceil(props.size.x*2));c.height=Math.max(1,Math.ceil(props.size.y*2));const context=c.getContext('2d')!;context.clearRect(0,0,c.width,c.height)
 for(const part of nineSliceDraws(props.imageSize,props.size,props.slice,props.overdraw))if(part.source[2]!==0&&part.source[3]!==0&&part.destination[2]!==0&&part.destination[3]!==0)context.drawImage(image,...part.source,...part.destination)
}
onMounted(()=>void draw());watch(()=>[props.name,props.size.x,props.size.y,props.slice,props.overdraw],()=>void draw());onBeforeUnmount(()=>{disposed=true;generation++})
</script>
<template><canvas ref="canvas" style="position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none"/></template>
