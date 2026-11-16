<script setup lang="ts">
import {computed,onMounted,onBeforeUnmount,ref,shallowRef} from 'vue'
import NativeUiNode from './NativeUiNode.vue'
import {globalRoomView,globalRoomPoses} from './game/GlobalRoom'
import type {GlobalRoomArt,GlobalRoomFocus,GlobalRoomPurchase} from './game/GlobalRoom'
import {powerRoomBackdrop} from './game/PowerRoom'
import type {Progress} from './game/ProgressStore'
import {activateGlobalUpgrade,globalUpgradePoints,globalUpgradeSpent} from './game/GlobalUpgrades'
import type {GlobalUpgradeKind,GlobalUpgradeSelection} from './game/GlobalUpgrades'
import {preloadNativeImages} from './game/NativeImageCache'
const props=defineProps<{progress:Progress}>(),emit=defineEmits<{close:[];purchase:[selected:GlobalUpgradeSelection];sound:[name:string]}>()
const data=shallowRef<GlobalRoomArt>(),focus=ref<GlobalRoomFocus>(),purchases=ref<GlobalRoomPurchase[]>([]),age=ref(0),closing=ref(false),error=ref(''),viewport=ref({w:innerWidth,h:innerHeight})
const points=computed(()=>globalUpgradePoints(props.progress)-globalUpgradeSpent(props.progress.globalUpgrades??{})),viewportScale=computed(()=>Math.min(viewport.value.w/1365.333333,viewport.value.h/768)),frame=computed(()=>({width:viewport.value.w/viewportScale.value,height:viewport.value.h/viewportScale.value})),scale=computed(()=>viewportScale.value*(data.value?.scale??.48))
const view=computed(()=>data.value?globalRoomView(data.value,props.progress,focus.value,purchases.value,closing.value?1:age.value):undefined),poses=computed(()=>data.value?globalRoomPoses(data.value,age.value,closing.value):{}),backdrop=computed(()=>data.value?powerRoomBackdrop(data.value,frame.value):undefined)
let disposed=false,handle=0,previous=0
const timers:ReturnType<typeof setTimeout>[]=[]
function close(){if(closing.value)return;closing.value=true;age.value=0;previous=0;focus.value=undefined;emit('sound','GUIButtonOut');timers.push(setTimeout(()=>emit('close'),600))}
function action(name:string){
 if(closing.value)return
 if(name==='close'){close();return}
 if(name==='reset'){emit('purchase',{});focus.value=undefined;purchases.value=[];emit('sound','GUIResetUpgrade');return}
 if(!name.startsWith('skill:'))return
 const [,kind,id]=name.split(':') as [string,GlobalUpgradeKind,string]
 if(focus.value?.kind!==kind||focus.value.id!==id){focus.value={kind,id};emit('sound','GUIHeroSkillSelect');return}
 const own=props.progress.globalUpgrades??{},next=activateGlobalUpgrade(globalUpgradePoints(props.progress),own,kind,id)
 if(next!==own){const fx={kind,id,at:age.value};purchases.value.push(fx);timers.push(setTimeout(()=>purchases.value=purchases.value.filter(p=>p.kind!==fx.kind||p.id!==fx.id||p.at!==fx.at),600));emit('purchase',next);emit('sound','GUIBuyUpgrade')}else emit('sound','GUIHeroSkillSelect')
}
function resize(){viewport.value={w:innerWidth,h:innerHeight}}
function key(e:KeyboardEvent){if(e.key==='Escape'){e.stopPropagation();close()}}
function tick(now:number){age.value+=previous?Math.min(.1,(now-previous)/1000):0;previous=now;handle=requestAnimationFrame(tick)}
onMounted(async()=>{addEventListener('resize',resize);addEventListener('keydown',key);try{const response=await fetch('data/global-room.json');if(!response.ok)throw Error('全局升级载入失败');const art=await response.json();await preloadNativeImages(Object.keys(art.images).map(name=>'assets/'+name+'.png'));if(!disposed){data.value=art;handle=requestAnimationFrame(tick)}}catch(e){error.value=String(e)}})
onBeforeUnmount(()=>{disposed=true;timers.forEach(clearTimeout);cancelAnimationFrame(handle);removeEventListener('resize',resize);removeEventListener('keydown',key)})
</script>
<template>
 <section class="native-global-room" role="dialog" aria-label="全局升级" :data-points="points" :data-closing="closing">
  <div v-if="backdrop&&data" class="room-backdrop" :style="{width:frame.width+'px',height:frame.height+'px',transform:`translate(-50%,-50%) scale(${viewportScale})`}"><NativeUiNode :node="backdrop" :images="data.images"/></div>
  <div class="room-paper" :style="{transform:`translate(-50%,-50%) scale(${scale})`}"><NativeUiNode v-if="view&&data" :node="view" :images="data.images" :poses="poses" :age="age" @action="action"/></div>
  <p v-if="error" role="alert">{{error}}</p>
 </section>
</template>
<style scoped>
.native-global-room{position:fixed;inset:0;z-index:70;overflow:hidden}.room-paper,.room-backdrop{position:absolute;left:50%;top:50%;transform-origin:center}.room-paper{width:1365.333333px;height:768px}.native-global-room>p{position:absolute;inset:45% 0 auto;text-align:center;color:white}
</style>
