dofile('scripts/controlled_paint_transform.lua')
local family=arg[15]or'c'
dofile(family=='a'and'scripts/export_catapult_native_area_chain.lua'or family=='b'and'scripts/export_catapult_b_native_chain.lua'or'scripts/export_catapult_c_native_chain.lua')
