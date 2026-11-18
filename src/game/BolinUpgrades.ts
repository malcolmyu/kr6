import native from '../../public/data/bolin-upgrades.json' with {type:'json'}
import {applyNativeTemplatePatches} from './NativeTemplatePatches.ts'
import type {NativeUpgradePatch} from './NativeTemplatePatches'
/** Actual priority-ordered APK patch definitions, scoped to this session. */
export function bolinUpgradeTemplates<T extends object>(templates:Record<string,T>,selected:string[]){
 const owned=new Set(selected.map(id=>`hero_bolin_${id}`)),rules=native.upgrades as Record<string,NativeUpgradePatch>
 return applyNativeTemplatePatches(templates,native.order.filter(id=>owned.has(id)).map(id=>rules[id]))
}
