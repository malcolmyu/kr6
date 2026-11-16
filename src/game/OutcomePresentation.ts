import timing from '../../public/data/outcome-timing.json' with {type:'json'}
interface Scheduler {after:(seconds:number,fn:()=>void)=>unknown;cancel:(handle:unknown)=>void}
const wall:Scheduler={after:(seconds,fn)=>setTimeout(fn,seconds*1000),cancel:handle=>clearTimeout(handle as ReturnType<typeof setTimeout>)}
/** game-victory1131 schedules HUD hide and c_show_victory4163 on GUI time. */
export class OutcomePresentation {
 private handles:unknown[]=[]
 private scheduler:Scheduler
 constructor(scheduler:Scheduler=wall){this.scheduler=scheduler}
 begin(kind:'victory'|'defeat',hide:()=>void,show:()=>void){this.clear();if(kind==='defeat'){hide();show();return}this.handles.push(this.scheduler.after(timing.hideHud,hide),this.scheduler.after(timing.show,show))}
 clear(){for(const h of this.handles)this.scheduler.cancel(h);this.handles=[]}
}
