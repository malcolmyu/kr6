import {LuaEntityTable} from './LuaEntityTable.ts'
export interface SpatialEntity {id:number;pending_removal?:boolean;health?:unknown;vis?:unknown;pos?:{x:number;y:number}}
export interface NativeSpatialGrid<T> {name:string;x:number;y:number;w:number;h:number;minX:number;maxX:number;minY:number;maxY:number;cells:Map<number,Map<number,T[]>>}
const truthy=(value:unknown)=>value!==undefined&&value!==null&&value!==false

/** Shipped klove.sso bounding-box mode (bb_step128), plus systems.sso499.
 * Queries append candidates by X cell, Y cell, then insertion order. They do
 * not check exact radius: caller predicates perform the narrow-phase test. */
export class NativeSpatialEntities<T extends SpatialEntity> {
 readonly step=128
 readonly grids=new Map<string,NativeSpatialGrid<T>>()
 private all?:LuaEntityTable<T>
 reset(entities:LuaEntityTable<T>){this.all=entities;this.grids.clear()}
 isAllEntities(entities:LuaEntityTable<T>){return entities===this.all?true:undefined}
 create(name:string,x:number,y:number,w:number,h:number){
  const grid:NativeSpatialGrid<T>={name,x,y,w,h,minX:0,maxX:0,minY:0,maxY:0,cells:new Map()};this.grids.set(name,grid);return grid
 }
 insert(grid:NativeSpatialGrid<T>,x:number,y:number,entity:T){
  const ix=Math.ceil((x-grid.x)/this.step),iy=Math.ceil((y-grid.y)/this.step)
  let column=grid.cells.get(ix);if(!column){column=new Map();grid.cells.set(ix,column)}
  let cell=column.get(iy);if(!cell){cell=[];column.set(iy,cell)}cell.push(entity)
  // Lua min/max retain the first argument on equal values, including +0/-0.
  if(ix<grid.minX)grid.minX=ix;if(ix>grid.maxX)grid.maxX=ix
  if(iy<grid.minY)grid.minY=iy;if(iy>grid.maxY)grid.maxY=iy
 }
 filter(output:T[],name:string,x:number,y:number,radius:number,predicate?:(cellIndex:number,entity:T)=>unknown){
  const g=this.grids.get(name);if(!g)return
  const minX=Math.max(g.minX,Math.ceil((x-radius-g.x)/this.step)),maxX=Math.min(g.maxX,Math.ceil((x+radius-g.x)/this.step))
  const minY=Math.max(g.minY,Math.ceil((y-radius-g.y)/this.step)),maxY=Math.min(g.maxY,Math.ceil((y+radius-g.y)/this.step))
  for(let ix=minX;ix<=maxX;ix++)for(let iy=minY;iy<=maxY;iy++){
   const cell=g.cells.get(ix)?.get(iy);if(!cell)continue
   for(const [index,entity]of cell.entries())if(truthy(entity)&&(!predicate||truthy(predicate(index+1,entity))))output.push(entity)
  }
 }
 rebuild(entities:LuaEntityTable<T>,visible:{left:number;right:number;bottom:number;top:number}){
  this.reset(entities);const g=this.create('targets',visible.left,visible.bottom,visible.right-visible.left,visible.top-visible.bottom)
  for(const entity of entities.values())if(!truthy(entity.pending_removal)&&truthy(entity.health)&&truthy(entity.vis)&&truthy(entity.pos))this.insert(g,entity.pos!.x,entity.pos!.y,entity)
  return g
 }
}
