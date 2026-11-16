<script setup lang="ts">
import {computed,onMounted,onBeforeUnmount,ref,shallowRef} from 'vue'
import NativeUiNode from './NativeUiNode.vue'
import {powerRoomView,powerRoomStats,powerRoomPoses,powerRoomBackdrop} from './game/PowerRoom'
import type {PowerRoomArt,PowerRoomPickMotion} from './game/PowerRoom'
import type {Progress} from './game/ProgressStore'
import type {PowerKind} from './game/PowerSystem'
import {activatePowerUpgrade} from './game/PowerUpgrades'
import {equippedPowers,powerUnlocked} from './game/NativeProgression'
import {preloadNativeImages} from './game/NativeImageCache'
const props=defineProps<{progress:Progress}>(),emit=defineEmits<{close:[];purchase:[kind:PowerKind,nodes:string[]];equip:[kind:PowerKind,slot:number];sound:[name:string]}>()
const data=shallowRef<PowerRoomArt>(),kind=ref<string>(equippedPowers(props.progress)[0]??'reinforcements'),page=ref<'main'|'tree'>('main'),focus=ref<string>(),picking=ref(false),age=ref(0),error=ref(''),viewport=ref({w:innerWidth,h:innerHeight}),purchases=ref<{id:string;at:number}[]>([])
const timers:ReturnType<typeof setTimeout>[]=[],stats=computed(()=>data.value?powerRoomStats(data.value,props.progress,kind.value):undefined)
const pickMotion=ref<PowerRoomPickMotion>(),returning=ref(false),sequence=ref<'anim_in'|'upgrades_in'|'upgrades_out'>('anim_in')
const viewportScale=computed(()=>Math.min(viewport.value.w/1365.333333,viewport.value.h/768)),frame=computed(()=>({width:viewport.value.w/viewportScale.value,height:viewport.value.h/viewportScale.value})),backdrop=computed(()=>data.value?powerRoomBackdrop(data.value,frame.value):undefined)
const view=computed(()=>data.value?powerRoomView(data.value,props.progress,kind.value,returning.value?'tree':page.value,focus.value,picking.value,purchases.value,!!pickMotion.value,frame.value):undefined),poses=computed(()=>data.value?powerRoomPoses(data.value,age.value,page.value,pickMotion.value,sequence.value,frame.value):{}),scale=computed(()=>viewportScale.value*(data.value?.scale??.48))
let handle=0,previous=0,disposed=false
function pick(active:boolean){picking.value=active;pickMotion.value={at:age.value,active,angles:active?Array.from({length:3},()=>1+Math.floor(Math.random()*4)):pickMotion.value?.angles??[1,1,1]}}
function changePage(next:'main'|'tree'){returning.value=next==='main'&&page.value==='tree';sequence.value=returning.value?'upgrades_out':next==='tree'?'upgrades_in':'anim_in';if(returning.value)timers.push(setTimeout(()=>returning.value=false,200));page.value=next;focus.value=undefined;picking.value=false;pickMotion.value=undefined;age.value=0;previous=0;purchases.value=[]}
function back(){if(picking.value){pick(false);emit('sound','GUIButtonOut')}else if(page.value==='tree'){changePage('main');emit('sound','GUIButtonOut')}else{emit('sound','GUIButtonOut');emit('close')}}
function action(name:string){
 if(name==='back'){back();return}
 if(name==='upgrades'){emit('sound','GUIButtonCommon');changePage('tree');return}
 if(name==='reset'){if(stats.value?.unlocked){emit('purchase',kind.value as PowerKind,[]);focus.value=undefined;emit('sound','GUIResetUpgrade')}return}
 if(name==='equip'){if(powerUnlocked(props.progress,kind.value)&&!equippedPowers(props.progress).includes(kind.value as PowerKind)){pick(true);focus.value=undefined;emit('sound','GUIButtonCommon')}return}
 if(name==='cancel-equip'){pick(false);emit('sound','GUIButtonOut');return}
 if(name.startsWith('slot:')){if(picking.value){emit('equip',kind.value as PowerKind,Number(name.slice(5)));pick(false);emit('sound','GUIHeroTowerSelect');const taunt=data.value?.units[kind.value].taunt;if(taunt)emit('sound',taunt)}return}
 if(picking.value)return
 if(name.startsWith('power:')){kind.value=name.slice(6);focus.value=undefined;purchases.value=[];emit('sound','GUIHeroScroll');return}
 if(name.startsWith('preview:')){focus.value=focus.value===name.slice(8)?undefined:name.slice(8);emit('sound','GUIHeroSkillSelect');return}
 if(!name.startsWith('skill:'))return
 const id=name.slice(6)
 if(focus.value!==id){focus.value=id;emit('sound','GUIHeroSkillSelect');return}
 if(!stats.value?.unlocked){emit('sound','GUIHeroSkillSelect');return}
 const old=stats.value.selected,next=activatePowerUpgrade(kind.value as PowerKind,stats.value.xp,old,id)
 if(next!==old){const fx={id,at:age.value};purchases.value.push(fx);timers.push(setTimeout(()=>purchases.value=purchases.value.filter(p=>p!==fx),600));emit('purchase',kind.value as PowerKind,next);emit('sound','GUIBuyUpgrade')}else emit('sound','GUIHeroSkillSelect')
}
function resize(){viewport.value={w:innerWidth,h:innerHeight}}
function key(e:KeyboardEvent){if(e.key==='Escape'){e.stopPropagation();back()}}
function tick(now:number){age.value+=previous?Math.min(.1,(now-previous)/1000):0;previous=now;handle=requestAnimationFrame(tick)}
onMounted(async()=>{addEventListener('resize',resize);addEventListener('keydown',key);try{const response=await fetch('/data/power-room.json');if(!response.ok)throw Error('法术房间载入失败');const art=await response.json();await preloadNativeImages(Object.keys(art.images).map(name=>'/assets/'+name+'.png'));if(!disposed){data.value=art;handle=requestAnimationFrame(tick)}}catch(e){error.value=String(e)}})
onBeforeUnmount(()=>{disposed=true;timers.forEach(clearTimeout);cancelAnimationFrame(handle);removeEventListener('resize',resize);removeEventListener('keydown',key)})
</script>
<template>
 <section class="native-power-room" role="dialog" aria-label="法术房间" :data-power="kind" :data-page="page" :data-points="stats?.points" :data-picking="picking">
  <div v-if="backdrop&&data" class="room-backdrop" :style="{width:frame.width+'px',height:frame.height+'px',transform:`translate(-50%,-50%) scale(${viewportScale})`}"><NativeUiNode :node="backdrop" :images="data.images"/></div>
  <div class="room-paper" :style="{transform:`translate(-50%,-50%) scale(${scale})`}"><NativeUiNode v-if="view&&data" :node="view" :images="data.images" :poses="poses" :age="age" @action="action"/></div>
  <p v-if="error" role="alert">{{error}}</p>
 </section>
</template>
<style scoped>
.native-power-room{position:fixed;inset:0;z-index:70;overflow:hidden}.room-paper,.room-backdrop{position:absolute;left:50%;top:50%;transform-origin:center}.room-paper{width:1365.333333px;height:768px}.native-power-room>p{position:absolute;inset:45% 0 auto;text-align:center;color:white}
</style>
