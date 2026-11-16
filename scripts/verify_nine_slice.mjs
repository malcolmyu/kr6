import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {nineSliceDraws} from '../src/game/NineSlice.ts'
const cases=JSON.parse(readFileSync('analysis/nine-slice-oracle.json'))
let draws=0
for(const sample of cases){const rows=nineSliceDraws(sample.image,sample.size,sample.slice,sample.overdraw);assert.equal(rows.length,sample.rows.length)
 for(let i=0;i<rows.length;i++){for(const key of ['source','destination'])for(let j=0;j<4;j++)assert(Math.abs(rows[i][key][j]-sample.rows[i][key][j])<1e-7,`${i} ${key} ${j}`);draws++}
}
assert(cases.some(c=>c.slice.pos.y<0),'Native templates include negative slice margins')
console.log(`${cases.length} original GG59View redraw cases and ${draws} source/destination quads match, including negative margins, small-target corner scaling and side overdraw`)
