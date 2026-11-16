import type { Point } from './types'

/** Traverses the original sampled lanes, never an interpolated substitute curve. */
export class PathFollower {
  private index = 0
  private offset = 0
  readonly position: Point
  direction: Point = { x: 0, y: 0 }
  finished = false
  readonly nodes: readonly Point[]
  get remainingNodes():number { return this.nodes.length-this.index-1 }
  predict(distance:number):Point {
    const next=new PathFollower(this.nodes)
    next.index=this.index;next.offset=this.offset;next.finished=this.finished
    next.position.x=this.position.x;next.position.y=this.position.y
    next.advance(distance)
    return next.position
  }
  constructor(nodes: readonly Point[]) {
    this.nodes = nodes
    if (!nodes.length) throw new Error('Empty enemy path')
    this.position = { ...nodes[0] }
  }
  advance(distance: number): void {
    if (!Number.isFinite(distance) || distance < 0) throw new Error('Invalid travel distance')
    while (!this.finished) {
      const a = this.nodes[this.index], b = this.nodes[this.index + 1]
      if (!b) { this.finished = true; break }
      const dx = b.x-a.x, dy = b.y-a.y, length = Math.hypot(dx,dy)
      if (length === 0) { this.index++; continue }
      this.direction = { x: dx/length, y: dy/length }
      const remaining = length-this.offset
      if (distance >= remaining) {
        distance -= remaining; this.index++; this.offset = 0
        this.position.x = b.x; this.position.y = b.y
      } else {
        this.offset += distance
        this.position.x = a.x+dx*this.offset/length
        this.position.y = a.y+dy*this.offset/length
        break
      }
    }
  }
}
