<script setup lang="ts">
import {computed,onMounted,onBeforeUnmount,ref,shallowRef} from 'vue'
import NativeUiNode from './NativeUiNode.vue'
import {heroRoomPoses,heroRoomView} from './game/HeroRoom'
import type {HeroRoomArt} from './game/HeroRoom'
import type {Progress} from './game/ProgressStore'
import {heroLevel} from './game/HeroProgression'
import {effectiveHeroXp} from './game/HeroTeam'
import {heroUpgradeData,purchaseHeroUpgrade,remainingHeroPoints} from './game/HeroUpgrades'
const props=defineProps<{progress:Progress}>(),emit=defineEmits<{close:[];purchase:[hero:string,nodes:string[]];sound:[name:string]}>()
const purchases=ref<{id:string;at:number}[]>([]),purchaseTimers:ReturnType<typeof setTimeout>[]=[]
const data=shallowRef<HeroRoomArt>(),hero=ref('hero_gerald'),focus=ref<string>(),age=ref(0),error=ref(''),viewport=ref({w:innerWidth,h:innerHeight})
let handle=0,previous=0,disposed=false
const xp=computed(()=>effectiveHeroXp(props.progress,hero.value)),nodes=computed(()=>props.progress.heroUpgrades?.[hero.value]??[])
const view=computed(()=>data.value?heroRoomView(data.value,hero.value,xp.value,nodes.value,focus.value,purchases.value):undefined)
const poses=computed(()=>data.value?heroRoomPoses(data.value,age.value):{}),scale=computed(()=>Math.min(viewport.value.w/1365.333333,viewport.value.h/768)*(data.value?.scale??.48))
const points=computed(()=>remainingHeroPoints(heroUpgradeData,hero.value,xp.value,nodes.value))
function action(name:string){
 if(name==='close'){emit('sound','GUIButtonCommon');emit('close');return}
 if(name==='reset'){focus.value=undefined;emit('purchase',hero.value,[]);emit('sound','GUIResetUpgrade');return}
 if(name.startsWith('hero:')){hero.value=name.slice(5);focus.value=undefined;emit('sound','GUIHeroScroll');return}
 if(!name.startsWith('skill:'))return
 const id=name.slice(6)
 if(focus.value!==id){focus.value=id;emit('sound','GUIHeroSkillSelect');return}
 const next=purchaseHeroUpgrade(heroUpgradeData,hero.value,xp.value,nodes.value,id)
 if(next!==nodes.value){const fx={id,at:age.value};purchases.value.push(fx);purchaseTimers.push(setTimeout(()=>{purchases.value=purchases.value.filter(p=>p.id!==fx.id||p.at!==fx.at)},600));emit('purchase',hero.value,next);focus.value=undefined;emit('sound','GUIBuyUpgrade')}else emit('sound','GUIHeroSkillSelect')
}
function resize(){viewport.value={w:innerWidth,h:innerHeight}}
function tick(now:number){age.value+=previous?Math.min(.1,(now-previous)/1000):0;previous=now;handle=requestAnimationFrame(tick)}
function key(e:KeyboardEvent){if(e.key==='Escape')emit('close')}
onMounted(async()=>{addEventListener('resize',resize);addEventListener('keydown',key);try{const response=await fetch('data/hero-room.json');if(!response.ok)throw Error('英雄房间载入失败');data.value=await response.json();if(!disposed){for(let index=1;index<=18;index++){const image=new Image();image.src='assets/room_tower_animation_upgrade_select_fx_'+String(index).padStart(4,'0')+'.png'}handle=requestAnimationFrame(tick)}}catch(e){error.value=String(e)}})
onBeforeUnmount(()=>{disposed=true;purchaseTimers.forEach(clearTimeout);cancelAnimationFrame(handle);removeEventListener('resize',resize);removeEventListener('keydown',key)})
</script>
<template>
 <section class="native-hero-room" role="dialog" aria-label="英雄技能" :data-hero="hero" :data-points="points" :data-xp="xp" :data-level="heroLevel(xp)">
  <div class="room-paper" :style="{transform:`translate(-50%,-50%) scale(${scale})`}"><NativeUiNode v-if="view&&data" :node="view" :images="data.images" :poses="poses" :age="age" @action="action"/></div>
  <p v-if="error" role="alert">{{error}}</p>
 </section>
</template>
<style scoped>
.native-hero-room{position:fixed;inset:0;background:#0009;z-index:70;overflow:hidden}.room-paper{position:absolute;left:50%;top:50%;width:1365.333333px;height:768px;transform-origin:center}.native-hero-room>p{position:absolute;inset:45% 0 auto;text-align:center;color:white}
</style>
