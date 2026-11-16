<script setup lang="ts">
import {computed,ref} from 'vue'
import type {IncomingWave} from './game/WaveRunner'
import type {Point} from './game/types'
export interface WaveEntrance {path:number;pos:Point;r:number}
const props=defineProps<{incoming:IncomingWave;entrances:WaveEntrance[];project:(p:Point)=>Point;time:number;scale:number;zoom:number;confirm:boolean;disabled:boolean;muted?:boolean}>()
const emit=defineEmits<{call:[]}>(),hovered=ref<number>()
const flags=computed(()=>{const found=props.entrances.filter(e=>props.incoming.paths.includes(e.path));return found.length?found:props.entrances.slice(0,1)})
const pulse=computed(()=>(.85+.15*(.5*Math.sin(2*Math.PI*Math.max(0,props.time-props.incoming.startsAt)*1.25)+1))*props.zoom*props.scale)
const circleStyle=computed(()=>{const fill=props.incoming.duration>0?1-props.incoming.remaining/props.incoming.duration:1;return {maskImage:`conic-gradient(#000 0deg ${Math.max(0,Math.min(1,fill))*360}deg,transparent 0deg)`}})
function position(flag:WaveEntrance){const point=props.project(flag.pos);return {left:point.x+'%',top:point.y+'%',transform:`translate(-50%,-50%) scale(${pulse.value})`}}
</script>
<template>
  <div class="wave-flags" aria-label="敌军入口" :style="{opacity:muted?0.2:1}">
    <div v-for="(flag,index) in flags" :key="flag.path" class="wave-flag" :style="position(flag)" :data-wave-flag="flag.path">
      <img v-show="hovered===flag.path||confirm" class="halo" src="/assets/waveFlag_selected.png" alt=""/>
      <img class="circle" src="/assets/waveFlag_0003.png" alt="" :style="circleStyle"/>
      <img class="pointer" src="/assets/waveFlag_0004.png" alt="" :style="{transform:`rotate(${flag.r}rad)`}"/>
      <img class="icon" :src="incoming.flyingPaths?.includes(flag.path)?'/assets/waveFlag_0002.png':'/assets/waveFlag_0001.png'" alt=""/>
      <button class="next-wave wave-hit" :disabled="disabled" :aria-label="index===0?(confirm?'确认出击':incoming.number===1?'开始战斗':'下一波'):`敌军入口 ${flag.path}`" :title="incoming.number===1?'召唤第一波':`提前召唤：${Math.floor(incoming.remaining+.5)} 金币`" @pointerenter="hovered=flag.path" @pointerleave="hovered=undefined" @click="emit('call')"/>
    </div>
  </div>
</template>
<style scoped>
.wave-flags{position:absolute;inset:0;pointer-events:none;z-index:6}.wave-flag{position:absolute;width:71.5px;height:71.5px;transform-origin:50% 50%;pointer-events:none}.wave-flag img{position:absolute;pointer-events:none}.halo{inset:0;width:71.5px;height:71.5px}.circle,.icon{left:10.75px;top:10.75px;width:50px;height:50px}.pointer{left:39.75px;top:10.75px;width:50px;height:50px;transform-origin:-4px 25px}
.wave-flag .wave-hit{position:absolute;left:9.5px;top:9.5px;right:auto;bottom:auto;width:47.5px;height:47.5px;padding:0;border:0;box-shadow:none;background:transparent;border-radius:50%;pointer-events:auto}.wave-hit:disabled{cursor:default}
</style>
