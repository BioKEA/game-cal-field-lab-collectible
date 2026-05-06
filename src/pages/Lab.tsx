import { useState, useCallback, useEffect } from 'react';
import { SPECIES } from '@/data/species';
import { BIOMES } from '@/data/biomes';
import { RARITY_COLORS, RARITY_LABELS, SAMPLING_METHOD_INFO } from '@/types/game';
import type { GameState, CollectedSpecimen } from '@/types/game';
import LabMachine from '@/components/LabMachine';
import DNABarcodeViewer from '@/components/DNABarcodeViewer';
import BarcodeMiniGame from '@/components/BarcodeMiniGame';
import { reportSpecimenIdentified } from '@/lib/golden-sample';

interface LabProps {
  state: GameState;
  onNavigate: (page: string) => void;
  onAdvanceLab: (specimenId: string, barcodeBonus?: number) => void;
  onDiscovery: (specimenId: string) => void;
}

const LAB_STAGES = [
  { key: 'collected', label: 'Queued', icon: '📦', machine: '', description: 'Waiting to enter the pipeline' },
  { key: 'extracting', label: 'DNA Extraction', icon: '🧪', machine: 'epMotion 5075', description: 'Liquid handler isolating DNA from tissue sample' },
  { key: 'pcr', label: 'PCR Amplify', icon: '🔄', machine: 'Thermocycler', description: 'Polymerase chain reaction amplifying target gene' },
  { key: 'qpcr', label: 'qPCR Check', icon: '📊', machine: 'qPCR Machine', description: 'Quantitative PCR verifying amplification quality' },
  { key: 'sequencing', label: 'Sequencing', icon: '🧬', machine: 'PromethION 2', description: 'Nanopore sequencing reading DNA bases in real-time' },
  { key: 'identified', label: 'Identified', icon: '✅', machine: '', description: 'Species match confirmed via barcode database' },
] as const;

function getStageIndex(status: CollectedSpecimen['labStatus']): number {
  return LAB_STAGES.findIndex(s => s.key === status);
}

function getReagentForStage(stage: string): string | null {
  switch (stage) {
    case 'extracting': return 'extractionKits';
    case 'pcr': return 'pcrPrimers';
    case 'sequencing': return 'flowCells';
    default: return null;
  }
}

function getReagentName(stage: string): string {
  switch (stage) {
    case 'extracting': return 'Extraction Kit';
    case 'pcr': return 'PCR Primer';
    case 'sequencing': return 'Flow Cell';
    default: return '';
  }
}

