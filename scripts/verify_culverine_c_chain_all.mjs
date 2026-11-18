import {execFileSync} from 'node:child_process'
for(const rank of [1,2,3])process.stdout.write(execFileSync(process.execPath,['scripts/verify_culverine_c_chain.mjs',String(rank)]))
for(const [rank,kind]of [[3,'purchase'],[1,'throttle-upgrade'],[1,'throttle-remove-source'],[1,'throttle-remove-early'],[1,'throttle-remove-target'],[1,'throttle-target-gap'],[1,'throttle-block-prep'],[1,'throttle-block-shot'],[1,'moving'],[1,'b-combo']])process.stdout.write(execFileSync(process.execPath,['scripts/verify_culverine_c_chain.mjs',String(rank),kind]))
