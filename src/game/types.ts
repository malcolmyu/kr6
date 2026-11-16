export interface Point { x: number; y: number }
export interface LevelEntity { template: string; pos?: Point; [key: string]: unknown }
export interface LevelData {
  navigation?:import('./EnemyPath').Navigation
  data: { entities_list: LevelEntity[]; custom_start_pos: { pos: Point; zoom: number };custom_spawn_pos?:{pos:Point}[] }
  paths: { curves: { nodes: Point[] }[]; active: boolean[]; paths: Point[][][] }
  grid: {ox:number;oy:number;grid:number[][]}
}
export type GameMode = 'campaign' | 'iron'
