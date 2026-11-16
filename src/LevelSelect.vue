<script setup lang="ts">
import {computed,ref,toRaw} from 'vue'
import NativePopup from './NativePopup.vue'
import {levelSelectView} from './game/LevelSelect'
import type {LevelSelectArt} from './game/LevelSelect'
import type {Progress} from './game/ProgressStore'
import type {GameMode} from './game/types'
const props=defineProps<{data:LevelSelectArt;stage:number;progress:Progress}>(),emit=defineEmits<{enter:[mode:GameMode];close:[];sound:[name:string]}>()
const popup=ref<InstanceType<typeof NativePopup>>(),mode=ref<GameMode>('campaign')
const view=computed(()=>levelSelectView(toRaw(props.data),props.stage,mode.value,props.progress))
let closing=false
function close(){if(closing)return;closing=true;emit('sound','GUIButtonOut');popup.value?.hide()}
function action(name:string){if(closing)return;if(name==='close'){close();return}emit('sound','GUIButtonCommon');if(name==='campaign'||name==='iron')mode.value=name;else if(name==='fight'&&(mode.value==='campaign'||props.progress.levels[props.stage]?.campaign))emit('enter',mode.value)}
</script>
<template><NativePopup ref="popup" :node="view" :images="data.images" :frames="data.popupFrames" :scale="data.scale" label="选择关卡模式" initial-focus="button_select" @action="action" @escape="close" @closed="emit('close')"/></template>
