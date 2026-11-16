/** systems.render.on_insert randomizes ts only when random_ts is present.
 * Lua zero is truthy; absent fields must not consume a random draw. */
export function nativeSpritePhase(sprite:{ts?:number;random_ts?:number;time_offset?:number},random:()=>number){
 const ts=sprite.random_ts===undefined?(sprite.ts??0):-sprite.random_ts+random()*sprite.random_ts
 return -ts+(sprite.time_offset??0)
}
