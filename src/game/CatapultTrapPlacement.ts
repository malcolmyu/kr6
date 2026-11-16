import {RoadPlacement} from './RoadPlacement.ts'
import type {LevelData,Point} from './types'
/** Native path_db595 called by catapult20167: ordered subpath nodes, strict
 * Euclidean range and LAND-only cells; duplicates retain their native weight. */
export function catapultTrapPositions(level:LevelData,pos:Point,mines:Point[],range=120,spacing=50){
 const road=new RoadPlacement(level),positions:Point[]=[]
 for(const [pi,lanes]of level.paths.paths.entries())for(const lane of lanes.slice(0,3))for(const [ni,p]of lane.entries()){
  if(level.paths.active[pi]===false||level.navigation?.targetNodes?.[pi]?.[ni]===false)continue
  const d=Math.hypot(p.x-pos.x,p.y-pos.y)
  if(d<=0||d>=range||(road.cell(p)&~1)!==0||mines.some(m=>(m.x-p.x)**2+(m.y-p.y)**2<=spacing*spacing))continue
  positions.push(p)
 }
 return positions
}
