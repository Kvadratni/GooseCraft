// UnitAnimator - Procedural code-based sprite animations
//
// All animations are pure transform (scale/rotation/position offset) applied
// per-frame to Phaser Sprite objects. No spritesheets required.
// Uses sin-wave oscillation driven by a per-unit `animTime` accumulator.

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

const TWO_PI = Math.PI * 2;

/** Oscillate between -amplitude and +amplitude at the given frequency (Hz). */
function osc(time, freq, amplitude) {
    return Math.sin(time * freq * TWO_PI) * amplitude;
}

/** Get the sprite's original scale determined by setDisplaySize */
function getBaseScale(sprite) {
    return sprite.baseScale || 1;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public animation functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Idle bobbing - gentle breathing / floating in-place.
 * Y offset ±2 px @ 1.5 Hz, scale pulse ±2 % @ 0.75 Hz.
 *
 * @param {Phaser.GameObjects.Sprite} sprite
 * @param {number} animTime  Accumulated seconds
 */
export function updateIdleAnimation(sprite, animTime) {
    const base = getBaseScale(sprite);
    const yBob = osc(animTime, 1.5, 2);
    const scalePulse = (1 + osc(animTime, 0.75, 0.02)) * base;

    sprite.y = yBob;
    sprite.scaleX = scalePulse;
    sprite.scaleY = scalePulse;
    sprite.rotation = 0;
    sprite.alpha = 1;
}

/**
 * Walking wobble - waddling leaning motion with hops.
 * Lean ±6° at movement-scaled frequency, Y hop at double that frequency.
 *
 * @param {Phaser.GameObjects.Sprite} sprite
 * @param {number} animTime  Accumulated seconds
 * @param {number} speed     Unit speed in pixels/second (scales hop frequency)
 */
export function updateWalkAnimation(sprite, animTime, speed) {
    const base = getBaseScale(sprite);
    // Faster units waddle quicker
    const stepFreq = Math.max(1.5, speed / 60);
    const lean = osc(animTime, stepFreq, 0.10);          // ±~6° in radians
    const hop = osc(animTime, stepFreq * 2, 3);         // ±3 px vertical

    // Squash-stretch: taller on upswing, wider on downswing
    const stretchX = (1 + osc(animTime, stepFreq * 2, 0.04)) * base;
    const stretchY = (1 - osc(animTime, stepFreq * 2, 0.04)) * base;

    sprite.y = hop;
    sprite.rotation = lean;
    sprite.scaleX = stretchX;
    sprite.scaleY = stretchY;
    sprite.alpha = 1;
}

/**
 * Gathering / constructing peck-bob - deeper dip simulating head-down work.
 * Y dip ±4 px @ 2 Hz, nod rotation ±8°.
 *
 * @param {Phaser.GameObjects.Sprite} sprite
 * @param {number} animTime  Accumulated seconds
 */
export function updateGatherAnimation(sprite, animTime) {
    const base = getBaseScale(sprite);
    // Use a sharper (rectified) sine to emphasise the downstroke
    const t = animTime * 2 * TWO_PI;           // 2 Hz
    const rawSin = Math.sin(t);
    const dip = (rawSin < 0 ? rawSin * 0.3 : rawSin) * 4; // sharp down, gentle up
    const nod = osc(animTime, 2, 0.14);          // ±~8°

    sprite.y = dip;
    sprite.rotation = nod;
    sprite.scaleX = base;
    sprite.scaleY = base;
    sprite.alpha = 1;
}

/**
 * Aerial hover float - smooth undulating lift for Maverick.
 * Y float ±4 px @ 1 Hz, subtle banking ±4°.
 *
 * @param {Phaser.GameObjects.Sprite} sprite
 * @param {number} animTime  Accumulated seconds
 * @param {boolean} isMoving  True while unit is travelling
 */
export function updateAerialAnimation(sprite, animTime, isMoving) {
    const base = getBaseScale(sprite);
    const floatY = osc(animTime, 1.0, 4);
    const bankAngle = isMoving
        ? osc(animTime, 1.5, 0.07)    // bank during flight
        : osc(animTime, 0.5, 0.04);   // gentle rock at rest

    const scalePulse = (1 + osc(animTime, 0.5, 0.015)) * base;

    sprite.y = floatY;
    sprite.rotation = bankAngle;
    sprite.scaleX = scalePulse;
    sprite.scaleY = scalePulse;
    sprite.alpha = 1;
}

/**
 * Stealth shimmer - Spy flickers alpha when stealthed.
 * Pulse alpha 0.30 → 0.55 @ 1.2 Hz with a subtle scale flutter.
 *
 * @param {Phaser.GameObjects.Sprite} sprite
 * @param {number} animTime  Accumulated seconds
 */
export function updateStealthAnimation(sprite, animTime) {
    const base = getBaseScale(sprite);
    const alphaMid = 0.425;
    const alphaAmp = 0.125;
    sprite.alpha = alphaMid + osc(animTime, 1.2, alphaAmp);

    const flutter = (1 + osc(animTime, 2.4, 0.015)) * base;
    sprite.scaleX = flutter;
    sprite.scaleY = flutter;
}

/**
 * Attack lunge - quick forward scale spike then snap-back.
 * Implemented as a Phaser tween so it fires exactly once on attack.
 *
 * @param {Phaser.GameObjects.Sprite} sprite
 * @param {Phaser.Scene}              scene
 * @param {boolean}                   flipX  Current sprite flip state
 */
export function playAttackLunge(sprite, scene, flipX) {
    // Kill any in-progress lunge so rapid attacks don't stack
    if (sprite._attackTween) {
        sprite._attackTween.stop();
        sprite._attackTween = null;
    }

    const base = getBaseScale(sprite);
    const dir = flipX ? -1 : 1;
    const origX = sprite.x;  // should be 0 inside the container
    const lunge = 6 * dir;

    sprite._attackTween = scene.tweens.chain({
        targets: sprite,
        tweens: [
            // Snap forward + puff up
            {
                x: origX + lunge,
                scaleX: 1.18 * base,
                scaleY: 1.12 * base,
                duration: 60,
                ease: 'Power2'
            },
            // Recoil back past rest
            {
                x: origX - lunge * 0.3,
                scaleX: 0.92 * base,
                scaleY: 0.94 * base,
                duration: 80,
                ease: 'Power1'
            },
            // Settle to neutral
            {
                x: origX,
                scaleX: 1 * base,
                scaleY: 1 * base,
                rotation: 0,
                duration: 90,
                ease: 'Power1',
                onComplete: () => { sprite._attackTween = null; }
            }
        ]
    });
}

/**
 * Reset sprite transforms back to neutral defaults.
 * Call this on every state transition to clear residual animation offsets.
 *
 * @param {Phaser.GameObjects.Sprite} sprite
 */
export function resetAnimation(sprite) {
    if (!sprite) return;

    // Stop any active attack tween
    if (sprite._attackTween) {
        sprite._attackTween.stop();
        sprite._attackTween = null;
    }

    const base = getBaseScale(sprite);
    sprite.x = 0;
    sprite.y = 0;
    sprite.rotation = 0;
    sprite.scaleX = base;
    sprite.scaleY = base;
    sprite.alpha = 1;
}
