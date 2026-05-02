import { useMemo } from 'react';
import type { SamplingMethod } from '@/types/game';
import { ENV_LAYERS } from './envLayers';

interface EnvironmentSceneProps {
  environment: string;
  isNight: boolean;
  samplingMethod?: SamplingMethod | null;
  collecting?: boolean;
}

interface EnvTheme {
  sky: string;
  horizon: string;
  ground: string;
  accent: string;
  nightSky: string;
  nightHorizon: string;
  nightGround: string;
  nightAccent: string;
  hasWater: boolean;
}

const ENV_THEMES: Record<string, EnvTheme> = {
  shore: {
    sky: '#0d2847', horizon: '#2a6a8a', ground: '#c9b080', accent: '#4a9aba',
    nightSky: '#050e1a', nightHorizon: '#0a2a4a', nightGround: '#3a3020', nightAccent: '#2a5a7a',
    hasWater: true,
  },
  tidepools: {
    sky: '#1a2a3a', horizon: '#3a5a6a', ground: '#4a5a5a', accent: '#5a9aaa',
    nightSky: '#080e14', nightHorizon: '#1a2a3a', nightGround: '#1a2a2a', nightAccent: '#2a5a6a',
    hasWater: true,
  },
  dunes: {
    sky: '#2a1a0a', horizon: '#8a6a40', ground: '#c9a860', accent: '#dab870',
    nightSky: '#0a0a08', nightHorizon: '#2a2010', nightGround: '#3a2a10', nightAccent: '#5a4a20',
    hasWater: false,
  },
  forest: {
    sky: '#0a1a10', horizon: '#1a4020', ground: '#152a18', accent: '#4a8a4a',
    nightSky: '#040a06', nightHorizon: '#0a1a10', nightGround: '#080e08', nightAccent: '#2a4a2a',
    hasWater: false,
  },
  stream: {
    sky: '#0a2a1a', horizon: '#2a5a4a', ground: '#1a4a3a', accent: '#4a9a8a',
    nightSky: '#040e0a', nightHorizon: '#0a2a1a', nightGround: '#081a10', nightAccent: '#2a5a4a',
    hasWater: true,
  },
  meadow: {
    sky: '#1a2a3a', horizon: '#4a7a5a', ground: '#3a6a3a', accent: '#8aba6a',
    nightSky: '#080e14', nightHorizon: '#1a3a2a', nightGround: '#102a10', nightAccent: '#3a5a3a',
    hasWater: false,
  },
  canopy: {
    sky: '#081a08', horizon: '#1a3a18', ground: '#0a1a08', accent: '#5a9a4a',
    nightSky: '#040a04', nightHorizon: '#081a08', nightGround: '#040a04', nightAccent: '#2a4a2a',
    hasWater: false,
  },
  log: {
    sky: '#1a1a10', horizon: '#3a3020', ground: '#2a2018', accent: '#8a7040',
    nightSky: '#0a0a08', nightHorizon: '#1a1a10', nightGround: '#100e08', nightAccent: '#3a3020',
    hasWater: false,
  },
  cave: {
    sky: '#0a0a10', horizon: '#1a1a2a', ground: '#0e0e1a', accent: '#6a5aaa',
    nightSky: '#060608', nightHorizon: '#0a0a14', nightGround: '#08080e', nightAccent: '#4a3a7a',
    hasWater: false,
  },
  wetland: {
    sky: '#1a2a1a', horizon: '#3a5a3a', ground: '#2a3a20', accent: '#5a8a4a',
    nightSky: '#080e08', nightHorizon: '#1a2a1a', nightGround: '#101a10', nightAccent: '#2a4a2a',
    hasWater: true,
  },
};

const TOOL_DETAILS: Record<string, { icon: string; glowColor: string }> = {
  'scoop': { icon: '🪣', glowColor: '#8a7040' },
  'hand-net': { icon: '🏸', glowColor: '#4a8a4a' },
  'car-trap': { icon: '🚗', glowColor: '#6a8aaa' },
  'plankton-net': { icon: '🌊', glowColor: '#4a9aba' },
  'vial': { icon: '🧪', glowColor: '#6a5aaa' },
};

const DRIFT_SPEEDS = { slow: 30, med: 20, fast: 14 };
const DEFAULT_THEME: EnvTheme = ENV_THEMES.forest;

