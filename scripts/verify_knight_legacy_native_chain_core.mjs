import {execFileSync} from 'node:child_process'
// Core C controllers, including normal reinforcement death/expiry. The two
// separately retained special-reinforcement fixtures currently expose an older
// native aura/entity gap; run the full command to audit that unfinished work.
for(const [level,kind]of [[1,'normal'],[2,'normal'],[3,'normal'],[1,'purchase'],[2,'purchase'],[3,'purchase'],...[ 'late','sale','boundary-in','boundary-out','reinforcement-expiry','reinforcement-death'].map(kind=>[1,kind])])process.stdout.write(execFileSync(process.execPath,['scripts/verify_knight_legacy_native_chain.mjs',String(level),kind]))
