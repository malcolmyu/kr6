<script setup lang="ts">
import {computed,onMounted,onBeforeUnmount,ref,watch} from 'vue'
import {powerCooldownPhase} from './game/PowerCooldown'
import {guiLayout} from './game/GuiLayout'
import type {HudData} from './GameHud.vue'
import type {PowerKind} from './game/PowerSystem'
export interface HeroPortrait {id:number;name:string;image:number;hp:number;maxHp:number;level:number;xpFraction?:number;selected:boolean}
export interface PowerPortrait {kind:PowerKind;name:string;remaining:number;cooldown:number;level:number;xpFraction:number;selected:boolean;locked:boolean}
const props=defineProps<{data:HudData;heroes:HeroPortrait[];powers:PowerPortrait[];disabled:boolean;time:number}>()
const emit=defineEmits<{hero:[id:number];power:[kind:PowerKind]}>()
const root=ref<HTMLElement>(),size=ref({width:1365.333,height:768}),hover=ref('')
let observer:ResizeObserver|undefined
onMounted(()=>{observer=new ResizeObserver(entries=>{const r=entries[0].contentRect;size.value={width:r.width,height:r.height}});observer.observe(root.value!)})
onBeforeUnmount(()=>observer?.disconnect())
const layout=computed(()=>guiLayout(size.value.width,size.value.height))
const plane=computed(()=>({left:layout.value.origin.x+'px',top:layout.value.origin.y+'px',width:layout.value.sw+'px',height:layout.value.sh+'px',transform:`scale(${layout.value.scale})`}))
const heroX=computed(()=>layout.value.safe.lb-18+90*.6)
const heroRight=computed(()=>heroX.value+(props.heroes.length?(props.heroes.length-1)*110+133:0)*.6)
const powerX=computed(()=>heroRight.value+6.909)
const backgroundWidth=computed(()=>Math.max(210,((props.powers.length?powerX.value+((props.powers.length-1)*100+100.5)*.588:heroRight.value)+54-(layout.value.safe.lb-18))/.6))
const unlocks=new Map<PowerKind,number>()
watch(()=>props.powers.map(p=>[p.kind,p.locked] as const),(next,prev)=>{for(const [kind,locked] of next)if(!locked && prev?.find(p=>p[0]===kind)?.[1])unlocks.set(kind,props.time)})
function door(p:PowerPortrait){if(p.locked)return 1;const at=unlocks.get(p.kind);if(at===undefined)return 0;const frame=Math.floor((props.time-at)*30)+1;return frame<=13?frame:0}
function image(name:string,x=0,y=0){const s=props.data.images[name];return {left:x+'px',top:y+'px',width:s.x+'px',height:s.y+'px'}}
function key(event:KeyboardEvent){if(event.repeat || props.disabled || /INPUT|TEXTAREA|SELECT/.test((event.target as HTMLElement)?.tagName))return;const number=Number(event.key);if(number>=1&&number<=props.powers.length){event.preventDefault();const p=props.powers[number-1];if(!p.locked&&p.remaining<=0)emit('power',p.kind)}}
onMounted(()=>window.addEventListener('keydown',key));onBeforeUnmount(()=>window.removeEventListener('keydown',key))
</script>
<template>
<div ref="root" class="native-bottom"><div class="bottom-plane" :style="plane">
  <div class="bar-background" :style="{left:(layout.safe.lb-18)+'px',top:(layout.sh-layout.safe.bl-90)+'px',width:backgroundWidth+'px',height:'262px',transform:'scale(.6)'}"></div>
  <button v-for="(hero,index) in heroes" :key="hero.id" class="hero-portrait" :data-hero="hero.name" :aria-label="hero.name" :aria-pressed="hero.selected" :disabled="disabled||hero.hp<=0" :style="{left:(heroX+index*66)+'px',top:(layout.sh-layout.safe.bl-78)+'px',width:'124px',height:'142px',transform:'scale(.6)'}" @pointerenter="hover=hero.name" @pointerleave="hover=''" @click="emit('hero',hero.id)">
    <img :style="image('ingame_ui_gui_portraits_hero_bg')" src="/assets/ingame_ui_gui_portraits_hero_bg.png" alt=""/>
    <img v-if="hover===hero.name" :style="image('ingame_ui_gui_portraits_hero_bg_hover')" src="/assets/ingame_ui_gui_portraits_hero_bg_hover.png" alt=""/>
    <img :style="image('hero_portraits_000'+hero.image,-7,-22)" :src="'assets/hero_portraits_'+(hero.hp>0?'':'disabled_')+'000'+hero.image+'.png'" alt=""/>
    <img :style="{...image('ingame_ui_hero_portrait_bars_0001',47.7,104),transform:`scaleX(${Math.max(0,hero.hp/hero.maxHp)})`}" src="/assets/ingame_ui_hero_portrait_bars_0001.png" alt=""/>
    <img class="hero-xp" :style="{...image('ingame_ui_hero_portrait_bars_0002',47.7,115),transform:`scaleX(${hero.xpFraction??0})`}" src="/assets/ingame_ui_hero_portrait_bars_0002.png" alt=""/>
    <span class="hero-level">{{hero.level}}</span>
    <img v-if="hero.selected" :style="image('hero_portraits_selected_000'+hero.image,-7,-22)" :src="'assets/hero_portraits_selected_000'+hero.image+'.png'" alt=""/>
  </button>
  <div class="powers" aria-label="战斗技能">
    <button v-for="(power,index) in powers" :key="power.kind" class="power-portrait" :data-power="power.kind" :aria-label="power.name" :aria-pressed="power.selected" :disabled="disabled||power.locked||power.remaining>0" :style="{left:(powerX+index*58.8)+'px',top:(layout.sh-layout.safe.bl-64.68)+'px',width:'77px',height:'77px',transform:'scale(.588)'}" @pointerenter="hover=power.kind" @pointerleave="hover=''" @click="emit('power',power.kind)">
      <img :style="image('in_game_icon_power_'+power.kind)" :src="'assets/in_game_icon_power_'+power.kind+'.png'" alt=""/>
      <img v-if="hover===power.kind&&!power.locked&&!power.remaining" :style="image('ingame_ui_power_button_frame_active_hover',-29.5,-40)" src="/assets/ingame_ui_power_button_frame_active_hover.png" alt=""/>
      <img v-if="power.locked" :style="image('ingame_ui_power_loading',-4.5,-10)" src="/assets/ingame_ui_power_loading.png" alt=""/>
      <img v-if="power.remaining>0" data-power-cooldown :data-cooldown="power.cooldown" :style="{...image('ingame_ui_power_loading',-4.5,-9),clipPath:`inset(${powerCooldownPhase(power.remaining,power.cooldown)*100}% 0 0 0)`}" src="/assets/ingame_ui_power_loading.png" alt=""/>
      <img v-if="door(power)" :style="image('ingame_ui_power_button_doors_0001',-1.5,-8)" :src="'assets/ingame_ui_power_button_doors_'+String(door(power)).padStart(4,'0')+'.png'" alt=""/>
      <img :style="image('ingame_ui_power_button_frame_inactive',-21.5,-40)" src="/assets/ingame_ui_power_button_frame_inactive.png" alt=""/>
      <img v-if="power.selected" :style="image('ingame_ui_power_button_frame_select',-21.5,-37)" src="/assets/ingame_ui_power_button_frame_select.png" alt=""/>
      <img :style="image('ingame_ui_power_button_input_frame',15,0)" src="/assets/ingame_ui_power_button_input_frame.png" alt=""/><span class="power-key">{{index+1}}</span>
      <img data-power-xp :style="{...image('ingame_ui_hero_portrait_bars_0002',25.7,90),transform:`scaleX(${power.xpFraction})`}" src="/assets/ingame_ui_hero_portrait_bars_0002.png" alt=""/>
      <span class="power-level" data-power-level>{{power.level}}</span>
    </button>
  </div>
</div></div>
</template>
<style scoped>
.native-bottom{position:absolute;inset:0;pointer-events:none;z-index:6;overflow:hidden}.bottom-plane{position:absolute;transform-origin:0 0}.bar-background{position:absolute;transform-origin:0 0;display:flex}.bar-background{box-sizing:border-box;border-style:solid;border-width:0 100px;border-image:url(/assets/ingame_ui_gui_bottom_bar_DESKTOP.png) 0 200 fill stretch}.hero-portrait,.power-portrait{position:absolute;transform-origin:0 0;pointer-events:auto;padding:0;margin:0;border:0;border-radius:0;background:none;box-shadow:none;color:white}.hero-portrait img,.power-portrait img{position:absolute;max-width:none;transform-origin:0 0;pointer-events:none}.hero-level,.power-key,.power-level{position:absolute;display:block;font-family:KingdomHudNumbers,sans-serif;font-weight:400;line-height:19.2px;text-align:center;text-shadow:1px 1px #000,-1px -1px #000;width:28.8px;height:19.2px}.power-level{left:-2px;top:81.5px;font-size:16px}.hero-level{left:19px;top:100px;font-size:16px}.power-key{left:25px;top:62px;font-size:10.5px}
</style>
