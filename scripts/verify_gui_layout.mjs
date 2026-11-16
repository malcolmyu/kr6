import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {guiLayout} from '../src/game/GuiLayout.ts'
const cases=JSON.parse(readFileSync('analysis/gui-layout-oracle.json'))
function same(a,b){if(typeof a==='number'){assert(Math.abs(a-b)<1e-9,`${a} != ${b}`);return}for(const key of Object.keys(a))same(a[key],b[key])}
for(const row of cases)same(guiLayout(row.w,row.h,row.mobile),row.expected)
console.log(`${cases.length} original GUI clamp/safe-frame cases match across desktop/mobile, portrait and ultrawide sizes`)
