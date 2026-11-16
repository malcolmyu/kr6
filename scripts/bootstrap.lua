-- Desktop compatibility entry point; original bytecode remains untouched.
KR_GAME, KR_TARGET, KR_PLATFORM = 'kr6', 'phone', 'mac'
package.loaded.main_globals = true
love.window.isCreated = love.window.isOpen
love.graphics.isCreated = love.graphics.isActive
love.mouse.hasCursor = function() return true end
love.window.getPixelScale = love.window.getDPIScale
local source = love.audio.newSource(love.sound.newSoundData(1, 22050, 16, 1))
getmetatable(source).__index.isStopped = function(self) return not self:isPlaying() end
source:release()
local shader = love.graphics.newShader('vec4 effect(vec4 c, Image t, vec2 uv, vec2 p) { return c * Texel(t, uv); }')
getmetatable(shader).__index.getExternVariable = function(self, name) return self:hasUniform(name) end
shader:release()
-- The shipped engine uses LÖVE 0.10's byte-valued colour interface.
for _, name in ipairs({'setColor', 'setBackgroundColor'}) do
  local fn = love.graphics[name]
  love.graphics[name] = function(r,g,b,a)
    if type(r) == 'table' then r,g,b,a = unpack(r) end
    return fn(r/255,g/255,b/255,(a or 255)/255)
  end
end
for _, name in ipairs({'getColor', 'getBackgroundColor'}) do
  local fn = love.graphics[name]
  love.graphics[name] = function()
    local r,g,b,a = fn()
    return r*255,g*255,b*255,a*255
  end
end
love.filesystem.isFile = function(p) return love.filesystem.getInfo(p, 'file') ~= nil end
love.filesystem.isDirectory = function(p) return love.filesystem.getInfo(p, 'directory') ~= nil end
local original_require = require
function require(name)
  local result = original_require(name)
  if name == 'features' then
    for _, service in pairs(result.platform_services or {}) do
      service.enabled = false
    end
  end
  if name == 'director' then
    -- Offline harness has no network services; don't submit or persist consent.
    result.skip_checks.check_skip_consent = function() return true end
    result.skip_checks.check_skip_consent_simple = function() return true end
  end
  if name == 'main_utils' and not result.desktop_compat then
    result.desktop_compat = true
    -- Stock LÖVE uses the OS default sRGB framebuffer; the mobile vendor's
    -- optional display-profile dylib isn't distributed in the APK.
    result.apply_colorspace = function() end
  end
  return result
end
assert(love.filesystem.load('original_main.lua'))()
local draw = love.draw
local frames = 0
local update = love.update
love.update = function(dt)
  update(dt)
  -- Explicit opt-in, local development automation only.
  if os.getenv('KR_DEV_CONTROL') == '1' then
    local path = love.filesystem.getSource() .. '/control.lua'
    local file = io.open(path, 'r')
    if file then
      local code = file:read('*a'); file:close(); os.remove(path)
      local ok, err = pcall(assert(loadstring(code)))
      if not ok then print('DEV CONTROL ERROR: ' .. tostring(err)) end
    end
  end
end
love.draw = function(...)
  draw(...)
  frames = frames + 1
  if frames % 300 == 0 then
    love.graphics.captureScreenshot('desktop-preview.png')
  end
end
