import {execFileSync} from 'node:child_process'
for(const [level,kind]of [[1,'normal'],[2,'normal'],[3,'normal'],[3,'boss'],[3,'refresh']])process.stdout.write(execFileSync(process.execPath,['scripts/verify_archers_mark_chain.mjs',String(level),kind]))
