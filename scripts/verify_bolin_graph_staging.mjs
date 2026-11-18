import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {evaluateHeroGraph} from '../src/game/HeroUpgrades.ts'
const read=p=>JSON.parse(readFileSync(p)),data=read('analysis/bolin-hero-upgrades.json'),oracle=read('analysis/bolin-hero-graph-oracle.json')
assert.equal(oracle.length,78)
for(const row of oracle){const actual=evaluateHeroGraph(data.graphs[row.hero],row.selected,row.points);for(const key of ['enable_buttons','unavailable_buttons','block_buttons','active_links'])assert.deepEqual(actual[key],Object.fromEntries(Object.entries(row.result[key])),`${row.hero}/${row.selected}/${row.points}/${key}`);assert.deepEqual(actual.available_nodes,row.result.available_nodes)}
const art=read('analysis/bolin-art.json'),room=read('analysis/bolin-hero-room.json');assert.equal(Object.keys(art.exos).length,5);for(const [id,node]of Object.entries(data.nodes.hero_bolin))if(typeof node==='object'&&id!=='origin'){assert(room.nodeStates.hero_bolin[id]);assert(room.labels.hero_bolin[id]);assert(room.images[node.img])}
console.log('78 original Bolin graph evaluations and staged native room node states/labels/image references verified; hero remains unimplemented in production')
