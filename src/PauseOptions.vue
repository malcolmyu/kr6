<script setup lang="ts">
import {computed,ref,toRaw} from 'vue'
import NativePopup from './NativePopup.vue'
import {pauseView,confirmationView} from './game/PauseOptions'
import type {PauseArt} from './game/PauseOptions'
import type {AudioVolumes,VolumeKey} from './game/AudioSettings'
const props=defineProps<{data:PauseArt;volumes:AudioVolumes}>(),emit=defineEmits<{resume:[];restart:[];quit:[];closed:[];sound:[name:string];volume:[key:VolumeKey,value?:number]}>()
const popup=ref<InstanceType<typeof NativePopup>>(),confirm=ref<InstanceType<typeof NativePopup>>(),prompt=ref<'restart'|'quit'>()
const view=computed(()=>pauseView(toRaw(props.data),props.volumes)),message=computed(()=>prompt.value?confirmationView(toRaw(props.data),prompt.value):undefined)
let closing=false
function resume(){if(closing||prompt.value)return;closing=true;emit('sound','GUIButtonOut');popup.value?.hide();emit('resume')}
function action(name:string){if(name==='resume'){resume();return}emit('sound','GUIButtonCommon');if(name==='restart'||name==='quit')prompt.value=name;else if(name.startsWith('toggle:'))emit('volume',name.slice(7) as VolumeKey)}
function answer(name:string){emit('sound','GUIButtonCommon');confirm.value?.hide();if(name==='yes'){if(prompt.value==='restart')emit('restart');else if(prompt.value==='quit')emit('quit')}}
defineExpose({resume})
</script>
<template><NativePopup ref="popup" :node="view" :images="data.images" :frames="data.popupFrames" :scale="data.scale" label="暂停选项" @action="action" @change="(id,value)=>emit('volume',id as VolumeKey,value)" @sound="emit('sound',$event)" @escape="resume" @closed="emit('closed')"/>
 <NativePopup v-if="message" ref="confirm" :node="message" :images="data.images" :frames="data.popupFrames" :scale="data.scale" :y="362" :label="prompt==='restart'?'确认重新开始':'确认退出关卡'" @action="answer" @escape="answer('no')" @closed="prompt=undefined"/>
</template>
