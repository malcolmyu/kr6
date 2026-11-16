import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {MapViewport} from '../src/game/MapViewport.ts'
let count=0
for(const row of JSON.parse(readFileSync('analysis/map-viewport-oracle.json'))){
 const view=new MapViewport(row.size[0],row.size[1],undefined,{x:row.focus[0],y:row.focus[1]})
 assert(Math.abs(view.minimum-row.minimum)<1e-12);assert(Math.abs(view.maximum-row.maximum)<1e-12)
 for(const step of row.steps){const a=step.action;if(a.kind==='pan')view.pan(a.dx,a.dy);if(a.kind==='scroll')view.scroll(a.direction,a.point);assert(Math.abs(view.zoom-step.zoom)<1e-12);assert(Math.hypot(view.pos.x-step.pos.x,view.pos.y-step.pos.y)<1e-8);count++}
}
console.log(`${count} native map viewport states match: cover-fit initial zoom, focus clamping, pointer-anchored wheel zoom and drag limits`)
