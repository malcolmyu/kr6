/** Original render frame tie breakers (systems.render), after the world layer/Y key. */
export interface NativePaintOrder {draw:number;x:number;y?:number;z?:number;key?:string;history?:number;group?:number;part?:number}
interface RenderItem {groupOrder:number;renderOrder:number;id:number;z:number;object:{id:number;userData:Record<string,unknown>}}
export function nativePainterSort(a:RenderItem,b:RenderItem):number {
  if(a.groupOrder!==b.groupOrder)return a.groupOrder-b.groupOrder
  if(a.renderOrder!==b.renderOrder)return a.renderOrder-b.renderOrder
  const ka=a.object.userData.nativePaint as NativePaintOrder|undefined,kb=b.object.userData.nativePaint as NativePaintOrder|undefined
  // One total key for tagged and legacy meshes; legacy ties keep Three's depth/ID order.
  const y=(kb?.y??0)-(ka?.y??0)
  if(y)return y
  const draw=(ka?.draw??100000)-(kb?.draw??100000)
  if(draw)return draw
  const x=(ka?.x??0)-(kb?.x??0)
  if(x)return x
  const history=(ka?.history??0)-(kb?.history??0)
  if(history)return history
  const depth=(kb?0:b.z)-(ka?0:a.z)
  if(depth)return depth
  return (ka?.group??a.object.id)-(kb?.group??b.object.id)||(ka?.part??0)-(kb?.part??0)||a.id-b.id
}
/** Existing world bands; object sprites sort by descending original Y. */
export function worldSpriteOrder(z:number,y:number){return z===3000?10000-y:z<3000?z:20000+z}

export interface NativeSpriteSort {z?:number;draw_order?:number;sort_y?:number;sort_y_offset?:number;pos?:{x:number;y:number}}
/** Native render update uses sprite.pos when present, otherwise entity.pos. */
export function nativeSpriteOrder(config:NativeSpriteSort,pos:{x:number;y:number},entity:number,index=1):[number,NativePaintOrder] {
 const p=config.pos??pos,y=config.sort_y??p.y+(config.sort_y_offset??0),z=config.z??3000
 return [worldSpriteOrder(z,y),{z,y,x:p.x,draw:100000*(config.draw_order??index)+entity,key:`${entity}:sprite:${index}`}]
}
