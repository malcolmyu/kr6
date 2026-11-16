import {readFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {EnemyPath} from '../src/game/EnemyPath.ts'
const read=path=>JSON.parse(readFileSync(path)),levels=[1,2,3].map(stage=>read(`public/data/level0${stage}.json`)),rows=read('analysis/path-prediction-oracle.json')
for(const row of rows){const level=levels[row.stage-1],path=new EnemyPath(level.paths.paths,level.navigation,row.pi,row.spi);path.ni=row.ni;Object.assign(path.position,row.pos);const predicted=path.nativePrediction(row.seconds,Math.hypot(...row.motion));assert.equal(predicted.ni-row.ni,row.offset);assert(Math.hypot(predicted.pos.x-row.predicted.x,predicted.pos.y-row.predicted.y)<1e-8)}
console.log(`${rows.length} native path predictions match, including stationary/zero-time node snapping, ceiling distance, current-path ends and all first-three-stage lanes`)
