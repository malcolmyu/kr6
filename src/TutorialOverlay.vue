<script setup lang="ts">
import type {Point} from './game/types'
import type {TutorialBalloon} from './game/TutorialState'
export interface BalloonConfig {localized_text:string;flags:string;size:Point;padding:Point;bg_color:number[];text_color:number[];line_color?:number[]}
const props=defineProps<{balloon?:TutorialBalloon;focus?:Point;balloons:Record<string,BalloonConfig>;project:(p:Point)=>Point;viewportHeight:number;focusSettings:{radius:number;inner:number;maxAlpha:number}}>()
function place(pos:Point){const p=props.project(pos);return {left:`${p.x}%`,top:`${p.y}%`}}
function style() {
  const config=props.balloons[props.balloon!.id]
  if(!config)return {}
  const flags=config.flags,rgba=(c:number[])=>`rgba(${c[0]},${c[1]},${c[2]},${(c[3]??255)/255})`
  return {...(props.balloon!.pos?place(props.balloon!.pos):{left:'18%',top:'88%'}),background:rgba(config.bg_color),color:rgba(config.text_color),width:`${config.size.x+config.padding.x*2}px`,border:config.line_color?`2px solid ${rgba(config.line_color)}`:'none',transform:flags.includes('self-al-right-middle')?'translate(-100%,-50%)':flags.includes('self-al-left-middle')?'translate(0,-50%)':'translate(-50%,-100%)'}
}
function spotlight() {
  const p=props.project(props.focus!),radius=props.viewportHeight*props.focusSettings.radius
  return {background:`radial-gradient(circle at ${p.x}% ${p.y}%,rgba(0,0,0,0) ${radius*props.focusSettings.inner}px,rgba(0,0,0,${props.focusSettings.maxAlpha}) ${radius}px)`}
}
</script>
<template>
  <div class="tutorial-overlay" aria-live="polite">
    <Transition name="focus-mask"><div v-if="focus" :key="`${focus.x},${focus.y}`" class="tutorial-spotlight" :style="spotlight()"/></Transition>
    <div v-if="focus" class="tutorial-focus" :style="place(focus)"/>
    <div v-if="balloon && balloons[balloon.id]" class="tutorial-balloon" :class="{dialog:balloons[balloon.id].flags.includes('dialog')}" :style="style()">{{balloons[balloon.id].localized_text}}</div>
  </div>
</template>
<style scoped>
.tutorial-overlay{position:absolute;inset:0;pointer-events:none}.tutorial-spotlight{position:absolute;inset:0;z-index:2}.tutorial-focus{position:absolute;width:1px;height:1px;transform:translate(-50%,-50%)}.tutorial-balloon{position:absolute;z-index:12;border-radius:9px;padding:16px 24px;max-width:60%;text-align:center;font-size:clamp(12px,1.4vw,21px);line-height:1.4;text-shadow:1px 2px #0008}.tutorial-balloon.dialog{box-shadow:3px 4px #0006;text-shadow:none}.tutorial-balloon.dialog:after{content:'';position:absolute;left:28px;bottom:-10px;width:16px;height:16px;background:inherit;border-right:2px solid #000;border-bottom:2px solid #000;transform:rotate(45deg)}.focus-mask-enter-active{animation:focus-in .6s linear}.focus-mask-leave-active{animation:focus-out .6s linear}@keyframes focus-in{0%{opacity:0}70%,100%{opacity:1}}@keyframes focus-out{0%,30%{opacity:1}100%{opacity:0}}
</style>
