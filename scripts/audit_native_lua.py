from pathlib import Path
import hashlib, json, subprocess, zipfile
root=Path(__file__).resolve().parents[1]
apk=Path('/Users/yuminghao/Downloads/1c00e4e7-29fa-4c21-9088-b6d43fe75d62.apk')
with zipfile.ZipFile(apk) as z: native=z.read('lib/arm64-v8a/liblove.so')
def version(binary):
    r=subprocess.run([str(binary),'-e',"print(jit.version);print(jit.arch);print(jit.status())"],cwd=root,text=True,capture_output=True,check=True)
    return {'binary':str(binary),'sha256':hashlib.sha256(Path(binary).read_bytes()).hexdigest(),'output':r.stdout.strip().splitlines()}
def project(value,shape):
    if isinstance(shape,dict): return {k:project(value[k],v) for k,v in shape.items()}
    if isinstance(shape,list): return [project(a,b) for a,b in zip(value,shape)] if len(value)==len(shape) else None
    return value
def no_runtime(value):
    if isinstance(value,dict): return {k:no_runtime(v) for k,v in value.items() if k!='runtime'}
    if isinstance(value,list): return [no_runtime(v) for v in value]
    return value
old=json.loads((root/'analysis/wizard-bolt-paired-sequence-rolling-oracle.json').read_text())
new=json.loads((root/'analysis/wizard-bolt-paired-sequence-oracle.json').read_text())
a=json.loads((root/'analysis/lua-entity-table-oracle.json').read_text());b=json.loads((root/'analysis/lua-entity-table-rolling-oracle.json').read_text())
report={'apk':str(apk),'library':'lib/arm64-v8a/liblove.so','librarySha256':hashlib.sha256(native).hexdigest(),'embeddedVersionLabel':'LuaJIT 2.1.0-beta3','embeddedVersionLabelPresent':b'LuaJIT 2.1.0-beta3' in native,'embeddedApiVersionSymbolPresent':b'luaJIT_version_2_1_0_beta3' in native,'exactApkForkIdentityProven':False,'upstreamCommit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=root/'reference/luajit-beta3',text=True).strip(),'upstreamUrl':'https://github.com/LuaJIT/LuaJIT/commit/8271c643c21d1b2f344e339f559f2de6f3663191','baseline':version(root/'reference/luajit-beta3/src/luajit'),'rolling':version(Path('/opt/homebrew/bin/luajit')),'numericTableTracesEqualAcrossVersions':a['rows']==b['rows'],'pairedBaselineRuntime':new[0].get('runtime'),'pairedRollingRuntime':old[0].get('runtime'),'pairedTracePriorFieldsEqualAcrossVersions':no_runtime(new)==no_runtime(old),'scope':'Version label and tested numeric-key behavior only. Does not prove APK engine patches, string/object hashing, native extensions, SSO or full application equivalence.'}
(root/'analysis/native-lua-runtime-audit.json').write_text(json.dumps(report,indent=2)+'\n')
print('Native Lua runtime labels, binaries, pinned source and cross-version numeric/entity traces audited')
