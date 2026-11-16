import metadata from '../../public/data/wave-gems.json' with {type:'json'}
import type {GameMode} from './types'
/** Original wave_spawn_tsv chooses distinct gem carriers before spawning any enemies. */
export class WaveGems {
 selected:number[]=[]
 spawnIndex=0
 collected=0
 private stage=1
 private mode:GameMode
 private random:()=>number
 constructor(mode:GameMode,random:()=>number){this.mode=mode;this.random=random}
 configure(stage:number){this.stage=stage}
 private get data(){return metadata[`${this.stage}-${this.mode}` as keyof typeof metadata]}
 start(wave:number){
  this.spawnIndex=0;this.selected=[]
  const d=this.data,count=d?.spawns[wave-1]??0,keepers=Math.min(d?.keepers??0,count)
  if(this.mode==='campaign'){
   const pool=Array.from({length:count},(_,i)=>i+1)
   for(let i=0;i<keepers;i++)this.selected.push(pool.splice(Math.floor(this.random()*pool.length),1)[0])
  }else for(let i=count;i>count-keepers;i--)this.selected.push(i)
 }
 next(){this.spawnIndex++;return this.selected.includes(this.spawnIndex)?Math.floor(this.data.perWave/this.selected.length*(1+.2*(this.random()>=.5?1:-1))):0}
}
