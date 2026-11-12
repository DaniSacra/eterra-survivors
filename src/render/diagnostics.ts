import Phaser from 'phaser';

/**
 * A black screen on some phones leaves no trace to look at, so this prints what it can on the page itself: script
 * errors, a lost WebGL context, and (with `?debug` in the URL) what the GPU reports. Plain DOM text, no game code.
 */
function line(text: string, color = '#ffb0a0'): void {
  try {
    let box = document.getElementById('diag');
    if (!box) {
      box = document.createElement('div');
      box.id = 'diag';
      box.style.cssText =
        'position:fixed;left:0;right:0;top:0;z-index:99;max-height:60vh;overflow:auto;padding:6px 10px;' +
        'background:rgba(0,0,0,.85);font:12px/1.35 monospace;white-space:pre-wrap;word-break:break-all;pointer-events:none';
      document.body.appendChild(box);
    }
    const row = document.createElement('div');
    row.style.color = color;
    row.textContent = text;
    box.appendChild(row);
  } catch {
    // Nothing to show it on.
  }
}

/** Shows script errors on screen; with `?debug`, also the renderer and the texture limits. */
export function initDiagnostics(game: Phaser.Game): void {
  window.addEventListener('error', (e) => line(`erro: ${e.message}`));
  window.addEventListener('unhandledrejection', (e) => line(`erro: ${String(e.reason)}`));
  const debug = /[?&]debug\b/.test(window.location.search);
  game.events.once(Phaser.Core.Events.READY, () => {
    const canvas = game.canvas;
    canvas.addEventListener('webglcontextlost', () => line('WebGL: contexto perdido (memória da GPU?)'));
    if (!debug) return;
    const r = game.renderer;
    if (r instanceof Phaser.Renderer.WebGL.WebGLRenderer) {
      const gl = r.gl;
      line(
        `WebGL ok · textura máx ${gl.getParameter(gl.MAX_TEXTURE_SIZE)} · unidades ${r.maxTextures} · ` +
          `${gl.getParameter(gl.RENDERER)}`,
        '#a0ffb0',
      );
    } else line('Canvas (sem WebGL)', '#ffe080');
    line(`tela ${window.innerWidth}x${window.innerHeight} · dpr ${window.devicePixelRatio}`, '#a0ffb0');
    // Textures bigger than the GPU's limit load blank: list them.
    window.setTimeout(() => {
      const max =
        r instanceof Phaser.Renderer.WebGL.WebGLRenderer ? r.gl.getParameter(r.gl.MAX_TEXTURE_SIZE) : 0;
      let big = 0;
      let bytes = 0;
      for (const key of game.textures.getTextureKeys()) {
        const src = game.textures.get(key).source[0];
        if (!src) continue;
        bytes += src.width * src.height * 4;
        if (max && (src.width > max || src.height > max)) {
          big++;
          line(`grande demais: ${key} ${src.width}x${src.height}`);
        }
      }
      line(`texturas: ${(bytes / 1e6).toFixed(0)} MB · acima do limite: ${big}`, '#a0ffb0');
    }, 4000);
  });
}
