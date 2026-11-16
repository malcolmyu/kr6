import type {GameMode} from './types'
/** End of original level01.update, level02.update; level03 has no update script. */
export class StageFlow {
  private clearSince?:number
  private stage:number
  private mode:GameMode
  private tutorialRequired:boolean
  constructor(stage:number,mode:GameMode,tutorialRequired=true){this.stage=stage;this.mode=mode;this.tutorialRequired=tutorialRequired}
  advance(time:number,wavesFinished:boolean,alive:boolean,tutorialFinished:boolean):boolean {
    if(this.stage===3)return true
    if(!wavesFinished || alive){this.clearSince=undefined;return false}
    if(this.stage===2)return true
    if(this.stage===1) {
      if(this.mode==='campaign' && this.tutorialRequired && !tutorialFinished)return false
      this.clearSince??=time
      return time-this.clearSince+1e-9>=2
    }
    return false
  }
}
