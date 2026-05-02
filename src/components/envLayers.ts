/** Per-environment layered parallax data for EnvironmentScene */

export interface EnvLayer {
  /** SVG path/content for this layer */
  svg: string;
  /** Vertical position: 0 = top, 100 = bottom */
  y: number;
  /** Height as % of container */
  h: number;
  /** Opacity 0-1 */
  opacity: number;
  /** Parallax drift speed: 'slow' | 'med' | 'fast' */
  drift: 'slow' | 'med' | 'fast';
  /** z-index tier: 'bg' | 'mid' | 'fg' */
  depth: 'bg' | 'mid' | 'fg';
}

export interface EnvCreature {
  emoji: string;
  x: number;
  y: number;
  size: number;
  anim: 'float' | 'drift' | 'bob' | 'peek' | 'fly' | 'swim';
  delay: number;
}

export interface EnvDecor {
  emoji: string;
  x: number;
  y: number;
  size: number;
  opacity: number;
  flip?: boolean;
}

export interface EnvConfig {
  layers: EnvLayer[];
  creatures: EnvCreature[];
  decor: EnvDecor[];
  /** Distinct color for each depth tier — makes layering obvious */
  bgColor: string;
  midColor: string;
  fgColor: string;
  /** Extra CSS gradient overlays */
  atmosphereExtra?: string;
}

function birds(count: number, yMin: number, yMax: number): EnvCreature[] {
  return Array.from({ length: count }, (_, i) => ({
    emoji: '🐦',
    x: 10 + (i * 25) % 80,
    y: yMin + Math.random() * (yMax - yMin),
    size: 14 + (i % 3) * 4,
    anim: 'fly' as const,
    delay: i * 1.8,
  }));
}

function fish(count: number, yMin: number): EnvCreature[] {
  return Array.from({ length: count }, (_, i) => ({
    emoji: i % 2 === 0 ? '🐟' : '🐠',
    x: 5 + (i * 22) % 85,
    y: yMin + (i % 3) * 8,
    size: 16 + (i % 3) * 4,
    anim: 'swim' as const,
    delay: i * 2.2,
  }));
}

