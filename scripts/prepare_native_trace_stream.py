"""Split an original native JSON trace without dropping or projecting any frame field."""
import hashlib,json,os,sys
source=sys.argv[1]
collection=sys.argv[2]if len(sys.argv)>2 else'frames'
assert collection in ('frames','samples')
class Reader:
 def __init__(self,path):self.f=open(path,encoding='utf-8');self.buf='';self.pos=0;self.eof=False;self.decoder=json.JSONDecoder()
 def more(self):
  self.buf=self.buf[self.pos:];self.pos=0;s=self.f.read(1024*1024);self.eof=not s;self.buf+=s
 def ws(self):
  while True:
   while self.pos<len(self.buf) and self.buf[self.pos].isspace():self.pos+=1
   if self.pos<len(self.buf) or self.eof:return
   self.more()
 def char(self):self.ws();return self.buf[self.pos:self.pos+1]
 def take(self,c):assert self.char()==c,(c,self.char());self.pos+=1
 def value(self):
  while True:
   self.ws()
   try:
    value,end=self.decoder.raw_decode(self.buf,self.pos)
    if end==len(self.buf) and not self.eof:self.more();continue
    raw=self.buf[self.pos:end];self.pos=end;return value,raw
   except json.JSONDecodeError:
    if self.eof:raise
    self.more()
r=Reader(source);r.take('{');meta={};count=0;frames=source+'.'+collection+'.jsonl'
with open(frames+'.tmp','w',encoding='utf-8') as out:
 while r.char()!='}':
  key,_=r.value();r.take(':')
  if key==collection:
   r.take('[')
   while r.char()!=']':
    frame,raw=r.value();assert isinstance(frame,dict);out.write(raw+'\n');count+=1
    if r.char()==',':r.take(',')
    else:assert r.char()==']'
   r.take(']')
  else:meta[key]=r.value()[0]
  if r.char()==',':r.take(',')
  else:assert r.char()=='}'
r.take('}');assert not r.char();assert count>0
os.replace(frames+'.tmp',frames)
h=hashlib.sha256()
with open(source,'rb') as f:
 for block in iter(lambda:f.read(1024*1024),b''):h.update(block)
fh=hashlib.sha256()
with open(frames,'rb') as f:
 for block in iter(lambda:f.read(1024*1024),b''):fh.update(block)
meta['_frameStream']={'framesSha256':fh.hexdigest(),'frames':os.path.basename(frames),'count':count,'sourceBytes':os.path.getsize(source),'sourceSha256':h.hexdigest()}
if collection!='frames':meta['_frameStream']['collection']=collection
with open(source+'.meta.json','w',encoding='utf-8') as f:json.dump(meta,f,separators=(',',':'),ensure_ascii=False)
print(json.dumps(meta['_frameStream']))
