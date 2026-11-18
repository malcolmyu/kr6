import native from '../../public/data/enemy-book.json' with {type:'json'}
import type {RoomNode} from './HeroRoom'
import type {Point} from './types'
import type {Progress} from './ProgressStore'
export interface EnemyBookEntry {id:string;name:string;description:string;special:string;alwaysShown:boolean;portrait:string;thumb:string;health:number|number[];armor:number;magicArmor:number;speed:number;lives:number;damageMin:number;damageMax:number;flying:boolean;firstStage?:number}
export const enemyBook=native as unknown as {scale:number;template:RoomNode;enemies:EnemyBookEntry[];images:Record<string,Point>;mapButton:RoomNode;mapButtonPath:RoomNode[]}
export const enemyBookIds=new Set(enemyBook.enemies.map(e=>e.id))
export function normalizeBookEnemy(name:string){return name==='enemy_bandit_tut'?'enemy_bandit':name}
export function enemyDiscovered(progress:Progress,e:EnemyBookEntry){return e.alwaysShown||!!progress.discoveredEnemies?.includes(e.id)||!!(e.firstStage&&progress.levels[e.firstStage]?.campaign)}
export function recordDiscoveredEnemies(progress:Progress,names:string[]):Progress{
 const seen=new Set(progress.discoveredEnemies??[]);let changed=false
 for(const name of names){const id=normalizeBookEnemy(name);if(enemyBookIds.has(id)&&!seen.has(id)){seen.add(id);changed=true}}
 return changed?{...progress,discoveredEnemies:[...seen]}:progress
}
const find=(n:RoomNode,id:string):RoomNode|undefined=>n.id===id?n:n.children?.map(c=>find(c as RoomNode,id)).find(Boolean)
const visit=(n:RoomNode,fn:(n:RoomNode)=>void)=>{fn(n);for(const c of n.children??[])visit(c as RoomNode,fn)}
export function enemyBookView(progress:Progress,selected:string,page:number){
 const root=structuredClone(enemyBook.template),enemy=enemyBook.enemies.find(e=>e.id===selected)??enemyBook.enemies[0],text=(id:string,value:string)=>{const n=find(root,id);if(n)n.text=value}
 for(const n of root.children??[])if(n.id?.startsWith('group_stats_')&&n.id!=='group_stats_enemy'||n.id?.startsWith('group_skills_')||['group_tooltip_skills','button_tab_towers','button_tab_towers_selected','button_tab_enemies'].includes(n.id??''))n.hidden=true
 const close=find(root,'button_close_popup');if(close){close.action='close';close.label='关闭怪物图鉴'}
 text('label_title_thumbs','怪物图鉴');text('label_details_title',enemy.name);text('label_details_desc',enemy.description);text('label_details_footer',enemy.special|| (enemy.flying?'飞行单位':'地面单位'))
 const hp=Array.isArray(enemy.health)?enemy.health[1]??enemy.health[0]:enemy.health
 for(const [key,value]of Object.entries({health:String(hp),damage:enemy.damageMin+'–'+enemy.damageMax,armor:Math.round(enemy.armor*100)+'%',armor_magical:Math.round(enemy.magicArmor*100)+'%',speed:String(Math.round(enemy.speed)),lives:String(enemy.lives)}))text('label_stats_enemy_'+key,value)
 const photo=find(root,'detail_polaroid');if(photo)photo.image_name=enemy.portrait
 const thumbs=find(root,'group_thumbs')
 for(const button of thumbs?.children??[]){const index=Number(button.id?.match(/(\d+)$/)?.[1])-1,row=enemyBook.enemies[page*20+index];button.hidden=!row;if(!row)continue
  const open=enemyDiscovered(progress,row);button.action='enemy:'+row.id;button.label=open?row.name:'尚未发现的怪物';button.disabled=!open
  const image=find(button as RoomNode,'image_thumb_mini_image');if(image)image.image_name=open?row.thumb:'room_encyclopedia_image_thumb_locked_'
  const highlight=find(button as RoomNode,'image_thumb_frame_highlight');if(highlight)highlight.hidden=row.id!==enemy.id
 }
 const pager=find(root,'pager'),model=pager?.children?.[0];if(pager&&model)pager.children=Array.from({length:Math.ceil(enemyBook.enemies.length/20)},(_,i)=>{const n=structuredClone(model) as RoomNode&{true_image_name?:string;false_image_name?:string};n.id='book_page_'+i;n.pos={x:(i-1)*44,y:0};n.action='page:'+i;n.label='图鉴第'+(i+1)+'页';n.image_name=i===page?n.true_image_name:n.false_image_name;visit(n,c=>{if(c.class?.includes('Label')){c.text=String(i+1);c.hidden=c.id==='label_page_selected'?i!==page:i===page}});return n})
 return root
}
