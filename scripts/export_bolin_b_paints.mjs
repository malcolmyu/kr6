import {execFileSync} from 'node:child_process'
import {readFileSync,writeFileSync,unlinkSync,existsSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {gzipSync} from 'node:zlib'
import {bolinBCases} from './bolin_b_chain_cases.mjs'
const selected=['bolin-b','bolin-b-trigger','bolin-b-far-cap','bolin-b-combo-rank3']
const manifest=existsSync('analysis/bolin-b-paint-compression.json')?JSON.parse(readFileSync('analysis/bolin-b-paint-compression.json','utf8')):[]
for(const c of bolinBCases.filter(c=>selected.includes(c.scenario)&&(process.argv.length===2||process.argv.slice(2).includes(c.scenario)))){
 const log=execFileSync('reference/luajit-beta3/src/luajit',['scripts/export_bolin_b_controlled_paint.lua','3','campaign','cleared',c.scenario,'runtime',String(c.ticks),'analysis/native-runtime-bolin-base-input.json','lcg104','normal',`analysis/native-runtime-${c.scenario}-profile.json`,c.mode],{encoding:'utf8'})
 writeFileSync(`analysis/${c.scenario}-native-paint-export.log`,log)
 const path=`analysis/native-controlled-paint-${c.scenario}.json`,raw=readFileSync(path),compressed=gzipSync(raw)
 writeFileSync(path+'.gz',compressed);unlinkSync(path)
 const previous=manifest.findIndex(row=>row.path===path+'.gz');if(previous>=0)manifest.splice(previous,1)
 manifest.push({path:path+'.gz',bytes:raw.length,compressedBytes:compressed.length,sha256:createHash('sha256').update(raw).digest('hex')})
 console.log(`${c.scenario}: ${c.ticks} original paint samples, ${compressed.length} gzip bytes`)
}
writeFileSync('analysis/bolin-b-paint-compression.json',JSON.stringify(manifest,null,2)+'\n')
