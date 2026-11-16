import type {UiNode} from './OutcomeAnimation'
/** CSS presentation of the original label band colors/outline/shadow settings.
 * The native shader's subpixel convolution is not reproduced by CSS text stroke. */
export function nativeLabelStyle(node:UiNode):Record<string,string>{
 const style:Record<string,string>={},color=(values:number[])=>`rgba(${values.slice(0,3).map(v=>Math.round(v*255)).join(',')},${values[3]??1})`
 for(const [index,name]of (node.shaders??[]).entries()){
  const args=node.shader_args?.[index]??{}
  if(name==='p_bands'&&args.c1&&args.c2&&args.c3){const first=Number(args.p1??.33)*100,second=Number(args.p2??.66)*100,c1=color(args.c1 as number[]),c2=color(args.c2 as number[]),c3=color(args.c3 as number[]);style.backgroundImage=`linear-gradient(to bottom,${c1} 0%,${c1} ${first}%,${c2} ${first}%,${c2} ${second}%,${c3} ${second}%,${c3} 100%)`;style.backgroundClip='text';style.webkitBackgroundClip='text';style.webkitTextFillColor='transparent'}
  if(name==='p_outline_tint'&&args.outline_color){style.webkitTextStroke=`${2*Number(args.thickness??1.5)}px ${color(args.outline_color as number[])}`;style.paintOrder='stroke fill'}
  if(name==='p_drop_shadow_2'){const offset=(args.shadow_offset??[0,2]) as number[];style.filter=`drop-shadow(${offset[0]}px ${offset[1]}px ${Number(args.shadow_blur??0)}px ${color((args.shadow_color??[0,0,0,1]) as number[])})`}
 }
 return style
}
