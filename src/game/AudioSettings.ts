export const AUDIO_SETTINGS_KEY='kingdom-rush-6.audio-settings.v1'
export type VolumeKey='volume_music'|'volume_fx'
export type AudioVolumes=Record<VolumeKey,number>
export function clampVolume(value:unknown,fallback=1){return typeof value==='number'&&Number.isFinite(value)?Math.max(0,Math.min(1,value)):fallback}
/** Native popup captures the last non-zero value for the life of that window. */
export class AudioSettings {
 values:AudioVolumes
 private previous:AudioVolumes
 private storage:Pick<Storage,'getItem'|'setItem'>
 constructor(storage:Pick<Storage,'getItem'|'setItem'>){this.storage=storage;let saved:Partial<AudioVolumes>={};try{saved=JSON.parse(storage.getItem(AUDIO_SETTINGS_KEY)??'{}')??{}}catch{}
  this.values={volume_music:clampVolume(saved.volume_music),volume_fx:clampVolume(saved.volume_fx)};this.previous={...this.values}
 }
 beginWindow(){this.previous={...this.values}}
 set(key:VolumeKey,value:number){const volume=clampVolume(value);this.values[key]=volume;if(volume!==0)this.previous[key]=volume;return volume}
 toggle(key:VolumeKey){return this.set(key,this.values[key]===0?(this.previous[key]||1):0)}
 save(){this.storage.setItem(AUDIO_SETTINGS_KEY,JSON.stringify(this.values))}
}
