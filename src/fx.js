import Phaser from 'phaser';
import { H, K, W, px } from './config.js';

// Full-screen CRT / xerox pass applied to a scene camera. Scenes drive it by
// writing plain numbers on the returned instance (ab, glitch, pump, invert, grain).
const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D uMainSampler;
uniform vec2 uRes;
uniform float uK;
uniform float uTime;
uniform float uAb;
uniform float uGlitch;
uniform float uPump;
uniform float uInvert;
uniform float uGrain;
varying vec2 outTexCoord;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

void main() {
  vec2 cc = outTexCoord - 0.5;
  cc *= 1.0 - uPump * 0.014;            // bass pump
  cc *= 1.0 + 0.07 * dot(cc, cc);       // tube curvature
  vec2 uv = cc + 0.5;

  // horizontal tear: random rows slide sideways
  float row = floor(uv.y * 28.0);
  float tick = floor(uTime * 20.0);
  float on = step(1.0 - 0.35 * uGlitch, hash(vec2(row, tick)));
  uv.x += (hash(vec2(tick, row)) - 0.5) * 0.12 * uGlitch * on;

  // chromatic aberration, stronger toward the edges
  vec2 off = cc * uAb * 0.01 + vec2(uAb * 0.002, 0.0);
  vec3 col;
  col.r = texture2D(uMainSampler, uv + off).r;
  col.g = texture2D(uMainSampler, uv).g;
  col.b = texture2D(uMainSampler, uv - off).b;

  // cheap glow: bright neighbours bleed in
  vec2 d = vec2(2.5 * uK) / uRes;
  vec3 g = texture2D(uMainSampler, uv + d).rgb + texture2D(uMainSampler, uv - d).rgb
         + texture2D(uMainSampler, uv + vec2(d.x, -d.y)).rgb + texture2D(uMainSampler, uv + vec2(-d.x, d.y)).rgb;
  vec3 glow = max(g * 0.25 - 0.3, 0.0) * 0.5;

  // overdrive mode: black turns red, everything else turns to silhouette.
  // Taken before the glow, so thin dark text on paper stays readable.
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  vec3 inv = mix(vec3(1.0, 0.165, 0.165), vec3(0.04, 0.0, 0.02), smoothstep(0.12, 0.55, lum));
  col = mix(col + glow, inv, uInvert);

  col *= 0.9 + 0.1 * sin(gl_FragCoord.y * 2.0944 / uK);                  // scanlines, 3 logical px
  col += (hash(gl_FragCoord.xy * 0.37 + fract(uTime) * 91.0) - 0.5) * uGrain; // grain
  col *= mix(0.5, 1.0, 1.0 - smoothstep(0.38, 0.86, length(cc)));        // vignette
  col *= step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
  gl_FragColor = vec4(col, 1.0);
}
`;

export class CrtFX extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  constructor(game) {
    super({ game, name: 'CrtFX', fragShader: FRAG });
    this.ab = 0.2;
    this.glitch = 0;
    this.pump = 0;
    this.invert = 0;
    this.grain = 0.05;
  }

  onPreRender() {
    this.set1f('uTime', (this.game.loop.time / 1000) % 100);
    this.set2f('uRes', this.renderer.width, this.renderer.height);
    this.set1f('uK', K);
    this.set1f('uAb', this.ab);
    this.set1f('uGlitch', this.glitch);
    this.set1f('uPump', this.pump);
    this.set1f('uInvert', this.invert);
    this.set1f('uGrain', this.grain);
  }
}

// Returns the pipeline instance, or null on the Canvas renderer (which gets
// plain drawn scanlines instead).
export function attachFx(scene) {
  if (scene.game.renderer.type !== Phaser.WEBGL) {
    const g = scene.add.graphics().setDepth(100);
    g.fillStyle(0x000000, 0.14);
    for (let y = 0; y < H; y += px(3)) g.fillRect(0, y, W, px(1));
    return null;
  }
  const cam = scene.cameras.main;
  cam.setPostPipeline('CrtFX');
  const p = cam.getPostPipeline('CrtFX');
  return Array.isArray(p) ? p[0] : p;
}
