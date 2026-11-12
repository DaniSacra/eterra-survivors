import { describe, expect, it } from 'vitest';
import { ENEMIES, type EnemyId } from '../../src/data/enemies';
import { t } from '../../src/i18n/pt-BR';
import { ENEMY_ANIMS, poseMs, showPoses } from '../../src/render/enemyAnims';

describe('Bestiário showcase poses', () => {
  it('starts at the walk, then the attack, and ends on the death where it has one', () => {
    for (const id of Object.keys(ENEMIES) as EnemyId[]) {
      const poses = showPoses(id);
      const anim = ENEMY_ANIMS[ENEMIES[id].sprite];
      if (!anim) {
        expect(poses, id).toEqual([]);
        continue;
      }
      expect(poses[0], id).toBe('walk');
      if (anim.frames.attack) expect(poses[1], id).toBe('attack');
      if (anim.frames.death) expect(poses[poses.length - 1], id).toBe('death');
      for (const p of poses) expect(t.bestiary.pose[p], `${id} ${p}`).toBeTruthy();
    }
  });

  it('shows the Lobo Velho pounce, howl and death, each pose long enough to see every frame', () => {
    expect(showPoses('oldWolf')).toEqual(['walk', 'attack', 'windup', 'strike', 'howl', 'death']);
    const a = ENEMY_ANIMS['enemy.oldWolf'] as NonNullable<(typeof ENEMY_ANIMS)[string]>;
    for (const p of showPoses('oldWolf'))
      expect(poseMs(a, p)).toBeGreaterThanOrEqual(((a.frames[p] ?? 1) / a.fps[p]) * 1000);
  });
});
