import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = path => JSON.parse(readFileSync(path, 'utf8'))
const balance = read('public/data/balance.json')
const known = new Set(Object.values(balance.enemies).flatMap(group => Object.keys(group)))
// templates_game.lua registers enemy_bandit_tut as an enemy_bandit subtype.
assert(balance.specials.stage_01.tutorial_bandit)
known.add('bandit_tut')
const results = []
for (let level=1;level<=3;level++) {
  const prefix = `level${String(level).padStart(2,'0')}`
  const data = read(`public/data/${prefix}.json`)
  for (const mode of ['campaign','iron']) {
    const program = read(`public/data/${prefix}-${mode}.json`)
    assert.equal(program.format,'tsv')
    const commands = program.commands
    const lives = commands.find(c=>c.name==='lives').value
    assert.equal(lives,mode==='campaign'?20:1)
    let count = 0
    for (const command of commands) {
      for (const spawn of command.spawns ?? []) {
        count++
        assert(known.has(spawn.enemy.replace(/^enemy_/,'')), `${prefix} ${mode}: ${spawn.enemy}`)
        assert(data.paths.paths[spawn.pi-1], `Missing path ${spawn.pi}`)
        if (spawn.spi !== '*') assert(data.paths.paths[spawn.pi-1][spawn.spi-1], `Missing lane ${spawn.spi}`)
      }
    }
    assert(count>0)
    results.push({level,mode,lives,spawns:count,waves:commands.filter(c=>c.name==='wave').length})
  }
}
const first = read('public/data/level01-campaign.json').commands.filter(c=>c.name==='spawn')
assert.deepEqual(first.slice(0,5).map(c=>c.wait_time),[2,.8,.8,.4,.4])
assert.equal(read('public/data/level01-campaign.json').commands.find(c=>c.name==='gold').value,175)
console.table(results)
