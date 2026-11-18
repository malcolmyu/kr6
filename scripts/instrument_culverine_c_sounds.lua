return function(source)
 local function replace(a,b)local first,last=assert(source:find(a,1,true));assert(not source:find(a,last+1,true));source=source:sub(1,first-1)..b..source:sub(last+1)end
 replace('local currentStore,activeUpdate',[[local currentStore,activeUpdate
local cSoundRequests={};local cSound=require('sound_db');local cSoundQueue=cSound.queue
cSound.queue=function(self,name,options,...)
 if type(name)=='string'and name:match('^TowerCulverin')then cSoundRequests[#cSoundRequests+1]={tick=currentStore and currentStore.tick or 0,name=name,delay=options and options.delay}end
 return cSoundQueue(self,name,options,...)
end]])
 replace('result.profileOverrides=runtimeProfile;', 'result.cSoundRequests=cSoundRequests;result.profileOverrides=runtimeProfile;')
 return source
end
