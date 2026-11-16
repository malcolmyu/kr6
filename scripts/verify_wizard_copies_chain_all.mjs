import {spawnSync} from 'node:child_process'
for(const level of [1,2,3])for(const kind of ['follow','empty']){const r=spawnSync(process.execPath,['scripts/verify_wizard_copies_chain.mjs',String(level),kind],{stdio:'inherit'});if(r.status!==0)process.exit(r.status??1)}

for(const kind of ['follow','empty']){const r=spawnSync(process.execPath,['scripts/verify_wizard_copies_chain.mjs','3',kind,'--lcg'],{stdio:'inherit'});if(r.status!==0)process.exit(r.status??1)}
{const r=spawnSync(process.execPath,['scripts/verify_wizard_copies_chain.mjs','3','missing','--lcg'],{stdio:'inherit'});if(r.status!==0)process.exit(r.status??1)}
