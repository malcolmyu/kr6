/** Script 1592: start at 0, idle at 34/30 (same animation ts), end at 49/30. */
export function royalActorPose(age:number) {
 const tick=Math.round(age*30)/30
 if(tick>=7)return {name:'lvl1loopend',elapsed:age-49/30,done:true,loop:false}
 if(tick>=49/30)return {name:'lvl1loopend',elapsed:age-49/30,done:false,loop:false}
 if(tick>=34/30)return {name:'lvl1loop',elapsed:age,done:false,loop:true}
 return {name:'lvl1run',elapsed:age,done:false,loop:false}
}
