"""Fetch the user's public iron2/iron3 references at the API's available quality."""
import concurrent.futures,json,pathlib,shutil,subprocess,sys,urllib.request
ROOT=pathlib.Path(__file__).resolve().parents[1]
PAGES=json.loads((ROOT/'analysis/bilibili-video.json').read_text())['data']['pages']
PROXY='http://127.0.0.1:7897'
def fetch(index):
 page=PAGES[index-1];opener=urllib.request.build_opener(urllib.request.ProxyHandler({'https':PROXY,'http':PROXY}));headers={'User-Agent':'Mozilla/5.0','Referer':'https://www.bilibili.com/','Cache-Control':'no-cache'}
 api=f"https://api.bilibili.com/x/player/playurl?bvid=BV1tCaP6GEtq&cid={page['cid']}&qn=80&fnval=1"
 data=json.loads(opener.open(urllib.request.Request(api,headers=headers),timeout=30).read());assert data.get('code')==0,data.get('message')
 play=data['data'];target=ROOT/'reference/video'/f'page{index:02d}-reference.mp4';target.parent.mkdir(parents=True,exist_ok=True)
 if not target.exists():
  temp=target.with_suffix('.part');item=play['durl'][0]
  failure=None
  for url in [item['url'],*(item.get('backup_url')or[])]:
   try:
    with opener.open(urllib.request.Request(url,headers=headers),timeout=60)as response,temp.open('wb')as f:shutil.copyfileobj(response,f)
    failure=None;break
   except Exception as e:failure=e;print(f'page{index}: source failed ({type(e).__name__}); trying supplied backup',flush=True)
  if failure:raise failure
  assert temp.stat().st_size==item['size'],f"Incomplete page{index} download: {temp.stat().st_size}/{item['size']}"
  temp.rename(target)
 meta=json.loads(subprocess.check_output(['/opt/homebrew/bin/ffprobe','-v','error','-show_streams','-show_format','-of','json',str(target)]));video=next(s for s in meta['streams']if s['codec_type']=='video');duration=float(meta['format']['duration']);assert abs(duration-play['timelength']/1000)<2
 (ROOT/f'analysis/video-page{index:02d}-media.json').write_text(json.dumps({'page':page['part'],'cid':page['cid'],'quality':play['quality'],'width':video['width'],'height':video['height'],'duration':duration,'bytes':target.stat().st_size},ensure_ascii=False,indent=2))
 return f"page{index}: quality{play['quality']}, {video['width']}x{video['height']}, {duration:.3f}s, {target.stat().st_size} bytes"
if __name__=='__main__':
 with concurrent.futures.ThreadPoolExecutor(max_workers=2)as pool:
  for result in pool.map(fetch,[int(p)for p in sys.argv[1:]]or[4,6]):print(result,flush=True)
