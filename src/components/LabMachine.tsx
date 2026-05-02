import { useState, useEffect } from 'react';

interface LabMachineProps {
  stageKey: string;
  processing: boolean;
}

function EpMotion({ processing }: { processing: boolean }) {
  const [armPos, setArmPos] = useState(20);
  const [filledWells, setFilledWells] = useState(0);

  useEffect(() => {
    if (!processing) { setArmPos(20); setFilledWells(0); return; }
    const arm = setInterval(() => setArmPos(p => p >= 80 ? 15 : p + 5), 200);
    const wells = setInterval(() => setFilledWells(p => Math.min(p + 1, 24)), 80);
    return () => { clearInterval(arm); clearInterval(wells); };
  }, [processing]);

  return (
    <div className="relative w-full h-full overflow-hidden rounded-lg" style={{ background: '#0c1610' }}>
      {/* Machine housing */}
      <div className="absolute inset-1 rounded" style={{ background: '#121e16', border: '1px solid #2a4030' }}>
        {/* Rail */}
        <div className="absolute top-3 left-2 right-2 h-0.5 rounded" style={{ background: '#2a4030' }} />
        {/* Arm */}
        <div
          className="absolute top-1.5 transition-all duration-200"
          style={{ left: `${armPos}%` }}
        >
          <div className="w-5 h-3 rounded-sm" style={{ background: '#3a5a40', border: '1px solid #4a8a4a' }} />
          <div className="w-0.5 mx-auto rounded-b" style={{
            background: processing ? '#c9a84c' : '#5a7a5a',
            height: processing ? '32px' : '20px',
            transition: 'height 0.3s',
          }} />
          {processing && <div className="w-1 h-1 rounded-full mx-auto mt-0.5" style={{ background: '#4a8a4a', boxShadow: '0 0 4px #4a8a4a' }} />}
        </div>
        {/* Well plate */}
        <div className="absolute bottom-2 left-3 right-3 grid grid-cols-8 gap-px">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="w-2 h-2 rounded-full transition-all duration-300" style={{
              background: i < filledWells ? '#4a8a4a' : '#1a2e20',
              boxShadow: i < filledWells ? '0 0 3px #4a8a4a60' : 'none',
            }} />
          ))}
        </div>
      </div>
      {/* Status LED */}
      <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full" style={{
        background: processing ? '#4a8a4a' : '#5a7a5a',
        boxShadow: processing ? '0 0 6px #4a8a4a' : 'none',
        animation: processing ? 'pulse 1s infinite' : 'none',
      }} />
    </div>
  );
}

function Thermocycler({ processing }: { processing: boolean }) {
  const [temp, setTemp] = useState(25);
  const [cycle, setCycle] = useState(0);
  const temps = [95, 55, 72];
  const labels = ['Denature', 'Anneal', 'Extend'];

  useEffect(() => {
    if (!processing) { setTemp(25); setCycle(0); return; }
    let step = 0;
    const interval = setInterval(() => {
      step = (step + 1) % 3;
      setTemp(temps[step]);
      setCycle(step);
    }, 600);
    return () => clearInterval(interval);
  }, [processing]);

  return (
    <div className="relative w-full h-full overflow-hidden rounded-lg" style={{ background: '#0c1610' }}>
      <div className="absolute inset-1 rounded" style={{ background: '#121e16', border: '1px solid #2a4030' }}>
        {/* Lid */}
        <div className="absolute top-0 left-0 right-0 h-5 rounded-t flex items-center justify-center" style={{
          background: processing ? 'linear-gradient(180deg, #3a2010, #2a1808)' : '#1a2e20',
          transition: 'background 0.5s',
        }}>
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-1 h-1 rounded-full" style={{
                background: cycle === i && processing ? '#c9a84c' : '#2a4030',
                transition: 'background 0.3s',
              }} />
            ))}
          </div>
        </div>
        {/* Temp display */}
        <div className="absolute top-7 left-0 right-0 text-center">
          <div className="text-lg font-mono font-bold" style={{
            color: temp > 80 ? '#ef4444' : temp < 60 ? '#60a5fa' : '#4a8a4a',
            transition: 'color 0.5s',
            textShadow: processing ? `0 0 8px ${temp > 80 ? '#ef444440' : '#4a8a4a40'}` : 'none',
          }}>
            {processing ? `${temp}°C` : '25°C'}
          </div>
          <div className="text-xs mt-0.5" style={{ color: '#5a7a5a', fontSize: '8px' }}>
            {processing ? labels[cycle] : 'Standby'}
          </div>
        </div>
        {/* Heat bars */}
        <div className="absolute bottom-2 left-2 right-2 flex gap-0.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex-1 h-3 rounded-sm transition-all duration-500" style={{
              background: processing
                ? temp > 80 ? `rgba(239,68,68,${0.3 + (i / 16)})` : temp < 60 ? `rgba(96,165,250,${0.2 + (i / 20)})` : `rgba(74,138,74,${0.2 + (i / 16)})`
                : '#1a2e20',
            }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function QPCRMachine({ processing }: { processing: boolean }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!processing) { setProgress(0); return; }
    const interval = setInterval(() => setProgress(p => Math.min(p + 2, 100)), 40);
    return () => clearInterval(interval);
  }, [processing]);

  const visiblePoints = Math.floor((progress / 100) * 20);
  const partialCurve = Array.from({ length: visiblePoints }).map((_, i) => {
    const x = (i / 19) * 100;
    const t = (i / 19) * 12 - 6;
    const y = 100 - (100 / (1 + Math.exp(-t)));
    return `${10 + x * 0.8},${10 + y * 0.7}`;
  }).join(' ');

  return (
    <div className="relative w-full h-full overflow-hidden rounded-lg" style={{ background: '#0c1610' }}>
      <div className="absolute inset-1 rounded" style={{ background: '#121e16', border: '1px solid #2a4030' }}>
        {/* Graph area */}
        <svg viewBox="0 0 100 90" className="w-full h-full">
          {/* Grid lines */}
          {[25, 50, 75].map(y => (
            <line key={y} x1="10" y1={y} x2="90" y2={y} stroke="#1a2e20" strokeWidth="0.5" />
          ))}
          {/* Axis */}
          <line x1="10" y1="10" x2="10" y2="82" stroke="#2a4030" strokeWidth="0.5" />
          <line x1="10" y1="82" x2="90" y2="82" stroke="#2a4030" strokeWidth="0.5" />
          {/* Threshold line */}
          <line x1="10" y1="35" x2="90" y2="35" stroke="#c9a84c30" strokeWidth="0.5" strokeDasharray="2,2" />
          <text x="92" y="37" fill="#c9a84c60" fontSize="4">Ct</text>
          {/* Curve */}
          {processing && visiblePoints > 1 && (
            <polyline
              points={partialCurve}
              fill="none"
              stroke="#4a8a4a"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ filter: 'drop-shadow(0 0 2px #4a8a4a80)' }}
            />
          )}
          {/* Labels */}
          <text x="50" y="88" fill="#5a7a5a" fontSize="3.5" textAnchor="middle">Cycle</text>
          <text x="5" y="50" fill="#5a7a5a" fontSize="3.5" textAnchor="middle" transform="rotate(-90, 5, 50)">RFU</text>
        </svg>
      </div>
    </div>
  );
}

