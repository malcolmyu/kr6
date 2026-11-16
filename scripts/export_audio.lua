local json=require('dkjson')
local root='reference/apk/assets/kr6-phone/sounds/'
local sounds=dofile(root..'sounds.lua');local settings=dofile(root..'settings.lua')
local output={sounds=sounds,settings=settings}
local file=assert(io.open('public/data/audio.json','w'));file:write(assert(json.encode(output)));file:close()
os.execute('mkdir -p public/audio')
local count=0
for _,definition in pairs(sounds) do
 for _,name in ipairs(definition.files or {}) do
  local source=io.open(root..'files/'..name,'rb')
  if source then
   local dest=assert(io.open('public/audio/'..name,'wb'));dest:write(source:read('*a'));source:close();dest:close();count=count+1
  end
 end
end
print('Audio references exported: '..count)
