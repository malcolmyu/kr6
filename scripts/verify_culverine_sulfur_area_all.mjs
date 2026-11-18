import {execFileSync} from 'node:child_process'
for(const rank of [1,2,3])for(const kind of ['normal','duplicate','dead','remove','no-magic','exit','banned','remove-area','mixed','higher-level'])process.stdout.write(execFileSync(process.execPath,['scripts/verify_culverine_sulfur_area.mjs',String(rank),kind]))
