import {readFileSync,existsSync} from 'node:fs'
import assert from 'node:assert/strict'
import {heroRoomView,heroRoomPoses,roomFind} from '../src/game/HeroRoom.ts'
import {heroUpgradeData} from '../src/game/HeroUpgrades.ts'
const read=p=>JSON.parse(readFileSync(p)),data=read('public/data/hero-room.json')
function walk(n,fn){fn(n);n.children?.forEach(c=>walk(c,fn))}
for(const hero of ['hero_gerald','hero_zefira'])for(const [id,states]of Object.entries(data.nodeStates[hero]))for(const state of Object.values(states))for(const n of Object.values(state))if(n.image)assert(existsSync(`public/assets/${n.image}.png`),n.image)
const initial=heroRoomView(data,'hero_gerald',1000,[]),tree=roomFind(initial,'group_hero_lvl_tree'),courage=roomFind(tree,'button_upgrade_3_5')
assert.equal(roomFind(initial,'timeline_upgrade_points').hidden,true,'Native desktop hides the separate mobile point timeline')
assert.equal(roomFind(initial,'label_upgrade_points_general').text,'4')
assert.equal(courage.action,'skill:skill_a');assert.equal(roomFind(courage,'upgrade_icon').image_name,'hero_gerald_skill_icon_01')
const focused=heroRoomView(data,'hero_gerald',1000,[],'skill_a'),tooltip=roomFind(focused,'tooltip_upgrades')
assert.equal(roomFind(tooltip,'label_upgrades_room_tooltip_title').text,'英勇鼓舞 1级')
assert(!roomFind(tooltip,'label_upgrades_room_tooltip_desc').text.includes('{b.'))
assert.equal(roomFind(tooltip,'upgrade_tooltip_arrow_1').hidden,false)
const purchased=heroRoomView(data,'hero_gerald',1000,['skill_a']),grid=roomFind(purchased,'group_hero_lvl_tree')
assert.equal(roomFind(grid,'button_upgrade_3_5').hidden,true,'Purchased skill A1 gives its place to the upgrade node')
assert.equal(roomFind(grid,'button_upgrade_5_3').hidden,false)
assert.equal(roomFind(purchased,'label_upgrade_points_general').text,'3')
for(const age of [0,1/30,5/30,.2,.5,3]){
 const poses=heroRoomPoses(data,age),expected=data.timelines.timeline_tower_room.upgrades_in[Math.min(45,Math.floor(age*30+1e-9))]
 assert.deepEqual(poses.group_tower_upgrades,expected.group_tower_upgrades)
}
let slices=0
walk(initial,n=>{if(n.slice_rect&&n.image_name){const image=data.images[n.image_name];assert(image,n.image_name);assert(n.slice_rect.size.x>0&&n.slice_rect.size.y>0,n.image_name);slices++}})
console.log(`Native hero room: original node-state images, two hero trees, upgrade promotion, selected balanced tooltip, desktop point bar, timeline poses and ${slices} original nine-slice rectangles verified`)
