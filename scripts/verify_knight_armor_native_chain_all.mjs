import {execFileSync} from 'node:child_process'
for(const [level,kind] of [[1,'normal'],[2,'normal'],[3,'normal'],[1,'upgrade'],[1,'upgrade-near'],[1,'sale'],[1,'death'],[1,'death-upgrade']])process.stdout.write(execFileSync(process.execPath,['scripts/verify_knight_armor_native_chain.mjs',String(level),kind]))
