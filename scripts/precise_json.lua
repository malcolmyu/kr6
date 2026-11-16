-- Preserve IEEE754 boundary inputs when dkjson's default14digits are too short.
local J=require('dkjson')
local function tagged(value)
 if type(value)=='number'and(value~=math.floor(value)or value==0 and 1/value<0)then return'@f64:'..string.format('%.17g',value)end
 if type(value)~='table'then return value end
 local result={};for key,v in pairs(value)do result[key]=tagged(v)end;return result
end
return function(value)return(J.encode(tagged(value)):gsub('"@f64:([%d%.eE%+%-]+)"','%1'))end
