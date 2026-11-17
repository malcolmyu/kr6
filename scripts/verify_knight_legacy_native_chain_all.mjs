import {execFileSync} from 'node:child_process'
process.stdout.write(execFileSync(process.execPath,['scripts/verify_knight_legacy_native_chain_core.mjs']))
for(const kind of ['reinforcement-expiry-special','reinforcement-death-special','reinforcement-early-death-special','reinforcement-repeat-special'])process.stdout.write(execFileSync(process.execPath,['scripts/verify_knight_legacy_native_chain.mjs','1',kind]))
