<script setup lang="ts">
import {computed,onMounted,onBeforeUnmount,ref} from 'vue'
import NativeUiNode from './NativeUiNode.vue'
import {enemyBook,enemyBookView,enemyDiscovered} from './game/EnemyBook'
import {preloadNativeImages} from './game/NativeImageCache'
import type {Progress} from './game/ProgressStore'
const props=defineProps<{progress:Progress}>(),emit=defineEmits<{close:[];sound:[name:string]}>(),selected=ref(enemyBook.enemies[0].id),page=ref(0),viewport=ref({w:innerWidth,h:innerHeight}),error=ref('')
const scale=computed(()=>Math.min(viewport.value.w/1540,viewport.value.h/1120)),view=computed(()=>enemyBookView(props.progress,selected.value,page.value))
function resize(){viewport.value={w:innerWidth,h:innerHeight}}
function key(e:KeyboardEvent){if(e.key==='Escape'){e.preventDefault();emit('close')}}
async function preload(){try{error.value='';const urls:string[]=[];const visit=(n:typeof view.value)=>{if(n.hidden)return;for(const key of ['image_name','default_image_name','focus_image_name'] as const)if(n[key])urls.push('assets/'+n[key]+'.png');for(const c of n.children??[])visit(c as typeof view.value)};visit(view.value);await preloadNativeImages(urls)}catch(e){error.value=String(e)}}
function action(name:string){emit('sound','GUIButtonCommon');if(name==='close')emit('close');else if(name.startsWith('enemy:')){const e=enemyBook.enemies.find(e=>e.id===name.slice(6));if(e&&enemyDiscovered(props.progress,e))selected.value=e.id;void preload()}else if(name.startsWith('page:')){page.value=Number(name.slice(5));void preload()}}
onMounted(()=>{addEventListener('resize',resize);addEventListener('keydown',key);void preload()});onBeforeUnmount(()=>{removeEventListener('resize',resize);removeEventListener('keydown',key)})
</script>
<template><section class="enemy-book" role="dialog" aria-label="怪物图鉴" aria-modal="true" :data-enemy="selected" :data-page="page+1"><div class="book-paper" :style="{transform:`scale(${scale})`}"><NativeUiNode :node="view" :images="enemyBook.images" @action="action"/></div><div v-if="error" class="book-error" role="alert">{{error}}<button @click="preload">重试</button><button @click="emit('close')">关闭图鉴</button></div></section></template>
<style scoped>.enemy-book{position:fixed;inset:0;background:#000b;z-index:75;overflow:hidden}.book-paper{position:absolute;left:50%;top:50%;width:0;height:0;transform-origin:0 0}.book-error{position:absolute;inset:40% 15% auto;text-align:center;background:#251c14ee;padding:24px}.book-error button{margin:12px}</style>
