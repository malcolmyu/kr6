import {execFileSync} from 'node:child_process'
for(const [level,kind]of [[1,'normal'],[2,'normal'],[3,'normal'],[3,'combined'],[3,'upgrade'],[3,'sale'],[3,'release'],[1,'same'],[1,'c-in-a'],[1,'a-in-c']])process.stdout.write(execFileSync(process.execPath,['scripts/verify_archers_pierce_chain.mjs',String(level),kind]))
