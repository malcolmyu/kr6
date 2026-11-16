import {readFileSync,writeFileSync} from 'node:fs'
const input=JSON.parse(readFileSync('analysis/reference-inputs/page06-opening.json')),sceneStart=13.5
const commands=input.actions.map(a=>{const media=(a.window[0]+a.window[1])/2,tick=Math.round((media-sceneStart)*30)+1,pos=a.pixel&&{x:a.pixel[0]/input.projection.scale+input.projection.left,y:input.projection.height-a.pixel[1]/input.projection.scale};if(a.action==='build')return{tick,kind:'build',holder:a.site,tower:a.kind};if(a.action==='wave')return{tick,kind:'send_wave'};if(a.action==='hero-rally')return{tick,kind:'hero-rally',name:a.name,pos};if(a.action==='rally')return{tick,kind:'rally',holder:a.site,pos};return{tick,kind:'power',power:a.action,pos}})
// The observed82–83s build window includes first affordability at2082 (82.8667s); midpoint2071 only has95gold.
commands.find(c=>c.kind==='build'&&c.holder==='11').tick=2082
writeFileSync('analysis/native-runtime-video-observed-input.json',JSON.stringify(commands,null,2)+'\n');writeFileSync('analysis/native-runtime-video-observed-profile.json',readFileSync('analysis/native-runtime-video-opening-profile.json'));console.log(commands)
