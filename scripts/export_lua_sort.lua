package.path='reference/apk/assets/gc64/lib/?.lua;'..package.path
local encode=dofile('scripts/precise_json.lua');local rows={}
for length=0,100 do for _,kind in ipairs({'equal','ascending','descending','alternating','duplicate','permuted'})do
 local t={};for i=1,length do local rank=kind=='equal'and 1 or kind=='ascending'and i or kind=='descending'and(length-i)or kind=='alternating'and(i%2)or kind=='duplicate'and math.floor(i/4)or(i*17%13);t[i]={id=i,rank=rank}end
 local input={};for i,v in ipairs(t)do input[i]={id=v.id,rank=v.rank}end;local calls={}
 table.sort(t,function(a,b)calls[#calls+1]={a.id,b.id};return a.rank<b.rank end)
 local output={};for i,v in ipairs(t)do output[i]=v.id end;rows[#rows+1]={input=input,output=output,calls=calls}
end end
local f=assert(io.open('analysis/lua-sort-oracle.json','w'));f:write(encode(rows));f:close();print(#rows..' original LuaJIT table.sort cases exported')