export const ENV_LAYERS: Record<string, EnvConfig> = {
  shore: {
    bgColor: '#1a3a5a',
    midColor: '#8a7a50',
    fgColor: '#d4b870',
    layers: [
      { svg: 'M0,60 Q30,40 80,55 Q130,65 200,45 Q270,35 340,50 Q380,58 400,42 L400,200 L0,200Z', y: 30, h: 70, opacity: 0.2, drift: 'slow', depth: 'bg' },
      { svg: 'M0,80 Q60,55 120,70 Q200,85 280,60 Q340,50 400,65 L400,200 L0,200Z', y: 45, h: 55, opacity: 0.35, drift: 'med', depth: 'mid' },
      { svg: 'M0,40 Q40,25 80,35 Q120,45 160,30 Q200,20 240,32 Q280,42 320,28 Q360,18 400,30 L400,50 Q350,42 300,48 Q250,38 200,45 Q150,50 100,40 Q50,32 0,42Z', y: 50, h: 15, opacity: 0.45, drift: 'fast', depth: 'fg' },
      { svg: 'M0,120 Q30,100 70,115 Q110,125 160,105 Q200,95 250,110 Q300,120 350,100 Q380,95 400,108 L400,200 L0,200Z', y: 68, h: 32, opacity: 0.55, drift: 'fast', depth: 'fg' },
    ],
    creatures: [
      ...birds(2, 5, 20),
      { emoji: '🦀', x: 75, y: 82, size: 22, anim: 'peek', delay: 0 },
      { emoji: '🐚', x: 25, y: 88, size: 16, anim: 'bob', delay: 1 },
      { emoji: '🦅', x: 50, y: 8, size: 24, anim: 'fly', delay: 3 },
    ],
    decor: [
      { emoji: '🪵', x: 15, y: 78, size: 20, opacity: 0.6 },
      { emoji: '🐚', x: 60, y: 85, size: 14, opacity: 0.5 },
      { emoji: '🪸', x: 85, y: 90, size: 16, opacity: 0.4 },
      { emoji: '⛱️', x: 40, y: 72, size: 24, opacity: 0.3 },
    ],
  },

  tidepools: {
    bgColor: '#1a3a4a',
    midColor: '#3a5a5a',
    fgColor: '#5a7a6a',
    layers: [
      { svg: 'M0,70 L30,55 L60,65 L90,45 L120,60 L150,40 L180,55 L210,35 L240,50 L270,40 L300,55 L330,38 L360,52 L400,42 L400,200 L0,200Z', y: 35, h: 65, opacity: 0.2, drift: 'slow', depth: 'bg' },
      { svg: 'M0,50 L40,40 L70,55 L110,35 L150,50 L190,30 L230,48 L270,32 L310,45 L350,28 L400,40 L400,200 L0,200Z', y: 50, h: 50, opacity: 0.4, drift: 'med', depth: 'mid' },
      { svg: 'M0,100 Q30,85 60,95 Q100,80 140,92 Q180,82 220,94 Q260,78 300,90 Q340,80 380,92 L400,88 L400,200 L0,200Z', y: 62, h: 38, opacity: 0.55, drift: 'fast', depth: 'fg' },
    ],
    creatures: [
      { emoji: '🦀', x: 30, y: 75, size: 20, anim: 'peek', delay: 0 },
      { emoji: '⭐', x: 55, y: 80, size: 18, anim: 'bob', delay: 1.5 },
      { emoji: '🐙', x: 70, y: 70, size: 22, anim: 'peek', delay: 3 },
      { emoji: '🦐', x: 20, y: 85, size: 14, anim: 'swim', delay: 2 },
      { emoji: '🐡', x: 80, y: 65, size: 16, anim: 'float', delay: 4 },
    ],
    decor: [
      { emoji: '🪨', x: 10, y: 68, size: 28, opacity: 0.5 },
      { emoji: '🪨', x: 65, y: 72, size: 22, opacity: 0.4, flip: true },
      { emoji: '🪸', x: 45, y: 82, size: 18, opacity: 0.5 },
      { emoji: '🐚', x: 88, y: 88, size: 14, opacity: 0.4 },
    ],
  },

  dunes: {
    bgColor: '#5a4a28',
    midColor: '#9a7a40',
    fgColor: '#d4a850',
    layers: [
      { svg: 'M0,80 Q50,50 100,65 Q150,80 200,55 Q250,40 300,60 Q350,75 400,50 L400,200 L0,200Z', y: 30, h: 70, opacity: 0.18, drift: 'slow', depth: 'bg' },
      { svg: 'M0,60 Q80,35 160,55 Q240,70 320,45 Q360,35 400,50 L400,200 L0,200Z', y: 50, h: 50, opacity: 0.3, drift: 'med', depth: 'mid' },
      { svg: 'M0,70 Q40,55 80,65 Q120,72 160,58 Q200,48 240,60 Q280,68 320,55 Q360,45 400,58 L400,200 L0,200Z', y: 60, h: 40, opacity: 0.45, drift: 'fast', depth: 'fg' },
    ],
    creatures: [
      { emoji: '🦎', x: 65, y: 78, size: 20, anim: 'peek', delay: 0 },
      { emoji: '🦂', x: 30, y: 85, size: 16, anim: 'peek', delay: 2.5 },
      { emoji: '🦅', x: 40, y: 10, size: 22, anim: 'fly', delay: 1 },
      { emoji: '🐍', x: 80, y: 82, size: 18, anim: 'peek', delay: 4 },
    ],
    decor: [
      { emoji: '🌵', x: 20, y: 65, size: 28, opacity: 0.5 },
      { emoji: '🌵', x: 75, y: 60, size: 22, opacity: 0.35, flip: true },
      { emoji: '💀', x: 50, y: 88, size: 14, opacity: 0.25 },
      { emoji: '☀️', x: 85, y: 8, size: 30, opacity: 0.3 },
    ],
  },

  forest: {
    bgColor: '#0a2a12',
    midColor: '#1a4a22',
    fgColor: '#2a6a2a',
    layers: [
      { svg: 'M0,200 L0,80 Q20,50 40,70 Q50,30 70,60 Q80,20 100,55 Q110,30 130,65 Q140,40 160,70 Q170,25 190,60 Q200,35 220,65 Q230,45 250,70 Q260,20 280,55 Q290,35 310,65 Q320,50 340,75 Q350,30 370,60 Q380,45 400,70 L400,200Z', y: 25, h: 75, opacity: 0.2, drift: 'slow', depth: 'bg' },
      { svg: 'M0,200 L0,100 Q30,70 60,90 Q80,50 110,80 Q130,45 160,75 Q180,55 210,85 Q230,50 260,80 Q280,60 310,85 Q330,55 360,80 Q380,65 400,85 L400,200Z', y: 40, h: 60, opacity: 0.35, drift: 'med', depth: 'mid' },
      { svg: 'M0,200 L0,140 Q25,120 50,135 Q75,115 100,130 Q130,110 160,128 Q190,112 220,130 Q250,115 280,132 Q310,118 340,135 Q365,120 400,130 L400,200Z', y: 58, h: 42, opacity: 0.5, drift: 'fast', depth: 'fg' },
    ],
    creatures: [
      { emoji: '🦌', x: 25, y: 72, size: 28, anim: 'peek', delay: 0 },
      { emoji: '🐿️', x: 70, y: 65, size: 18, anim: 'peek', delay: 2 },
      { emoji: '🦉', x: 55, y: 30, size: 22, anim: 'bob', delay: 1 },
      { emoji: '🐛', x: 40, y: 80, size: 12, anim: 'float', delay: 3 },
      { emoji: '🦋', x: 60, y: 45, size: 16, anim: 'fly', delay: 4 },
      { emoji: '🍄', x: 85, y: 82, size: 18, anim: 'bob', delay: 0.5 },
    ],
    decor: [
      { emoji: '🌿', x: 8, y: 85, size: 24, opacity: 0.6 },
      { emoji: '🌿', x: 90, y: 80, size: 20, opacity: 0.5, flip: true },
      { emoji: '🍄', x: 35, y: 88, size: 16, opacity: 0.4 },
      { emoji: '🪵', x: 55, y: 90, size: 22, opacity: 0.35 },
      { emoji: '🌲', x: 5, y: 50, size: 40, opacity: 0.2 },
      { emoji: '🌲', x: 92, y: 55, size: 36, opacity: 0.18 },
    ],
  },

  stream: {
    bgColor: '#0a2a1a',
    midColor: '#1a5a3a',
    fgColor: '#2a7a4a',
    layers: [
      { svg: 'M0,200 L0,90 Q30,65 60,80 Q90,55 120,75 Q150,60 180,80 Q210,55 240,75 Q270,60 300,80 Q330,55 360,75 Q390,65 400,80 L400,200Z', y: 30, h: 70, opacity: 0.2, drift: 'slow', depth: 'bg' },
      { svg: 'M0,30 Q50,15 100,25 Q150,35 200,18 Q250,8 300,22 Q350,32 400,15 L400,60 Q350,45 300,55 Q250,40 200,50 Q150,55 100,42 Q50,35 0,48Z', y: 48, h: 18, opacity: 0.35, drift: 'fast', depth: 'mid' },
      { svg: 'M0,200 L0,145 Q30,130 60,140 Q100,125 140,138 Q180,122 220,135 Q260,120 300,132 Q340,118 380,130 L400,125 L400,200Z', y: 62, h: 38, opacity: 0.5, drift: 'fast', depth: 'fg' },
    ],
    creatures: [
      ...fish(3, 55),
      { emoji: '🐸', x: 15, y: 58, size: 22, anim: 'peek', delay: 0 },
      { emoji: '🦆', x: 50, y: 50, size: 20, anim: 'drift', delay: 1.5 },
      { emoji: '🐢', x: 75, y: 62, size: 18, anim: 'swim', delay: 3 },
      { emoji: '🦟', x: 35, y: 35, size: 10, anim: 'fly', delay: 2 },
    ],
    decor: [
      { emoji: '🪨', x: 10, y: 55, size: 24, opacity: 0.5 },
      { emoji: '🪨', x: 80, y: 58, size: 20, opacity: 0.4 },
      { emoji: '🌿', x: 5, y: 48, size: 22, opacity: 0.5 },
      { emoji: '🌿', x: 92, y: 50, size: 18, opacity: 0.45, flip: true },
    ],
  },

  meadow: {
    bgColor: '#2a4a2a',
    midColor: '#3a7a3a',
    fgColor: '#4a9a3a',
    layers: [
      { svg: 'M0,200 L0,120 Q50,100 100,110 Q150,95 200,105 Q250,90 300,100 Q350,85 400,95 L400,200Z', y: 55, h: 45, opacity: 0.2, drift: 'slow', depth: 'bg' },
      { svg: 'M0,200 L0,140 Q60,125 120,135 Q180,120 240,130 Q300,115 360,128 Q380,130 400,122 L400,200Z', y: 65, h: 35, opacity: 0.35, drift: 'med', depth: 'mid' },
      { svg: 'M0,200 L0,160 Q40,148 80,155 Q120,142 160,152 Q200,138 240,150 Q280,140 320,152 Q360,142 400,148 L400,200Z', y: 75, h: 25, opacity: 0.5, drift: 'fast', depth: 'fg' },
    ],
    creatures: [
      { emoji: '🦋', x: 30, y: 35, size: 18, anim: 'fly', delay: 0 },
      { emoji: '🦋', x: 65, y: 28, size: 14, anim: 'fly', delay: 2 },
      { emoji: '🐝', x: 50, y: 42, size: 14, anim: 'fly', delay: 1 },
      { emoji: '🐝', x: 20, y: 48, size: 12, anim: 'fly', delay: 3.5 },
      { emoji: '🐰', x: 75, y: 75, size: 22, anim: 'peek', delay: 2 },
      { emoji: '🦗', x: 40, y: 82, size: 14, anim: 'peek', delay: 4 },
    ],
    decor: [
      { emoji: '🌻', x: 15, y: 68, size: 24, opacity: 0.6 },
      { emoji: '🌼', x: 40, y: 72, size: 20, opacity: 0.5 },
      { emoji: '🌸', x: 60, y: 65, size: 18, opacity: 0.45 },
      { emoji: '🌻', x: 85, y: 70, size: 22, opacity: 0.5, flip: true },
      { emoji: '🌾', x: 8, y: 78, size: 26, opacity: 0.4 },
      { emoji: '🌾', x: 92, y: 75, size: 22, opacity: 0.35, flip: true },
    ],
  },

  canopy: {
    bgColor: '#0a2a08',
    midColor: '#1a4a12',
    fgColor: '#2a6a1a',
    layers: [
      { svg: 'M0,0 L400,0 L400,60 Q380,80 350,65 Q320,90 290,70 Q260,95 230,72 Q200,88 170,68 Q140,85 110,65 Q80,80 50,60 Q30,72 0,55Z', y: 0, h: 45, opacity: 0.3, drift: 'slow', depth: 'bg' },
      { svg: 'M0,0 L400,0 L400,40 Q370,58 340,45 Q310,65 280,48 Q250,68 220,50 Q190,62 160,45 Q130,60 100,42 Q70,55 40,38 Q20,48 0,35Z', y: 0, h: 35, opacity: 0.2, drift: 'med', depth: 'mid' },
      { svg: 'M0,200 L0,155 Q30,140 60,150 Q90,135 120,148 Q150,132 180,145 Q210,130 240,142 Q270,128 300,140 Q330,126 360,138 Q390,130 400,135 L400,200Z', y: 65, h: 35, opacity: 0.5, drift: 'fast', depth: 'fg' },
    ],
    creatures: [
      { emoji: '🐒', x: 25, y: 25, size: 24, anim: 'bob', delay: 0 },
      { emoji: '🦜', x: 70, y: 18, size: 20, anim: 'fly', delay: 1.5 },
      { emoji: '🐛', x: 45, y: 55, size: 12, anim: 'float', delay: 2 },
      { emoji: '🦋', x: 55, y: 40, size: 16, anim: 'fly', delay: 3 },
      { emoji: '🦎', x: 80, y: 35, size: 16, anim: 'peek', delay: 4 },
      { emoji: '🕷️', x: 35, y: 38, size: 12, anim: 'bob', delay: 1 },
    ],
    decor: [
      { emoji: '🌿', x: 5, y: 42, size: 28, opacity: 0.5 },
      { emoji: '🌿', x: 90, y: 38, size: 24, opacity: 0.45, flip: true },
      { emoji: '🍃', x: 30, y: 50, size: 16, opacity: 0.3 },
      { emoji: '🍃', x: 65, y: 48, size: 14, opacity: 0.25 },
      { emoji: '🌺', x: 50, y: 30, size: 18, opacity: 0.4 },
    ],
  },

  log: {
    bgColor: '#1a1a0a',
    midColor: '#3a3018',
    fgColor: '#5a4828',
    layers: [
      { svg: 'M0,200 L0,100 Q30,75 60,90 Q90,60 120,80 Q150,55 180,78 Q210,58 240,80 Q270,62 300,82 Q330,60 360,78 Q390,70 400,82 L400,200Z', y: 35, h: 65, opacity: 0.2, drift: 'slow', depth: 'bg' },
      { svg: 'M0,200 L0,130 Q40,110 80,125 Q120,105 160,120 Q200,100 240,118 Q280,102 320,120 Q360,105 400,115 L400,200Z', y: 52, h: 48, opacity: 0.35, drift: 'med', depth: 'mid' },
      { svg: 'M0,200 L0,155 Q30,140 70,150 Q110,135 150,148 Q190,130 230,145 Q270,132 310,148 Q350,135 400,142 L400,200Z', y: 65, h: 35, opacity: 0.5, drift: 'fast', depth: 'fg' },
    ],
    creatures: [
      { emoji: '🐛', x: 40, y: 72, size: 14, anim: 'peek', delay: 0 },
      { emoji: '🐜', x: 55, y: 78, size: 12, anim: 'drift', delay: 1 },
      { emoji: '🐜', x: 62, y: 80, size: 10, anim: 'drift', delay: 1.5 },
      { emoji: '🪲', x: 30, y: 68, size: 16, anim: 'peek', delay: 2.5 },
      { emoji: '🐌', x: 70, y: 75, size: 18, anim: 'drift', delay: 3 },
      { emoji: '🍄', x: 20, y: 70, size: 20, anim: 'bob', delay: 0.5 },
    ],
    decor: [
      { emoji: '🪵', x: 25, y: 72, size: 40, opacity: 0.6 },
      { emoji: '🪵', x: 65, y: 78, size: 34, opacity: 0.5, flip: true },
      { emoji: '🍄', x: 15, y: 65, size: 22, opacity: 0.5 },
      { emoji: '🍄', x: 80, y: 68, size: 18, opacity: 0.4 },
      { emoji: '🌿', x: 5, y: 82, size: 24, opacity: 0.4 },
      { emoji: '🍂', x: 50, y: 85, size: 16, opacity: 0.3 },
      { emoji: '🍂', x: 35, y: 88, size: 14, opacity: 0.25 },
    ],
  },

  cave: {
    bgColor: '#0a0a18',
    midColor: '#1a1a30',
    fgColor: '#2a2a48',
    layers: [
      { svg: 'M0,0 L0,30 L30,45 L50,25 L80,55 L100,30 L130,48 L150,20 L180,58 L200,28 L230,50 L260,22 L290,52 L310,28 L340,60 L360,25 L390,45 L400,18 L400,0Z', y: 0, h: 30, opacity: 0.4, drift: 'slow', depth: 'bg' },
      { svg: 'M0,200 L0,150 L25,140 L50,155 L80,130 L110,148 L140,125 L170,145 L200,128 L230,150 L260,132 L290,148 L320,125 L350,142 L380,130 L400,145 L400,200Z', y: 65, h: 35, opacity: 0.45, drift: 'slow', depth: 'mid' },
      { svg: 'M0,0 L0,18 Q20,28 40,15 Q60,30 80,12 Q100,25 120,10 Q140,22 160,8 Q180,20 200,12 Q220,25 240,10 Q260,22 280,8 Q300,18 320,5 Q340,15 360,8 Q380,18 400,10 L400,0Z', y: 0, h: 18, opacity: 0.6, drift: 'med', depth: 'fg' },
      { svg: 'M0,200 L0,170 Q25,158 50,168 Q80,152 110,165 Q140,150 170,162 Q200,148 230,160 Q260,145 290,158 Q320,142 350,155 Q380,148 400,155 L400,200Z', y: 78, h: 22, opacity: 0.55, drift: 'fast', depth: 'fg' },
    ],
    creatures: [
      { emoji: '🦇', x: 25, y: 12, size: 18, anim: 'fly', delay: 0 },
      { emoji: '🦇', x: 60, y: 8, size: 14, anim: 'fly', delay: 1.5 },
      { emoji: '🦇', x: 45, y: 15, size: 16, anim: 'fly', delay: 3 },
      { emoji: '🕷️', x: 75, y: 22, size: 14, anim: 'bob', delay: 2 },
      { emoji: '🐛', x: 35, y: 78, size: 12, anim: 'peek', delay: 4 },
    ],
    decor: [
      { emoji: '💎', x: 20, y: 82, size: 18, opacity: 0.5 },
      { emoji: '💎', x: 70, y: 78, size: 14, opacity: 0.4 },
      { emoji: '🔮', x: 50, y: 85, size: 16, opacity: 0.35 },
      { emoji: '💧', x: 40, y: 28, size: 10, opacity: 0.3 },
      { emoji: '💧', x: 65, y: 25, size: 8, opacity: 0.25 },
    ],
    atmosphereExtra: 'radial-gradient(circle 40px at 20% 80%, #6a5aaa20 0%, transparent 100%), radial-gradient(circle 30px at 70% 75%, #6a5aaa18 0%, transparent 100%), radial-gradient(circle 25px at 50% 85%, #8a6aba15 0%, transparent 100%)',
  },

  wetland: {
    bgColor: '#0a2a0a',
    midColor: '#1a4a1a',
    fgColor: '#2a5a20',
    layers: [
      { svg: 'M0,200 L0,110 Q40,90 80,105 Q120,95 160,108 Q200,88 240,102 Q280,92 320,106 Q360,90 400,100 L400,200Z', y: 45, h: 55, opacity: 0.2, drift: 'slow', depth: 'bg' },
      { svg: 'M0,30 Q40,18 80,28 Q120,35 160,22 Q200,15 240,25 Q280,32 320,20 Q360,12 400,24 L400,55 Q360,42 320,50 Q280,55 240,45 Q200,38 160,48 Q120,55 80,42 Q40,35 0,45Z', y: 52, h: 18, opacity: 0.35, drift: 'fast', depth: 'mid' },
      { svg: 'M0,200 L0,155 Q35,140 70,152 Q105,135 140,148 Q175,132 210,145 Q245,130 280,142 Q315,128 350,140 Q385,132 400,138 L400,200Z', y: 68, h: 32, opacity: 0.5, drift: 'fast', depth: 'fg' },
    ],
    creatures: [
      { emoji: '🐸', x: 20, y: 62, size: 22, anim: 'peek', delay: 0 },
      { emoji: '🐸', x: 75, y: 58, size: 18, anim: 'peek', delay: 3 },
      { emoji: '🦆', x: 45, y: 55, size: 20, anim: 'drift', delay: 1 },
      { emoji: '🐢', x: 60, y: 65, size: 18, anim: 'swim', delay: 2 },
      { emoji: '🦟', x: 30, y: 40, size: 10, anim: 'fly', delay: 2.5 },
      { emoji: '🦟', x: 55, y: 38, size: 8, anim: 'fly', delay: 4 },
      { emoji: '🐊', x: 80, y: 60, size: 24, anim: 'peek', delay: 5 },
    ],
    decor: [
      { emoji: '🌿', x: 5, y: 55, size: 26, opacity: 0.5 },
      { emoji: '🌿', x: 90, y: 52, size: 22, opacity: 0.45, flip: true },
      { emoji: '🪷', x: 35, y: 58, size: 18, opacity: 0.5 },
      { emoji: '🪷', x: 65, y: 55, size: 16, opacity: 0.4 },
    ],
  },
};
