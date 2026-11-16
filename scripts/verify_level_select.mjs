import {readFileSync,existsSync} from 'node:fs'
import assert from 'node:assert/strict'
import {levelSelectView} from '../src/game/LevelSelect.ts'
const read=path=>JSON.parse(readFileSync(path)),data=read('public/data/level-select.json'),oracle=read('analysis/level-select-oracle.json')
function find(node,id){if(node.id===id)return node;for(const child of node.children??[]){const found=find(child,id);if(found)return found}}
function walk(node,fn,visible=true){visible=visible&&!node.hidden;fn(node,visible);for(const child of node.children??[])walk(child,fn,visible)}
let comparisons=0
for(const row of oracle){
 const mode=row.mode===1?'campaign':'iron',progress={levels:{[row.stage]:row.won?{campaign:3}:{}}},view=levelSelectView(data,row.stage,mode,progress)
 assert.equal(find(view,'label_level_select_title').text,row.title,`stage${row.stage} title`)
 assert.equal(find(view,'label_level_select_description').text,row.history)
 assert.equal(find(view,'button_select').hidden,row.selectHidden)
 assert.equal(find(view,'button_select_locked').hidden,row.lockedHidden)
 assert.equal(!find(view,`group_mode_${mode}_info`).hidden,row.infoVisible)
 assert.equal(find(view,'title_bg').size.x,row.titleWidth)
 if(mode==='iron'){
  const info=find(view,'group_mode_iron_info'),icons=[]
  walk(info,(node,visible)=>{if(visible&&node.id==='image_tower_icon_iron')icons.push(node.image_name)})
  assert.deepEqual(icons,({1:['archers','catapult'],2:['knights','wizard'],3:['catapult','wizard']})[row.stage].map(kind=>'icon_room_tower_'+kind))
 }
 walk(view,(node,visible)=>{if(visible)for(const key of ['image_name','default_image_name','focus_image_name'])if(node[key])assert(existsSync(`public/assets/${node[key]}.png`),node[key])})
 comparisons++
}
for(let stage=1;stage<=3;stage++)for(let stars=0;stars<=3;stars++)for(const iron of [false,true]){
 const progress={levels:{[stage]:{...(stars?{campaign:stars}:{}),...(iron?{iron:true}:{})}}},view=levelSelectView(data,stage,'campaign',progress)
 for(let i=1;i<=3;i++)assert.equal(find(view,'image_badge_star_'+i).hidden,i>stars)
 assert.equal(find(view,'image_badge_iron').hidden,!iron)
}
assert.equal(data.scale.x,.48);assert.equal(data.scale.y,.48)
console.log(`${comparisons} native level-select snapshots, stage titles/history/previews, campaign/iron locks, original tower restrictions, all badge combinations and visible asset paths verified`)
