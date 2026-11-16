local json=require('dkjson')
local function read_exo(name)
  local base='reference/apk/assets/gc64/kr6/data/exoskeletons/'..name
  local file=io.open(base..'.exo3')
  if file then file:close();return dofile(base..'.exo3') end
  local old=dofile(base..'.lua')
  local result={fps=old.fps,partScaleCompensation=old.partScaleCompensation,parts={},animations={}}
  local indices={}
  for key,part in pairs(old.parts) do
    result.parts[#result.parts+1]={part.name or key,part.offsetX or 0,part.offsetY or 0};indices[key]=#result.parts
  end
  for _,animation in ipairs(old.animations) do
    local a={name=animation.name,frames={}}
    for _,frame in ipairs(animation.frames) do
      local f={}
      for _,part in ipairs(frame.parts or {}) do
        local x=part.xform
        f[#f+1]={1,assert(indices[part.name]),part.alpha or 1,x.x or 0,x.y or 0,x.sx or 1,x.sy or 1,x.r or 0,x.kx or 0,x.ky or 0}
      end
      a.frames[#a.frames+1]=f
    end
    result.animations[#result.animations+1]=a
  end
  return result
end
for stage=1,3 do
  local group=string.format('go_stage%02d',stage)
  local atlas=dofile('runtime/desktop_assets/kr6-phone/images/ipadhd/'..group..'.lua')
  local exos,animations,textures={},{},{}
  for _,frame in pairs(atlas) do textures[frame.a_name]=true end
  for file in io.popen('find reference/apk/assets/gc64/kr6/data/exoskeletons/'..group..' -name "*.exo3" 2>/dev/null'):lines() do
    exos[file:match('([^/]+)%.exo3$')]=dofile(file)
  end
  local level=dofile(string.format('reference/apk/assets/gc64/kr6/data/levels/level%02d_data.lua',stage))
  for _,name in ipairs(level.required_exoskeletons or {}) do
    exos[name]=read_exo(name)
  end
  for file in io.popen('find reference/apk/assets/gc64/kr6/data/animations/'..group..' -name "*.lua" 2>/dev/null'):lines() do
    for name,animation in pairs(dofile(file)) do animations[name]=animation end
  end
  local files={}
  for file in pairs(textures) do files[#files+1]=file;os.execute('cp runtime/desktop_assets/kr6-phone/images/ipadhd/'..file..' public/assets/') end
  local f=assert(io.open(string.format('public/data/level%02d-art.json',stage),'w'))
  f:write(assert(json.encode({atlas=atlas,exos=exos,textures=files,animations=animations})));f:close()
end
