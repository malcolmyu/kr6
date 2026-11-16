export interface SpawnCommand { enemy: string; pi: number; spi: number | '*' }
export interface WaveCommand {
  name: string
  wait_time?: number
  value?: unknown
  wave_name?: string
  signal_name?: string
  signal_params?: string[]
  spawns?: SpawnCommand[]
}
export interface WaveProgram { format: 'tsv'; commands: WaveCommand[] }
export interface IncomingWave {number:number;paths:number[];spawns:SpawnCommand[];flyingPaths?:number[];remaining:number;duration:number;startsAt:number}
type Event = { command: WaveCommand; time: number; track: string }
interface Track { name: string; index: number; end: number; due?: number; waiting?: string; stopped: boolean;waitStartedAt?:number }

/** Seconds from original TSV, including simultaneous spawns and signal gates.
 * Main and manually triggered tutorial tracks run concurrently, as in wave_db.
 */
export class WaveRunner {
  time = 0
  wave = 0
  private tracks: Track[] = []
  private manual = new Map<string, { start: number; end: number }>()
  private startedManual=new Set<string>()
  private main: Track
  private commands: WaveCommand[]
  private emit: (event: Event) => void
  private nativeTicks:boolean
  constructor(program: WaveProgram, emit: (event: Event) => void,nativeTicks=false) {
    this.nativeTicks=nativeTicks
    this.emit = emit
    this.commands = program.commands
    let mainEnd = this.commands.findIndex(c => c.name === 'manual_wave')
    if (mainEnd < 0) mainEnd = this.commands.length
    this.main = { name: 'main', index: 0, end: mainEnd, stopped: false }
    this.tracks.push(this.main)
    for (let i=mainEnd;i<this.commands.length;i++) {
      const command = this.commands[i]
      if (command.name !== 'manual_wave') continue
      let end = i+1
      while (end<this.commands.length && this.commands[end].name !== 'manual_wave') end++
      this.manual.set(command.wave_name!, {start:i+1,end})
    }
    this.advance(0)
  }
  get waitingForWave(): boolean { return this.main.waiting === 'next-wave-sent' }
  get totalWaves():number{return this.commands.filter(c=>c.name==='wave').length}
  get nextWave():IncomingWave|undefined {
    const command=this.commands[this.main.index]
    if(this.main.stopped || command?.name!=='wave')return
    const paths=new Set<number>(),spawns:SpawnCommand[]=[]
    for(let i=this.main.index+1;i<this.main.end && this.commands[i].name!=='wave';i++)for(const spawn of this.commands[i].spawns??[]){paths.add(spawn.pi);spawns.push(spawn)}
    const duration=Math.max(0,command.wait_time??0)
    return {number:this.wave+1,paths:[...paths],spawns,duration,remaining:this.main.due===undefined?0:Math.max(0,this.main.due-this.time),startsAt:this.main.due===undefined?(this.main.waitStartedAt??this.time):this.main.due-duration}
  }
  get finished(): boolean { return this.tracks.every(t => t.stopped) }
  manualFinished(name:string):boolean {return this.startedManual.has(name) && this.tracks.some(t=>t.name===name && t.stopped)}
  /** Only an active wave command exposes a summon flag. Ordinary calls cannot
   * skip a spawn command; the native force_next_wave debug command is separate.
   * Returns seconds remaining on the active countdown for the reward formula. */
  callNextWave(): number {
    const index = this.main.index
    if (index>=this.main.end || this.commands[index].name!=='wave') return 0
    const remaining = index===this.main.index && this.main.due!==undefined
      ? Math.max(0,this.main.due-this.time) : 0
    this.main.index = index
    this.main.due = undefined
    this.main.waiting = 'next-wave-sent'
    this.signal('next-wave-sent')
    return remaining
  }
  startManual(name: string): void {
    const range = this.manual.get(name)
    if (!range) throw new Error(`Unknown manual wave: ${name}`)
    if (this.tracks.some(t=>t.name===name && !t.stopped)) return
    this.startedManual.add(name)
    this.tracks.push({name,index:range.start,end:range.end,stopped:false})
    this.advance(0)
  }
  signal(name: string): void {
    for (const track of this.tracks) {
      if (track.waiting !== name) continue
      track.waiting = undefined
      if (this.commands[track.index]?.name === 'wave') this.dispatch(track, this.commands[track.index])
      track.index++; track.due = undefined
      track.waitStartedAt=undefined
    }
    this.advance(0)
  }
  advance(dt: number): void {
    if (!Number.isFinite(dt) || dt<0) throw new Error('Invalid wave time step')
    const target = this.time+dt
    for (const track of this.tracks)if(this.nativeTicks)this.runNative(track,target);else this.run(track,target)
    this.time = target
  }
  advanceTick(time:number,sendWave=false){
    if(!Number.isFinite(time)||time<this.time)throw new Error('Invalid native wave timestamp')
    this.time=time
    // GUI summon flags are consumed at this simulation timestamp.
    if(sendWave)this.callNextWave()
    for(const track of this.tracks)this.runNative(track,time)
  }
  /** Native y_wait resumes when currentTime-startTime >= duration.
   * Each following wait starts on the actual resume tick, not the previous
   * theoretical deadline; spawn intervals therefore include quantization. */
  private runNative(track:Track,time:number){
    while(!track.stopped){
      if(track.index>=track.end){track.stopped=true;break}
      const command=this.commands[track.index],duration=command.wait_time??0
      if(track.waiting&&track.due===undefined)break
      if(track.due===undefined){
        if(command.name==='wave'&&duration<0){track.waiting='next-wave-sent';track.waitStartedAt=time;break}
        if(command.name==='wait_signal'){
          track.waiting=command.signal_name;track.waitStartedAt=time
          if(duration<0)break
        }
        if(duration>0){track.waitStartedAt=time;track.due=time+duration;break}
      }else if(time-track.waitStartedAt!<duration)break
      track.waiting=undefined;track.due=time
      this.dispatch(track,command)
      track.index++;track.due=undefined;track.waitStartedAt=undefined
    }
  }
  private dispatch(track: Track, command: WaveCommand) {
    if (command.name === 'wave') this.wave++
    this.emit({command,time:track.due ?? this.time,track:track.name})
  }
  private run(track: Track, target: number) {
    let cursor = this.time
    while (!track.stopped && (!track.waiting || track.due !== undefined)) {
      if (track.index>=track.end) { track.stopped=true; break }
      const command = this.commands[track.index]
      if (track.due === undefined) {
        if (command.name === 'wave' && command.wait_time === -1) {
          track.waiting = 'next-wave-sent';track.waitStartedAt=cursor; break
        }
        if (command.name === 'wait_signal') {
          track.waiting = command.signal_name
          if ((command.wait_time ?? -1)<0) break
        }
        track.due = cursor+Math.max(0,command.wait_time ?? 0)
      }
      if (track.due-target>1e-9) break
      cursor = track.due
      track.waiting = undefined
      this.dispatch(track,command)
      track.index++; track.due=undefined
    }
  }
}
