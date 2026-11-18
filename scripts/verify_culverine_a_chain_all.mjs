import {execFileSync} from 'node:child_process'
for(const rank of [1,2,3])process.stdout.write(execFileSync(process.execPath,['scripts/verify_culverine_a_chain.mjs',String(rank)]))
for(const [rank,kind]of [[3,'purchase'],[3,'moving'],[3,'zero-armor'],[3,'sulfur-remove-source'],[3,'sulfur-remove-target'],[3,'sulfur-block-cast'],[1,'sulfur-purchase-windup']])process.stdout.write(execFileSync(process.execPath,['scripts/verify_culverine_a_chain.mjs',String(rank),kind]))

for(const kind of ['sulfur-remove-source','sulfur-remove-target','sulfur-block-cast'])process.stdout.write(execFileSync(process.execPath,['scripts/verify_culverine_a_chain.mjs','1',kind]))