export default function Lab({ state, onNavigate, onAdvanceLab, onDiscovery }: LabProps) {
  const [selectedSpecimenId, setSelectedSpecimenId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [detailSpecimenId, setDetailSpecimenId] = useState<string | null>(null);
  const [barcodeSpecimenId, setBarcodeSpecimenId] = useState<string | null>(null);

  // Specimens in the pipeline (not yet identified and not failed)
  const pipelineSpecimens = state.specimens.filter(
    s => s.labStatus !== 'identified' && s.labStatus !== 'failed'
  );
  const identifiedSpecimens = state.specimens.filter(s => s.labStatus === 'identified');

  const selectedSpecimen = selectedSpecimenId
    ? state.specimens.find(s => s.id === selectedSpecimenId)
    : null;

  const handleAdvance = useCallback(() => {
    if (!selectedSpecimen || processing) return;

    const nextStageIdx = getStageIndex(selectedSpecimen.labStatus) + 1;
    if (nextStageIdx >= LAB_STAGES.length) return;

    const nextStage = LAB_STAGES[nextStageIdx];
    const reagentKey = getReagentForStage(nextStage.key);
    if (reagentKey && state.reagents[reagentKey as keyof typeof state.reagents] <= 0) return;

    // Intercept the final identification step with the barcode mini-game
    if (nextStage.key === 'identified') {
      setBarcodeSpecimenId(selectedSpecimen.id);
      return;
    }

    setProcessing(true);

    // Machine animation sequence
    setTimeout(() => {
      onAdvanceLab(selectedSpecimen.id);
      setProcessing(false);
    }, 2400);
  }, [selectedSpecimen, processing, state.reagents, onAdvanceLab]);

  const handleBarcodeComplete = useCallback((bonus: number) => {
    const id = barcodeSpecimenId;
    if (!id) return;
    setBarcodeSpecimenId(null);
    setProcessing(true);
    setTimeout(() => {
      onAdvanceLab(id, bonus);
      setProcessing(false);
      onDiscovery(id);
      // Golden Sample 26: this is the moment a specimen becomes
      // 'identified'. Report the new total to the hunt API and
      // attempt to claim slot 3 (5 specimens processed).
      // I won't tell. That would be cheating.
      void reportSpecimenIdentified(identifiedSpecimens.length + 1);
    }, 800);
  }, [barcodeSpecimenId, onAdvanceLab, onDiscovery, identifiedSpecimens.length]);

  const handleBarcodeSkip = useCallback(() => {
    const id = barcodeSpecimenId;
    if (!id) return;
    setBarcodeSpecimenId(null);
    setProcessing(true);
    setTimeout(() => {
      onAdvanceLab(id, 0);
      setProcessing(false);
      onDiscovery(id);
      void reportSpecimenIdentified(identifiedSpecimens.length + 1);
    }, 400);
  }, [barcodeSpecimenId, onAdvanceLab, onDiscovery, identifiedSpecimens.length]);

  // Auto-select first queued specimen if none selected
  useEffect(() => {
    if (!selectedSpecimenId && pipelineSpecimens.length > 0) {
      setSelectedSpecimenId(pipelineSpecimens[0].id);
    }
  }, [selectedSpecimenId, pipelineSpecimens]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0a1610' }}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b" style={{ borderColor: '#2a4030', background: '#0c1a12' }}>
        <button
          onClick={() => onNavigate('hq')}
          className="text-sm transition-colors"
          style={{ color: '#c9a84c' }}
        >
          ← HQ
        </button>
        <h2 className="text-sm font-semibold" style={{ color: '#e8e4d8', fontFamily: "'Outfit', sans-serif" }}>
          Laboratory
        </h2>
        <div className="flex items-center gap-3 text-xs">
          <span style={{ color: '#8aaa7a' }}>🧪 {state.reagents.extractionKits}</span>
          <span style={{ color: '#8aaa7a' }}>🔄 {state.reagents.pcrPrimers}</span>
          <span style={{ color: '#8aaa7a' }}>🧬 {state.reagents.flowCells}</span>
        </div>
      </div>

      {pipelineSpecimens.length === 0 && identifiedSpecimens.length === 0 ? (
        /* Empty State */
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <div className="text-5xl mb-4">🔬</div>
            <div className="text-lg font-semibold mb-2" style={{ color: '#e8e4d8', fontFamily: 'Georgia, serif' }}>
              Lab is Empty
            </div>
            <p className="text-sm mb-6" style={{ color: '#5a7a5a' }}>
              Go on a Field Expedition to collect specimens, then bring them here for processing.
            </p>
            <button
              onClick={() => onNavigate('expedition')}
              className="px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #1a3520, #14231a)',
                border: '1.5px solid #4a8a4a',
                color: '#c9a84c',
              }}
            >
              🌿 Start Expedition
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Pipeline Overview */}
          <div className="flex-1 flex flex-col overflow-hidden p-3">
            <div className="text-[11px] font-semibold mb-2 shrink-0" style={{ color: '#5a7a5a', letterSpacing: '1px' }}>
              PROCESSING PIPELINE · {pipelineSpecimens.length} specimen{pipelineSpecimens.length !== 1 ? 's' : ''} queued
            </div>

            {/* Specimen Queue */}
            <div className="space-y-1.5 mb-3 overflow-y-auto flex-1 min-h-0">
              {pipelineSpecimens.map(specimen => {
                const species = SPECIES.find(s => s.id === specimen.speciesId);
                const stageIdx = getStageIndex(specimen.labStatus);
                const stage = LAB_STAGES[stageIdx];
                const isSelected = selectedSpecimenId === specimen.id;

                return (
                  <button
                    key={specimen.id}
                    onClick={() => setSelectedSpecimenId(specimen.id)}
                    className="w-full rounded-lg px-2.5 py-2 text-left transition-all hover:scale-[1.01] active:scale-[0.99]"
                    style={{
                      background: isSelected
                        ? 'linear-gradient(135deg, #1a3520, #14231a)'
                        : '#14231a',
                      border: `1.5px solid ${isSelected ? '#c9a84c' : '#2a4030'}`,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="text-xl">{species?.emoji || '❓'}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-sm font-semibold truncate" style={{ color: '#e8e4d8' }}>
                            {species ? `Specimen #${specimen.id.slice(-4)}` : 'Unknown'}
                          </span>
                          <span className="text-[11px]" style={{ color: '#5a7a5a' }}>
                            {stage.icon} {stage.label}
                          </span>
                        </div>
                        {stage.machine && (
                          <div className="text-[11px]" style={{ color: '#8aaa7a' }}>{stage.machine}</div>
                        )}
                      </div>
                      <div className="flex gap-0.5">
                        {LAB_STAGES.map((s, i) => (
                          <div
                            key={s.key}
                            className="w-1.5 h-1.5 rounded-full"
                            style={{
                              background: i <= stageIdx ? '#4a8a4a' : '#1a2e20',
                              boxShadow: i === stageIdx ? '0 0 4px #4a8a4a80' : 'none',
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </button>
                );
              })}

              {/* Identified Specimens */}
              {identifiedSpecimens.length > 0 && (
                <div className="mt-3">
                  <div className="text-[11px] font-semibold mb-2 mt-1" style={{ color: '#5a7a5a', letterSpacing: '1px' }}>
                    IDENTIFIED · {identifiedSpecimens.length} specimen{identifiedSpecimens.length !== 1 ? 's' : ''}
                  </div>
                  <div className="space-y-1.5">
                    {identifiedSpecimens.map(specimen => {
                      const species = SPECIES.find(s => s.id === specimen.speciesId);
                      if (!species) return null;
                      return (
                        <button
                          key={specimen.id}
                          onClick={() => setDetailSpecimenId(specimen.id)}
                          className="w-full rounded-lg px-2.5 py-2 flex items-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] text-left"
                          style={{
                            background: '#14231a',
                            border: `1px solid ${RARITY_COLORS[species.rarity]}30`,
                          }}
                        >
                          <div
                            className="text-xl"
                            style={{ filter: `drop-shadow(0 0 6px ${RARITY_COLORS[species.rarity]}30)` }}
                          >
                            {species.emoji}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold truncate" style={{ color: '#e8e4d8' }}>
                              {species.commonName}
                            </div>
                            <div className="text-[11px] italic truncate" style={{ color: '#5a7a5a' }}>
                              {species.scientificName}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-0.5">
                            <div
                              className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                              style={{
                                background: `${RARITY_COLORS[species.rarity]}20`,
                                color: RARITY_COLORS[species.rarity],
                              }}
                            >
                              {RARITY_LABELS[species.rarity]}
                            </div>
                            {specimen.matchPercent && (
                              <div className="text-[10px] font-mono" style={{ color: '#c9a84c' }}>
                                {specimen.matchPercent.toFixed(1)}%
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Machine Close-up */}
            {selectedSpecimen && selectedSpecimen.labStatus !== 'identified' && (
              <div
                className="rounded-xl p-3.5 mb-3 shrink-0"
                style={{
                  background: 'linear-gradient(180deg, #14231a, #0f1f15)',
                  border: '1.5px solid #2a4030',
                }}
              >
                {/* Stage Pipeline Visual */}
                {(() => {
                  const currentIdx = getStageIndex(selectedSpecimen.labStatus);
                  const mobileMin = currentIdx === 0 ? 0 : currentIdx - 1;
                  const mobileMax = Math.min(currentIdx + 1, LAB_STAGES.length - 1);

                  return (
                    <div className="flex items-center justify-between mb-4">
                      {LAB_STAGES.map((stage, i) => {
                        const isPast = i < currentIdx;
                        const isCurrent = i === currentIdx;
                        const inMobileWindow = i >= mobileMin && i <= mobileMax;
                        return (
                          <div key={stage.key} className={`flex items-center ${inMobileWindow ? '' : 'hidden sm:flex'}`}>
                            <div className="flex flex-col items-center">
                              <div
                                className="w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all"
                                style={{
                                  background: isPast ? '#4a8a4a' : isCurrent ? '#c9a84c' : '#1a2e20',
                                  border: `2.5px solid ${isPast ? '#4a8a4a' : isCurrent ? '#c9a84c' : '#2a4030'}`,
                                  boxShadow: isCurrent ? '0 0 16px #c9a84c50' : 'none',
                                }}
                              >
                                {isPast ? '✓' : stage.icon}
                              </div>
                              <div
                                className="mt-1 text-center font-semibold"
                                style={{
                                  color: isCurrent ? '#c9a84c' : isPast ? '#4a8a4a' : '#5a7a5a',
                                  fontSize: '10px',
                                  maxWidth: '56px',
                                  lineHeight: '1.2',
                                }}
                              >
                                {stage.label}
                              </div>
                            </div>
                            {i < LAB_STAGES.length - 1 && (
                              <div
                                className={`w-4 h-0.5 mx-0.5 ${(i >= mobileMin && i < mobileMax) ? '' : 'hidden sm:block'}`}
                                style={{ background: isPast ? '#4a8a4a' : '#1a2e20' }}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Current Machine */}
                <div className="text-center mb-3">
                  <LabMachine
                    stageKey={selectedSpecimen.labStatus}
                    processing={processing}
                  />
                  {LAB_STAGES[getStageIndex(selectedSpecimen.labStatus)].machine && (
                    <div className="text-sm sm:text-lg mt-2 font-semibold" style={{ color: '#8aaa7a' }}>
                      {LAB_STAGES[getStageIndex(selectedSpecimen.labStatus)].machine}
                    </div>
                  )}
                  <div className="text-xs sm:text-sm mt-0.5" style={{ color: '#5a7a5a' }}>
                    {LAB_STAGES[getStageIndex(selectedSpecimen.labStatus)].description}
                  </div>
                </div>

                {/* Specimen data readouts */}
                <div className="grid grid-cols-3 gap-1.5 mb-3">
                  {selectedSpecimen.concentration !== undefined && (
                    <div className="rounded-md px-2 py-1.5 text-center" style={{ background: '#0c1a12', border: '1px solid #1a2e20' }}>
                      <div className="text-[10px]" style={{ color: '#5a7a5a' }}>DNA ng/µL</div>
                      <div className="text-xs font-semibold" style={{ color: '#4a8a4a' }}>
                        {selectedSpecimen.concentration.toFixed(1)}
                      </div>
                    </div>
                  )}
                  {selectedSpecimen.ctValue !== undefined && (
                    <div className="rounded-md px-2 py-1.5 text-center" style={{ background: '#0c1a12', border: '1px solid #1a2e20' }}>
                      <div className="text-[10px]" style={{ color: '#5a7a5a' }}>Ct Value</div>
                      <div className="text-xs font-semibold" style={{ color: '#c9a84c' }}>
                        {selectedSpecimen.ctValue.toFixed(1)}
                      </div>
                    </div>
                  )}
                  {selectedSpecimen.matchPercent !== undefined && (
                    <div className="rounded-md px-2 py-1.5 text-center" style={{ background: '#0c1a12', border: '1px solid #1a2e20' }}>
                      <div className="text-[10px]" style={{ color: '#5a7a5a' }}>Match %</div>
                      <div className="text-xs font-semibold" style={{ color: '#4a8a4a' }}>
                        {selectedSpecimen.matchPercent.toFixed(1)}%
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}

          </div>

          {/* Pinned advance button — always visible at bottom */}
          {selectedSpecimen && selectedSpecimen.labStatus !== 'identified' && (() => {
            const nextStageIdx = getStageIndex(selectedSpecimen.labStatus) + 1;
            if (nextStageIdx >= LAB_STAGES.length) return null;
            const nextStage = LAB_STAGES[nextStageIdx];
            const reagentKey = getReagentForStage(nextStage.key);
            const hasReagent = !reagentKey || state.reagents[reagentKey as keyof typeof state.reagents] > 0;
            const reagentName = getReagentName(nextStage.key);

            return (
              <div className="shrink-0 px-3 pb-3 pt-1.5">
                <button
                  onClick={handleAdvance}
                  disabled={processing || !hasReagent}
                  className="w-full rounded-lg px-3 py-3 text-center font-semibold transition-all hover:scale-[1.01] active:scale-[0.97] disabled:opacity-40"
                  style={{
                    background: hasReagent
                      ? 'linear-gradient(135deg, #2a5530, #1a3520)'
                      : '#14231a',
                    border: `1.5px solid ${hasReagent ? '#4a8a4a' : '#2a4030'}`,
                    color: '#e8e4d8',
                    boxShadow: hasReagent ? '0 -2px 12px rgba(74, 138, 74, 0.15)' : 'none',
                  }}
                >
                  {processing ? (
                    <span style={{ color: '#c9a84c' }}>Processing...</span>
                  ) : !hasReagent ? (
                    <span style={{ color: '#c9a84c' }}>Need {reagentName}</span>
                  ) : (
                    <span>
                      {nextStage.icon} Start {nextStage.label}
                      {reagentName && (
                        <span className="text-xs ml-2" style={{ color: '#8aaa7a' }}>
                          (uses 1 {reagentName})
                        </span>
                      )}
                    </span>
                  )}
                </button>
              </div>
            );
          })()}

        </div>
      )}

      {/* Barcode mini-game (intercepts sequencing → identified) */}
      {barcodeSpecimenId && (() => {
        const spec = state.specimens.find(s => s.id === barcodeSpecimenId);
        const sp = spec ? SPECIES.find(s => s.id === spec.speciesId) : null;
        if (!spec || !sp) return null;
        return (
          <BarcodeMiniGame
            speciesId={sp.id}
            speciesName={sp.commonName}
            speciesEmoji={sp.emoji}
            gene={sp.barcodeGene}
            onComplete={handleBarcodeComplete}
            onSkip={handleBarcodeSkip}
          />
        );
      })()}

      {/* Identified Specimen Detail Modal */}
      {detailSpecimenId && (() => {
        const specimen = state.specimens.find(s => s.id === detailSpecimenId);
        const species = specimen ? SPECIES.find(sp => sp.id === specimen.speciesId) : null;
        const biome = specimen ? BIOMES.find(b => b.id === specimen.biomeId) : null;
        const point = biome?.collectionPoints.find(p => p.id === specimen?.collectionPointId);
        if (!specimen || !species) return null;
        const rarityColor = RARITY_COLORS[species.rarity];
        const methodInfo = SAMPLING_METHOD_INFO[specimen.samplingMethod];
        return (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center"
            style={{ background: 'rgba(10,22,16,0.85)' }}
            onClick={() => setDetailSpecimenId(null)}
          >
            <div
              className="w-full max-w-md rounded-t-2xl max-h-[90vh] overflow-y-auto"
              style={{
                background: 'linear-gradient(180deg, #14231a, #0f1f15)',
                border: `1px solid ${rarityColor}60`,
                borderBottom: 'none',
                boxShadow: `0 -10px 60px ${rarityColor}20`,
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div
                className="sticky top-0 z-10 px-5 pt-5 pb-3 flex items-start justify-between"
                style={{ background: 'linear-gradient(180deg, #14231a 70%, transparent)' }}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    className="text-5xl"
                    style={{ filter: `drop-shadow(0 0 12px ${rarityColor}50)` }}
                  >
                    {species.emoji}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-mono mb-0.5" style={{ color: '#5a7a5a' }}>
                      #{specimen.id.slice(-6).toUpperCase()}
                    </div>
                    <div className="text-lg font-bold truncate" style={{ color: '#e8e4d8', fontFamily: 'Georgia, serif' }}>
                      {species.commonName}
                    </div>
                    <div className="text-xs italic truncate" style={{ color: '#8aaa7a' }}>
                      {species.scientificName}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setDetailSpecimenId(null)}
                  className="text-lg ml-2 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ color: '#5a7a5a', background: '#0c1a12' }}
                >
                  ✕
                </button>
              </div>

              <div className="px-5 pb-6 space-y-4">
                {/* Rarity + ID status */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div
                    className="px-3 py-1 rounded-full text-xs font-bold"
                    style={{
                      background: `${rarityColor}20`,
                      color: rarityColor,
                      border: `1px solid ${rarityColor}40`,
                    }}
                  >
                    {RARITY_LABELS[species.rarity]}
                  </div>
                  <div
                    className="px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"
                    style={{ background: '#1a3520', color: '#4a8a4a', border: '1px solid #4a8a4a40' }}
                  >
                    ✓ Identified
                  </div>
                </div>

                {/* Lab metrics */}
                <div>
                  <div className="text-[10px] font-semibold mb-2 tracking-wider" style={{ color: '#5a7a5a' }}>
                    LAB METRICS
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <LabMetric
                      label="DNA"
                      value={specimen.concentration ? `${specimen.concentration.toFixed(1)}` : '—'}
                      unit="ng/µL"
                      color="#4a8a4a"
                    />
                    <LabMetric
                      label="Ct Value"
                      value={specimen.ctValue ? specimen.ctValue.toFixed(1) : '—'}
                      unit="cycles"
                      color="#c9a84c"
                    />
                    <LabMetric
                      label="Match"
                      value={specimen.matchPercent ? `${specimen.matchPercent.toFixed(1)}%` : '—'}
                      unit="confidence"
                      color={specimen.matchPercent && specimen.matchPercent >= 98 ? '#4a8a4a' : '#60a5fa'}
                    />
                  </div>
                </div>

                {/* DNA barcode */}
                <div>
                  <div className="text-[10px] font-semibold mb-2 tracking-wider" style={{ color: '#5a7a5a' }}>
                    SEQUENCED BARCODE
                  </div>
                  <DNABarcodeViewer
                    seed={specimen.id}
                    gene={species.barcodeGene}
                    length={species.barcodeLength}
                    matchPercent={specimen.matchPercent}
                  />
                </div>

                {/* Collection details */}
                <div
                  className="rounded-xl p-3"
                  style={{ background: '#0c1a12', border: '1px solid #1a2e20' }}
                >
                  <div className="text-[10px] font-semibold mb-2 tracking-wider" style={{ color: '#5a7a5a' }}>
                    COLLECTION RECORD
                  </div>
                  <div className="space-y-2 text-xs">
                    <DetailRow
                      icon="📅"
                      label="Collected"
                      value={new Date(specimen.collectedAt).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    />
                    {biome && (
                      <DetailRow
                        icon={biome.emoji}
                        label="Location"
                        value={`${biome.name}${point ? ` · ${point.name}` : ''}`}
                      />
                    )}
                    <DetailRow
                      icon={methodInfo.emoji}
                      label="Method"
                      value={methodInfo.name}
                    />
                    <DetailRow
                      icon="🧬"
                      label="Target gene"
                      value={`${species.barcodeGene} (${species.barcodeLength} bp)`}
                    />
                    <DetailRow
                      icon="🏷️"
                      label="Classification"
                      value={`${species.order} · ${species.family}`}
                    />
                    <DetailRow
                      icon="🛡️"
                      label="Conservation"
                      value={species.conservationStatus}
                    />
                  </div>
                </div>

                {/* Description */}
                <div
                  className="rounded-xl p-3"
                  style={{ background: '#0c1a12', border: '1px solid #1a2e20' }}
                >
                  <div className="text-[10px] font-semibold mb-1.5 tracking-wider" style={{ color: '#c9a84c' }}>
                    ✦ SPECIES NOTE
                  </div>
                  <p className="text-xs leading-relaxed mb-2" style={{ color: '#a8c4a0' }}>
                    {species.description}
                  </p>
                  <p className="text-xs italic" style={{ color: '#8aaa7a' }}>
                    {species.funFact}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function LabMetric({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <div className="rounded-md px-2 py-1.5 text-center" style={{ background: '#0c1a12', border: '1px solid #1a2e20' }}>
      <div className="text-[9px] tracking-wider" style={{ color: '#5a7a5a' }}>{label.toUpperCase()}</div>
      <div className="text-xs font-bold font-mono mt-0.5" style={{ color }}>{value}</div>
      <div className="text-[8px]" style={{ color: '#2a4030' }}>{unit}</div>
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-sm flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[10px]" style={{ color: '#5a7a5a' }}>{label}</div>
        <div className="font-semibold" style={{ color: '#a8c4a0' }}>{value}</div>
      </div>
    </div>
  );
}
