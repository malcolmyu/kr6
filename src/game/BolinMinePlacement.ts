import {luaSort} from './LuaSort.ts'
import {RoadPlacement} from './RoadPlacement.ts'
import data from '../../public/data/bolin-mines.json' with {type:'json'}
import type {LevelData,Point} from './types'
/** Native nearest_nodes(valid_only,NF_NO_BACKWARDS), then find_valid_node. */
export function bolinMineOrigin(level:LevelData,pos:Point,offset:number){
 const nodes=level.paths.paths.flatMap((lanes,index)=>{
  if(level.paths.active[index]===false)return[]
  let best=9e99,ni=0;for(const [i,p]of lanes[0].entries()){const d=(p.x-pos.x)**2+(p.y-pos.y)**2;if(d<best&&level.navigation?.noBackwardsNodes?.[index]?.[i]){best=d;ni=i+1}}
  return ni?[{pi:index+1,ni,distance:Math.sqrt(best)}]:[]
 }),nearest=luaSort(nodes,(a,b)=>a.distance<b.distance)[0]
 if(!nearest)return
 const lane=level.paths.paths[nearest.pi-1][0];let ni=Math.max(1,Math.min(lane.length,nearest.ni-offset))
 while(ni<=lane.length&&!level.navigation?.noBackwardsNodes?.[nearest.pi-1]?.[ni-1])ni++
 return lane[ni-1]
}
/** get_all_valid_pos preserves each path/subpath/node, including duplicate weight. */
export function bolinMinePositions(level:LevelData,pos:Point,min:number,max:number,mines:Point[],spacing:number){
 const road=new RoadPlacement(level),points:Point[]=[]
 for(const [pi,lanes]of level.paths.paths.entries())for(const lane of lanes.slice(0,3))for(const [ni,p]of lane.entries()){
  const d=Math.sqrt((p.x-pos.x)**2+(p.y-pos.y)**2)
  if((road.cell(p)&~data.land)!==0||!(min<d&&d<max)||!level.navigation?.noBackwardsNodes?.[pi]?.[ni]||mines.some(m=>Math.sqrt((m.x-p.x)**2+(m.y-p.y)**2)<=spacing))continue
  points.push(p)
 }
 return points
}
