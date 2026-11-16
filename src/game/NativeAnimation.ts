/** klove.animation_db.fni: runs anticipates the next simulation tick. */
export function nativeAnimationFrame(count:number,elapsed:number,loop:boolean,fps:number,tickLength=1/30){
 const time=Math.max(0,elapsed),epsilon=1e-9
 const frame=loop?Math.floor(time*fps+epsilon)%count:Math.max(0,Math.min(count-1,Math.ceil(time*fps+epsilon)-1))
 const runs=Math.max(0,Math.floor((Math.ceil((time+tickLength)*fps+epsilon)-1)/count))
 return {frame,runs}
}

/** main_script7 reads runs written by render22 on the preceding tick. */
export function nativeLogicAnimationFrame(count:number,time:number,startedAt:number,loop:boolean,fps:number,tickLength=1/30){
 const renderedAt=(Math.round(time/tickLength)-1)*tickLength
 return nativeAnimationFrame(count,renderedAt-startedAt,loop,fps,tickLength)
}
