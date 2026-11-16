import type {Point} from './types'
/** GG5Button.initialize's separate KImageView halo, not a replacement image. */
export function buttonHalo(base:Point,halo:Point,offset:Point={x:0,y:0}) {
 const anchor={x:(halo.x-base.x)/2,y:(halo.y-base.y)/2}
 return {anchor,pos:{x:offset.x-anchor.x,y:offset.y-anchor.y}}
}
