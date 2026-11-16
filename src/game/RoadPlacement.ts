import type {LevelData,Point} from './types'
/** path_db.valid_node_nearby and grid_db.cell_is_only, using exported native flags. */
export class RoadPlacement {
 private level:LevelData
 constructor(level:LevelData){this.level=level}
 cell(pos:Point):number {
  const {ox,oy,grid}=this.level.grid
  const x=Math.max(0,Math.min(grid.length-1,Math.ceil((pos.x-ox)/16)-1)),y=Math.max(0,Math.min(grid[x].length-1,Math.ceil((pos.y-oy)/16)-1))
  return grid[x][y]
 }
 terrain(pos:Point,mask:number):boolean {return (this.cell(pos)&~mask)===0}
 nearby(pos:Point):boolean {
  const nav=this.level.navigation
  for(const [pi,lanes] of this.level.paths.paths.entries()){
   let distance=Infinity,index=-1
   for(const [ni,p] of lanes[0].entries()){const d=(p.x-pos.x)**2+(p.y-pos.y)**2;if(d<distance){distance=d;index=ni}}
   if(distance<(nav?.widths?.[pi]??42)**2 && nav?.rallyNodes?.[pi]?.[index])return true
  }
  return false
 }
 valid(pos:Point,mask=2049){return this.nearby(pos)&&this.terrain(pos,mask)}
}