function PromethION({ processing }: { processing: boolean }) {
  const [bases, setBases] = useState<string[]>([]);
  const baseChars = ['A', 'T', 'C', 'G'];
  const baseColors: Record<string, string> = { A: '#4a8a4a', T: '#ef4444', C: '#60a5fa', G: '#c9a84c' };

  useEffect(() => {
    if (!processing) { setBases([]); return; }
    const interval = setInterval(() => {
      setBases(prev => {
        const next = [...prev, baseChars[Math.floor(Math.random() * 4)]];
        return next.length > 32 ? next.slice(-32) : next;
      });
    }, 60);
    return () => clearInterval(interval);
  }, [processing]);

  return (
    <div className="relative w-full h-full overflow-hidden rounded-lg" style={{ background: '#0c1610' }}>
      <div className="absolute inset-1 rounded" style={{ background: '#121e16', border: '1px solid #2a4030' }}>
        {/* Nanopore channel */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-8 h-2 rounded-full" style={{
          background: '#2a4030',
          boxShadow: processing ? '0 0 8px #4a8a4a40' : 'none',
        }}>
          <div className="w-2 h-full mx-auto rounded-full" style={{
            background: processing ? '#4a8a4a' : '#1a2e20',
            boxShadow: processing ? '0 0 4px #4a8a4a' : 'none',
          }} />
        </div>
        {/* Base stream */}
        <div className="absolute top-6 left-1 right-1 bottom-1 flex flex-wrap gap-px content-start overflow-hidden">
          {bases.map((base, i) => (
            <span key={i} className="font-mono text-xs font-bold" style={{
              color: baseColors[base],
              fontSize: '7px',
              lineHeight: '10px',
              opacity: 0.5 + (i / bases.length) * 0.5,
            }}>
              {base}
            </span>
          ))}
        </div>
        {/* Quality score bar */}
        {processing && (
          <div className="absolute bottom-1 left-1 right-1 h-1 rounded-full overflow-hidden" style={{ background: '#1a2e20' }}>
            <div className="h-full rounded-full transition-all" style={{
              width: `${Math.min(100, bases.length * 3)}%`,
              background: 'linear-gradient(90deg, #4a8a4a, #c9a84c)',
            }} />
          </div>
        )}
      </div>
    </div>
  );
}

function QueuedVial() {
  return (
    <div className="relative w-full h-full overflow-hidden rounded-lg" style={{ background: '#0c1610' }}>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl sm:text-5xl mb-1">📦</div>
          <div className="text-xs sm:text-sm" style={{ color: '#5a7a5a' }}>Ready for processing</div>
        </div>
      </div>
    </div>
  );
}

export default function LabMachine({ stageKey, processing }: LabMachineProps) {
  return (
    <div className="relative mx-auto rounded-xl overflow-hidden w-[260px] h-[170px] sm:w-[520px] sm:h-[255px]" style={{
      border: `2px solid ${processing ? '#4a8a4a40' : '#2a4030'}`,
      transition: 'border-color 0.5s',
    }}>
      {stageKey === 'collected' && <QueuedVial />}
      {stageKey === 'extracting' && <EpMotion processing={processing} />}
      {stageKey === 'pcr' && <Thermocycler processing={processing} />}
      {stageKey === 'qpcr' && <QPCRMachine processing={processing} />}
      {stageKey === 'sequencing' && <PromethION processing={processing} />}
      {/* Processing glow */}
      {processing && (
        <div className="absolute inset-0 pointer-events-none rounded-xl" style={{
          boxShadow: 'inset 0 0 20px #4a8a4a15',
        }} />
      )}
      <style>{`
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
}
