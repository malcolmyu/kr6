EXPORT_ENTITIES_NO_WRITE=true;dofile('scripts/export_entities.lua')
local E=require('entity_db');local S=require('systems');local J=require('dkjson');local rows={}
for _,born in ipairs({0,19})do
 local p=E:create_entity('pop_block');local store={tick_ts=born,entities={[p.id]=p}};local removed=false;simulation={queue_remove_entity=function()removed=true end};p.tween.ts=born;S.tween:on_insert(p,store);local frames={}
 for frame=0,36 do store.tick_ts=born+frame/30;if not removed then S.tween:on_update(1/30,store.tick_ts,store)end;frames[#frames+1]={at=store.tick_ts,removed=removed,scale=table.deepclone(p.render.sprites[1].scale)}end
 rows[#rows+1]={born=born,frames=frames}
end
local f=assert(io.open('analysis/block-pop-oracle.json','w'));f:write(J.encode(rows));f:close();print('Original block pop tween exported')
