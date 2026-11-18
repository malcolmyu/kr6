import {execFileSync} from 'node:child_process'
for(const rank of [1,2,3])process.stdout.write(execFileSync(process.execPath,['scripts/verify_culverine_b_chain.mjs',String(rank)]))
for(const [rank,kind]of [[3,'purchase'],[1,'mid-windup'],[3,'zero-armor'],[3,'remove-source'],[3,'remove-target-before'],[3,'moving']])process.stdout.write(execFileSync(process.execPath,['scripts/verify_culverine_b_chain.mjs',String(rank),kind]))
