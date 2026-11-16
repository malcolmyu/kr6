import type {EnemyInstance} from './GameSession'
import type {TowerSite} from './TowerSystem'
import type {Point} from './types'
export interface ArcherTemplate {tower:{range_offset:Point};shooters_sids:number[];bows_sids?:number[];render:{sprites:{offset:Point}[]};attacks:{list:{bullet_start_offset:Point|Point[]}[]}}
export function archerGeometry(site:Point,template:ArcherTemplate,sid:number,target:Point) {
 const offset=template.render.sprites[sid-1].offset
 const back=target.y>site.y-offset.y,flipX=target.x<site.x+offset.x
 const up=target.y>site.y+template.tower.range_offset.y-offset.y
 const offsets=template.attacks.list[0].bullet_start_offset,bullet=Array.isArray(offsets)?offsets[up?0:1]:offsets
 return {back,flipX,from:{x:site.x+offset.x+bullet.x*(flipX?-1:1),y:site.y+offset.y+bullet.y}}
}
export interface ArcherState {site:TowerSite;key:string;instance:number;createdAt:number;sid:number;shooterId:number;startedAt:number;back:boolean;flipX:boolean;pending:boolean;target?:EnemyInstance;targetId?:number;predPos:Point;initialized:boolean;idleTs:number;idleCooldown:number;phase:'idle'|'windup'|'animation';animation:'idle'|'shoot';loop:boolean;removed?:boolean}
