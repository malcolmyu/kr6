-- Shipped coroutine updates can catch/log errors instead of throwing. Fail
-- the export on those logs too, rather than blessing a partially stopped run.
local interpreter=arg[-1]or'luajit'
for _,kind in ipairs({'normal','constant','sequence'})do
 local path='analysis/native-level-runtime-'..kind..'.log'
 local command=interpreter..' scripts/export_level_entity_bootstrap.lua 3 iron entry normal runtime 1800 analysis/native-runtime-smoke-input.json'..(kind~='normal'and(' '..kind)or'')..' > '..path..' 2>&1'
 local status=os.execute(command);local file=assert(io.open(path));local output=file:read('*a');file:close()
 assert(status==0,output)
 assert(not output:find('%.ERROR')and not output:find('stack traceback')and not output:find('attempt to '),output)
 io.write(output)
end
