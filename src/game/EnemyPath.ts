import type {Point} from './types'
export interface Navigation {averageNodeDistance?:number;noBackwardsNodes?:boolean[][];teleportNodes?:boolean[][];targetNodes?:boolean[][];widths?:number[];rallyNodes?:boolean[][];starts:number[];ends:number[];defend:(number|null)[];connections:(number|null)[]}
export interface EnemyRoute {position:Point;direction:Point;walkDirection?:Point;finished:boolean;remainingNodes:number;advance(distance:number):void;predict(distance:number):Point;teleportBack?(offset:number):void}
/** Original path_db.next_entity_node followed by utils.walk, once per 30 Hz tick. */
export class EnemyPath implements EnemyRoute {
  readonly position:Point
  direction:Point={x:0,y:0}
  finished=false
  pi:number
  ni:number
  prevPis:number[]=[]
  private spi:number
  private paths:Point[][][]
  private navigation:Navigation
  private lastStep=0
  constructor(paths:Point[][][],navigation:Navigation,pi:number,spi:number) {
    this.paths=paths;this.navigation=navigation;this.pi=pi;this.spi=spi;this.ni=navigation.starts[pi-1]
    this.position={...paths[pi-1][spi-1][this.ni-1]}
  }
  headingToNextNode(speed:number){
    const lane=this.paths[this.pi-1][this.spi-1];let next=lane[this.ni]
    if(next&&Math.hypot(next.x-this.position.x,next.y-this.position.y)<2*speed/30)next=lane[this.ni+1]??next
    return next?Math.atan2(next.y-this.position.y,next.x-this.position.x):0
  }
  get remainingNodes():number {
    let pi=this.pi,value=-this.ni,seen=new Set<number>()
    while(!seen.has(pi)) {seen.add(pi);value+=this.navigation.ends[pi-1];const next=this.navigation.connections[pi-1];if(!next)break;pi=next}
    return value
  }
  /** enemy_walk_step passes use_path=true to animation_name_facing_point:
   * facing uses the node-to-destination angle, rather than the off-node body. */
  get walkDirection():Point {
    const lane=this.paths[this.pi-1][this.spi-1],origin=lane[this.ni-1],next=lane[this.ni]
    return origin&&next?{x:next.x-origin.x,y:next.y-origin.y}:this.direction
  }
  advance(distance:number) {
    if(!Number.isFinite(distance)||distance<0)throw new Error('Invalid travel distance')
    if(this.finished || distance===0)return
    this.lastStep=distance
    let lane=this.paths[this.pi-1][this.spi-1],next=lane[this.ni]
    if(!next || Math.hypot(next.x-this.position.x,next.y-this.position.y)<2*distance) {
      this.ni++
      if(this.ni>lane.length) {
        const connection=this.navigation.connections[this.pi-1]
        if(!connection){this.finished=true;return}
        const center=this.paths[connection-1][0]
        let nearest=0,best=Infinity
        for(const [index,node] of center.entries()) {
          const d=(node.x-this.position.x)**2+(node.y-this.position.y)**2
          if(d<best){best=d;nearest=index}
        }
        this.prevPis.push(this.pi);this.pi=connection;this.ni=nearest+2;lane=this.paths[this.pi-1][this.spi-1]
      }
      next=lane[this.ni]
    }
    if(next) {
      const dx=next.x-this.position.x,dy=next.y-this.position.y,length=Math.hypot(dx,dy)
      if(length) {
        this.direction={x:dx/length,y:dy/length}
        if(length<=distance){this.position.x=next.x;this.position.y=next.y}
        else {this.position.x+=this.direction.x*distance;this.position.y+=this.direction.y*distance}
      }
    }
    this.finished=this.ni>=this.navigation.ends[this.pi-1] && !this.navigation.connections[this.pi-1]
  }
  teleportBack(offset:number){
    let ni=this.ni+offset
    if(ni<1&&this.prevPis.length){this.pi=this.prevPis.pop()!;this.ni=this.navigation.ends[this.pi-1];ni=this.ni+ni}
    const lane=this.paths[this.pi-1][this.spi-1],valid=this.navigation.teleportNodes?.[this.pi-1]
    ni=Math.max(1,Math.min(lane.length,ni))
    for(let next=ni;next<=lane.length;next++)if(!valid||valid[next-1]){this.ni=next;break}
    Object.assign(this.position,lane[this.ni-1]);this.finished=false
    const next=lane[this.ni];if(next){const dx=next.x-this.position.x,dy=next.y-this.position.y,length=Math.hypot(dx,dy);if(length)this.direction={x:dx/length,y:dy/length}}
  }
  predict(distance:number):Point {
    const copy=new EnemyPath(this.paths,this.navigation,this.pi,this.spi)
    copy.prevPis=[...this.prevPis];copy.ni=this.ni;copy.position.x=this.position.x;copy.position.y=this.position.y;copy.finished=this.finished
    const step=this.lastStep || distance
    while(distance>1e-9 && !copy.finished){const amount=Math.min(step,distance);copy.advance(amount);distance-=amount}
    return copy.position
  }
  /** Native path_db.predict_enemy_pos snaps to a future node on this path.
   * It does not walk across a connection or interpolate the current position. */
  nativePrediction(seconds:number,speed:number){
    const lane=this.paths[this.pi-1][this.spi-1],offset=Math.max(0,Math.min(this.paths[this.pi-1][0].length-this.ni,Math.ceil(seconds*speed/(this.navigation.averageNodeDistance??6))))
    const ni=Math.max(1,Math.min(lane.length,this.ni+offset))
    return {pos:{...lane[ni-1]},ni}
  }
}
