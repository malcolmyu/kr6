export function attackDamageValue(min:number,max:number,factor:number,random:()=>number) {
 const low=min*factor,high=max*factor
 return Math.ceil(low+(high-low)*random())
}
/** SU.create_bullet_damage: ceil the continuous roll, then ceil its damage factor. */
export function bulletDamageValue(min:number,max:number,factor:number,random:()=>number) {
 return Math.max(1,Math.ceil(factor*attackDamageValue(min,max,1,random)))
}
