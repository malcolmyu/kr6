import {existsSync,readFileSync} from 'node:fs'
import {gunzipSync} from 'node:zlib'
/** Gzip is lossless; original float64 strings retain every recorded bit. */
export function readPreciseJson(path){const bytes=existsSync(path)?readFileSync(path):gunzipSync(readFileSync(path+'.gz'));return JSON.parse(bytes,(_,v)=>typeof v==='string'&&v.startsWith('@f64:')?Number(v.slice(5)):v)}
