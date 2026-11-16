"""Capture comparison frames from the user's six referenced playthroughs."""
import concurrent.futures
import json
import pathlib
import subprocess
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'analysis/video-frames'
OUT.mkdir(parents=True, exist_ok=True)
PAGES = json.loads((ROOT / 'analysis/bilibili-video.json').read_text())['data']['pages'][:6]
PROXY = 'http://127.0.0.1:7897'


def capture(page, times=None):
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({'https': PROXY, 'http': PROXY}))
    api = f"https://api.bilibili.com/x/player/playurl?bvid=BV1tCaP6GEtq&cid={page['cid']}&qn=32&fnval=1"
    request = urllib.request.Request(api, headers={'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.bilibili.com/'})
    data = json.loads(opener.open(request, timeout=20).read())
    if data.get('code') != 0:
        raise RuntimeError(f"Reference API rejected page {page['page']}: {data.get('message')}")
    url = data['data']['durl'][0]['url']
    times = times or [10, 45, 120, page['duration'] - 30]
    for at in times:
        target = OUT / f"page{page['page']:02d}-{at:03d}s.png"
        if target.exists():
            continue
        command = ['/opt/homebrew/bin/ffmpeg', '-hide_banner', '-loglevel', 'error', '-http_proxy', PROXY,
                   '-headers', 'Referer: https://www.bilibili.com/\r\nUser-Agent: Mozilla/5.0\r\n',
                   '-ss', str(at), '-i', url, '-frames:v', '1', '-update', '1', '-y', str(target)]
        subprocess.run(command, check=True, timeout=90, stdout=subprocess.DEVNULL)
        if not target.exists():
            # Some CDN range responses end early despite ffmpeg returning success.
            # Decode from the beginning when a random-access request yielded no image.
            command = ['/opt/homebrew/bin/ffmpeg', '-hide_banner', '-loglevel', 'error', '-http_proxy', PROXY,
                       '-headers', 'Referer: https://www.bilibili.com/\r\nUser-Agent: Mozilla/5.0\r\n',
                       '-i', url, '-ss', str(at), '-frames:v', '1', '-update', '1', '-y', str(target)]
            subprocess.run(command, check=True, timeout=90, stdout=subprocess.DEVNULL)
        if not target.exists() or target.stat().st_size == 0:
            raise RuntimeError(f"No reference image produced for page {page['page']} at {at}s")
    return f"Page {page['page']}: {page['part']} — {len(times)} comparison frames"


if __name__ == '__main__':
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        futures = [executor.submit(capture, page) for page in PAGES]
        for future in concurrent.futures.as_completed(futures):
            print(future.result(), flush=True)
