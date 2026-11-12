import Phaser from 'phaser';
import { musicScale } from '../core/settings';
import { settings } from './settings';
import { MUSIC, MUSIC_DUCK, MUSIC_FADE, MUSIC_LEVEL, type MusicId } from './musics';
import { levelStep, rampVolume } from './musicRamp';

interface Voice {
  id: MusicId;
  sound: Phaser.Sound.BaseSound;
  /** Own volume, 0 to 1, moving toward `target` (1 while it is the current track, 0 when it fades out). */
  vol: number;
  target: number;
}

/**
 * Plays the tracks of render/musics.ts through Phaser's sound manager (its own gesture unlock): one track at a
 * time, looping from the track's loop point, cross-fading when the track changes. Files load lazily on first use.
 * Mute and the music option silence it (and skip the download); the pause screen ducks it instead of stopping it.
 */
class MusicPlayer {
  private voices: Voice[] = [];
  /** The track that should be playing, whether or not it has loaded yet. */
  private wanted: MusicId | null = null;
  private duckTarget = 1;
  private duckNow = 1;
  private hooked = false;
  /** Tracks whose file is downloading, so a second play() during the download does not start a second voice. */
  private loading = new Set<MusicId>();

  /** Starts `id` (a cross-fade from the current one); `null` fades everything out. Same track again does nothing. */
  play(scene: Phaser.Scene, id: MusicId | null): void {
    this.hook(scene.game);
    this.wanted = id;
    for (const v of this.voices) v.target = v.id === id ? 1 : 0;
    if (!id || this.silenced() || this.voices.some((v) => v.id === id)) return;
    if (scene.cache.audio.exists(id)) return this.start(scene, id);
    if (this.loading.has(id)) return;
    this.loading.add(id);
    // A loader only lives as long as its scene: if the scene is left mid-load, the next play() tries again.
    scene.load.once(`filecomplete-audio-${id}`, () => {
      this.loading.delete(id);
      if (this.wanted === id && !this.silenced()) this.start(scene, id);
    });
    scene.load.once(Phaser.Loader.Events.COMPLETE, () => this.loading.delete(id));
    scene.load.audio(id, import.meta.env.BASE_URL + MUSIC[id].url);
    if (!scene.load.isLoading()) scene.load.start();
  }

  /** Plays the wanted track again after it was silenced (the Options toggles call this). */
  sync(scene: Phaser.Scene): void {
    this.play(scene, this.wanted);
  }

  /** The pause screen ducks the music instead of stopping it. */
  duck(on: boolean): void {
    this.duckTarget = on ? MUSIC_DUCK : 1;
  }

  private silenced(): boolean {
    const s = settings();
    return s.muted || !s.music;
  }

  private start(scene: Phaser.Scene, id: MusicId): void {
    if (this.voices.some((v) => v.id === id)) return;
    const def = MUSIC[id];
    const sound = scene.sound.add(id, { loop: true, volume: 0 });
    // Web Audio only: the source loops back to `loopStart` instead of 0. A resumed sound makes a new source.
    const point = () => {
      const src = (sound as Phaser.Sound.WebAudioSound).source;
      if (src) src.loopStart = def.loopStart;
    };
    sound.on('play', point);
    sound.on('resume', point);
    sound.play();
    this.voices.push({ id, sound, vol: 0, target: 1 });
  }

  private hook(game: Phaser.Game): void {
    if (this.hooked) return;
    this.hooked = true;
    game.events.on(Phaser.Core.Events.POST_STEP, (_t: number, dt: number) => this.tick(dt / 1000));
  }

  private tick(dt: number): void {
    if (this.voices.length === 0) return;
    this.duckNow = levelStep(this.duckNow, this.duckTarget, dt);
    const silent = this.silenced();
    const level = silent ? 0 : MUSIC_LEVEL * musicScale(settings()) * this.duckNow;
    for (let i = this.voices.length - 1; i >= 0; i--) {
      const v = this.voices[i] as Voice;
      const sound = v.sound as Phaser.Sound.WebAudioSound;
      // The fade only runs once the sound is unlocked: the first touch brings the track in with its full fade.
      v.vol = rampVolume(v.vol, v.target, dt, MUSIC_FADE, !v.sound.manager.locked);
      if (v.vol === 0 && v.target === 0) {
        v.sound.destroy();
        this.voices.splice(i, 1);
      } else if (silent && v.target === 1) {
        // Silenced: pause where it is, so switching it back on continues from there (only a track change destroys).
        if (sound.isPlaying) sound.pause();
      } else if (sound.isPaused && v.target === 1) {
        sound.resume();
        sound.setVolume(v.vol * MUSIC[v.id].vol * level);
      } else if (sound.isPlaying) {
        sound.setVolume(v.vol * MUSIC[v.id].vol * level);
      }
    }
  }
}

export const music = new MusicPlayer();
