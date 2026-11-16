-- Use the original shipped TSV parser; compiled wave tables are stale.
local root = 'reference/apk/assets/gc64/'
package.path = root .. 'lib/?.lua;' .. root .. 'all/?.lua;' .. package.path
love = {filesystem = {}, timer = {getTime = os.clock}}
function love.filesystem.isFile(path) local f=io.open(path); if f then f:close(); return true end; return false end
function love.filesystem.read(path) local f=assert(io.open(path));local s=f:read('*a'); f:close(); return s end
require('klua.table')
require('klua.dump')
local db = require('wave_db')
local json = require('dkjson')
for level=1,3 do
  for _,mode in ipairs({'campaign','iron'}) do
    local prefix=string.format('level%02d',level)
    local text=love.filesystem.read(root..'kr6/data/waves/'..prefix..'_waves_'..mode..'.tsv')
    assert(db:load_tsv(prefix,mode=='campaign' and GAME_MODE_CAMPAIGN or GAME_MODE_IRON,text))
    assert(not db.parse_errors or #db.parse_errors==0, 'wave parse errors')
    local out=assert(io.open('public/data/'..prefix..'-'..mode..'.json','w'))
    out:write(assert(json.encode({format='tsv',properties=db.db,commands=db.db_cmds,status=db.db_waves_status})))
    out:close()
  end
end
