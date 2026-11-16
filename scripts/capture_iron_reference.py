"""Extract local HD reference frames, without replacing the older comparison images."""
import concurrent.futures,pathlib,subprocess,sys
ROOT=pathlib.Path(__file__).resolve().parents[1];OUT=ROOT/'analysis/video-iron';OUT.mkdir(exist_ok=True)
page=int(sys.argv[1]);times=[float(t)for t in sys.argv[2:]]
source=ROOT/f'reference/video/page{page:02d}-reference.mp4'
if not source.exists():source=source.with_suffix('.part')
def capture(t):
 stamp=f'{int(t):03d}'if t.is_integer()else f'{t:06.2f}'
 target=OUT/f'page{page:02d}-{stamp}s.png'
 subprocess.run(['/opt/homebrew/bin/ffmpeg','-hide_banner','-loglevel','error','-ss',str(t),'-i',str(source),'-frames:v','1','-update','1','-y',str(target)],check=True,timeout=30)
 assert target.exists()and target.stat().st_size>0,f'No decodable frame at{t}s'
 return f'{page}:{t}s'
with concurrent.futures.ThreadPoolExecutor(max_workers=3)as pool:
 for result in pool.map(capture,times):print(result,flush=True)
