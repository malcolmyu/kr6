-- Run from repository root: luajit scripts/export_data.lua
local root = 'reference/apk/assets/gc64/'
package.path = root .. 'lib/?.lua;' .. package.path
local serpent = require('serpent')
for level = 1, 3 do
  for _, suffix in ipairs({'data', 'paths', 'grid'}) do
    local name = string.format('level%02d_%s', level, suffix)
    local value = assert(loadfile(root .. 'kr6/data/levels/' .. name .. '.lua'))()
    local out = assert(io.open('analysis/' .. name .. '.lua', 'w'))
    out:write('return ', serpent.block(value, {comment=false}), '\n')
    out:close()
  end
end