export default function EnvironmentScene({ environment, isNight, samplingMethod, collecting }: EnvironmentSceneProps) {
  const theme = ENV_THEMES[environment] || DEFAULT_THEME;
  const sky = isNight ? theme.nightSky : theme.sky;
  const horizon = isNight ? theme.nightHorizon : theme.horizon;
  const ground = isNight ? theme.nightGround : theme.ground;
  const accent = isNight ? theme.nightAccent : theme.accent;
  const envConfig = ENV_LAYERS[environment] || ENV_LAYERS.forest;

  const depthColor = (depth: 'bg' | 'mid' | 'fg') => {
    if (depth === 'bg') return envConfig.bgColor;
    if (depth === 'mid') return envConfig.midColor;
    return envConfig.fgColor;
  };

  const particles = useMemo(() => {
    return Array.from({ length: 18 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: 1.5 + Math.random() * 3,
      delay: Math.random() * 8,
      duration: 4 + Math.random() * 6,
      opacity: 0.15 + Math.random() * 0.35,
    }));
  }, []);

  const tool = samplingMethod ? TOOL_DETAILS[samplingMethod] : null;

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Base gradient — sky to ground */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, ${sky} 0%, ${horizon} 40%, ${accent}40 55%, ${ground} 75%, ${ground} 100%)`,
        }}
      />

      {/* Atmospheric haze layer */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 120% 60% at 50% 45%, ${accent}20 0%, transparent 70%)`,
        }}
      />

      {/* Water shimmer for aquatic environments */}
      {theme.hasWater && (
        <>
          <div className="absolute left-0 right-0" style={{
            top: '38%', height: '20%',
            background: `linear-gradient(180deg, ${accent}30 0%, ${accent}10 100%)`,
          }} />
          <div className="envWave envWave1 absolute left-0 right-0" style={{
            top: '38%', height: '3px',
            background: `linear-gradient(90deg, transparent, ${accent}60, transparent)`,
          }} />
          <div className="envWave envWave2 absolute left-0 right-0" style={{
            top: '42%', height: '2px',
            background: `linear-gradient(90deg, transparent, ${accent}40, transparent)`,
          }} />
          <div className="envWave envWave3 absolute left-0 right-0" style={{
            top: '46%', height: '2px',
            background: `linear-gradient(90deg, transparent, ${accent}30, transparent)`,
          }} />
        </>
      )}

      {/* Parallax terrain layers */}
      {envConfig.layers.map((layer, i) => (
        <div
          key={i}
          className="absolute left-0 right-0 envDrift"
          style={{
            top: `${layer.y}%`,
            height: `${layer.h}%`,
            animationDuration: `${DRIFT_SPEEDS[layer.drift]}s`,
            animationDelay: `${i * -3}s`,
            zIndex: layer.depth === 'bg' ? 1 : layer.depth === 'mid' ? 2 : 3,
          }}
        >
          <svg
            viewBox="0 0 400 200"
            preserveAspectRatio="none"
            className="w-full h-full"
            style={{ opacity: layer.opacity, filter: isNight ? 'brightness(0.5)' : undefined }}
          >
            <path d={layer.svg} fill={depthColor(layer.depth)} />
          </svg>
        </div>
      ))}

      {/* Static decor (plants, rocks, structures) */}
      {envConfig.decor.map((d, i) => (
        <div
          key={`d${i}`}
          className="absolute pointer-events-none select-none"
          style={{
            left: `${d.x}%`,
            top: `${d.y}%`,
            fontSize: d.size,
            opacity: d.opacity * (isNight ? 0.5 : 1),
            transform: d.flip ? 'scaleX(-1)' : undefined,
            zIndex: 4,
            filter: isNight ? 'brightness(0.6)' : undefined,
          }}
        >
          {d.emoji}
        </div>
      ))}

      {/* Animated creatures */}
      {envConfig.creatures.map((c, i) => (
        <div
          key={`c${i}`}
          className={`absolute pointer-events-none select-none envAnim_${c.anim}`}
          style={{
            left: `${c.x}%`,
            top: `${c.y}%`,
            fontSize: c.size,
            animationDelay: `${c.delay}s`,
            zIndex: 5,
            opacity: isNight ? 0.6 : 0.85,
            filter: isNight ? 'brightness(0.7)' : undefined,
          }}
        >
          {c.emoji}
        </div>
      ))}

      {/* Extra atmosphere (cave glow, etc.) */}
      {envConfig.atmosphereExtra && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: envConfig.atmosphereExtra, zIndex: 6 }}
        />
      )}

      {/* Floating particles */}
      {particles.map(p => (
        <div
          key={p.id}
          className="envParticle absolute rounded-full"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: p.size,
            height: p.size,
            background: accent,
            opacity: p.opacity * (isNight ? 0.6 : 1),
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            zIndex: 7,
          }}
        />
      ))}

      {/* Night overlay */}
      {isNight && (
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% 30%, transparent 0%, rgba(0,0,20,0.4) 100%)',
          zIndex: 8,
        }}>
          {Array.from({ length: 12 }, (_, i) => (
            <div
              key={i}
              className="envStar absolute rounded-full"
              style={{
                left: `${8 + (i * 7.5) % 85}%`,
                top: `${5 + (i * 11) % 30}%`,
                width: 1.5 + (i % 3),
                height: 1.5 + (i % 3),
                background: '#e8e4d8',
                opacity: 0.4 + (i % 4) * 0.15,
                animationDelay: `${i * 0.7}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Central sampling equipment */}
      {tool && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 9 }}>
          <div className={`relative ${collecting ? 'envCollecting' : 'envIdle'}`}>
            <div
              className="absolute inset-0 rounded-full"
              style={{
                width: 120, height: 120,
                transform: 'translate(-50%, -50%)',
                left: '50%', top: '50%',
                background: `radial-gradient(circle, ${tool.glowColor}30 0%, transparent 70%)`,
                filter: collecting ? `drop-shadow(0 0 30px ${tool.glowColor}60)` : 'none',
              }}
            />
            <div className="text-7xl" style={{
              filter: `drop-shadow(0 4px 20px ${tool.glowColor}80)`,
              transform: collecting ? undefined : 'scale(0.9)',
              transition: 'transform 0.3s',
            }}>
              {tool.icon}
            </div>
          </div>
        </div>
      )}

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 70% 60% at 50% 50%, transparent 40%, rgba(0,0,0,0.5) 100%)',
          zIndex: 10,
        }}
      />

      <style>{`
        .envParticle { animation: envFloat linear infinite; }
        @keyframes envFloat {
          0% { transform: translateY(0) translateX(0); }
          25% { transform: translateY(-15px) translateX(5px); }
          50% { transform: translateY(-25px) translateX(-3px); opacity: 0.15; }
          75% { transform: translateY(-35px) translateX(4px); }
          100% { transform: translateY(-50px) translateX(0); opacity: 0; }
        }

        .envDrift { animation: envDriftX ease-in-out infinite alternate; }
        @keyframes envDriftX {
          0% { transform: translateX(-1.5%); }
          100% { transform: translateX(1.5%); }
        }

        .envWave { animation: envWaveMove ease-in-out infinite; }
        .envWave1 { animation-duration: 3s; }
        .envWave2 { animation-duration: 4s; animation-delay: 0.5s; }
        .envWave3 { animation-duration: 5s; animation-delay: 1s; }
        @keyframes envWaveMove {
          0%, 100% { transform: translateX(-5%); }
          50% { transform: translateX(5%); }
        }

        .envStar { animation: envTwinkle ease-in-out infinite 2s; }
        @keyframes envTwinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.8; }
        }

        .envCollecting { animation: envSample ease-in-out infinite 1.5s; }
        @keyframes envSample {
          0%, 100% { transform: scale(1) rotate(0deg); }
          25% { transform: scale(1.1) rotate(-3deg); }
          50% { transform: scale(1.05) rotate(2deg); }
          75% { transform: scale(1.12) rotate(-2deg); }
        }
        .envIdle { animation: envBreathe ease-in-out infinite 3s; }
        @keyframes envBreathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.04); }
        }

        /* Creature animations */
        .envAnim_float { animation: envCreatureFloat 4s ease-in-out infinite; }
        @keyframes envCreatureFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }

        .envAnim_drift { animation: envCreatureDrift 8s ease-in-out infinite; }
        @keyframes envCreatureDrift {
          0% { transform: translateX(0); }
          50% { transform: translateX(20px); }
          100% { transform: translateX(0); }
        }

        .envAnim_bob { animation: envCreatureBob 3s ease-in-out infinite; }
        @keyframes envCreatureBob {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-4px) rotate(-3deg); }
          75% { transform: translateY(2px) rotate(2deg); }
        }

        .envAnim_peek { animation: envCreaturePeek 6s ease-in-out infinite; }
        @keyframes envCreaturePeek {
          0%, 70%, 100% { transform: translateY(8px); opacity: 0.4; }
          20%, 50% { transform: translateY(0); opacity: 0.9; }
        }

        .envAnim_fly { animation: envCreatureFly 6s ease-in-out infinite; }
        @keyframes envCreatureFly {
          0% { transform: translate(0, 0); }
          25% { transform: translate(15px, -10px); }
          50% { transform: translate(30px, -5px); }
          75% { transform: translate(15px, -12px); }
          100% { transform: translate(0, 0); }
        }

        .envAnim_swim { animation: envCreatureSwim 5s ease-in-out infinite; }
        @keyframes envCreatureSwim {
          0% { transform: translateX(0) scaleX(1); }
          45% { transform: translateX(25px) scaleX(1); }
          50% { transform: translateX(25px) scaleX(-1); }
          95% { transform: translateX(0) scaleX(-1); }
          100% { transform: translateX(0) scaleX(1); }
        }
      `}</style>
    </div>
  );
}
