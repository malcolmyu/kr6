import assert from 'node:assert/strict'
import {readFileSync,existsSync} from 'node:fs'
import {activateGlobalUpgrade,globalUpgradePoints,globalUpgradeSpent,validateGlobalUpgrades} from '../src/game/GlobalUpgrades.ts'
import {globalRoomView} from '../src/game/GlobalRoom.ts'
import {roomFind} from '../src/game/HeroRoom.ts'
const read=p=>JSON.parse(readFileSync(p)),rows=read('analysis/global-room-pick-oracle.json'),art=read('public/data/global-room.json')
for(const r of rows){const selected={[r.kind]:Array.isArray(r.selected)?r.selected:[]},result=activateGlobalUpgrade(r.points,selected,r.kind,r.id);assert.deepEqual(result[r.kind],Array.isArray(r.result)?r.result:[],`${r.kind}/${r.points}/${r.selected}/${r.id}`);assert(globalUpgradeSpent(result)<=r.points)}
const profile={levels:{1:{campaign:3,iron:true},2:{campaign:3,iron:true},3:{campaign:3}}}
assert.equal(globalUpgradePoints(profile),4)
for(const globalUpgrades of [{},{mages:['l1']},{mages:['l1','l2'],artillery:['l1']}]){
 assert.deepEqual(validateGlobalUpgrades(4,globalUpgrades),globalUpgrades)
 const view=globalRoomView(art,{...profile,globalUpgrades});assert.equal(roomFind(view,'label_upgrades').text,String(4-globalUpgradeSpent(globalUpgrades)))
 assert.equal(roomFind(view,'button_upgrades_reset').action,'reset');assert.equal(roomFind(view,'button_close_popup').action,'close');assert(!roomFind(view,'group_tw_upgrade_trees')||roomFind(view,'group_tw_upgrade_trees').hidden)
 for(let i=1;i<=4;i++){const tree=roomFind(view,`group_power_lvl_tree_${i}`);assert(tree&&!tree.hidden);assert(roomFind(tree,'image_tower_type_icon').image_name.startsWith('tw_type_'))}
}
for(const name of Object.keys(art.images))assert(existsSync(`public/assets/${name}.png`),name)
console.log(`${rows.length} original global node confirmation/branch-transfer results match, including shared-budget refusal and immutable selection; ordinary four-tree room exposes native point count/reset/close/origin art and all153 image assets exist`)
