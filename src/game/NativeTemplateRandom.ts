import raw from '../../public/data/template-random.json' with {type:'json'}
/** templates_game23927 initializes sprites2..20, then clones the two related
 * debug modifiers. Even unused templates advance the level's shared RNG. */
export function initializeNativeTemplateRandom<T>(templates:Record<string,T>,random:()=>number):Record<string,T>{
 const debug=structuredClone(raw)
 const angles=Array.from({length:19},()=>Math.floor(random()*361)*(Math.PI/180))
 for(const template of Object.values(debug))for(let i=1;i<template.render.sprites.length;i++)template.render.sprites[i].r=angles[i-1]
 return {...templates,...debug as unknown as Record<string,T>}
}
