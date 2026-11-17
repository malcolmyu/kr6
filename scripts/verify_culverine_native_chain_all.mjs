import {execFileSync} from 'node:child_process'
for(const level of [1,2,3,4])process.stdout.write(execFileSync(process.execPath,['scripts/verify_culverine_native_chain.mjs',String(level)]))
for(const kind of ['remove-target-before','remove-target-after','remove-source','moving'])process.stdout.write(execFileSync(process.execPath,['scripts/verify_culverine_native_chain.mjs','4',kind]))
