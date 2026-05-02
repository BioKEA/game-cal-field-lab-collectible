import { useState } from 'react';

interface NewResearcherModalProps {
  slotNum: number;
  onCancel: () => void;
  onConfirm: (name: string, avatar: string) => void;
}

const AVATARS = [
  '🧑‍🔬', '👩‍🔬', '👨‍🔬',
  '🦉', '🦊', '🐺',
  '🦋', '🪲', '🐸',
  '🌿', '🍄', '🌱',
];

export default function NewResearcherModal({
  slotNum,
  onCancel,
  onConfirm,
}: NewResearcherModalProps) {
  const [name, setName] = useState('Researcher');
  const [avatar, setAvatar] = useState<string>('🧑‍🔬');

  const trimmed = name.trim();
  const canConfirm = trimmed.length >= 2 && trimmed.length <= 20;

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm(trimmed, avatar);
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
      style={{ background: 'rgba(5, 11, 8, 0.94)', backdropFilter: 'blur(6px)' }}
      onClick={onCancel}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl overflow-hidden relative animate-modal-in"
        style={{
          background: 'linear-gradient(180deg, #14231a, #0a1610)',
          border: '2px solid #c9a84c',
          boxShadow: '0 0 60px rgba(201,168,76,0.25), 0 20px 60px rgba(0,0,0,0.8)',
          fontFamily: "'Outfit', sans-serif",
        }}
      >
        {/* Corner jewels */}
        <div className="absolute -top-1 -left-1 text-sm" style={{ color: '#c9a84c' }}>◆</div>
        <div className="absolute -top-1 -right-1 text-sm" style={{ color: '#c9a84c' }}>◆</div>
        <div className="absolute -bottom-1 -left-1 text-sm" style={{ color: '#c9a84c' }}>◆</div>
        <div className="absolute -bottom-1 -right-1 text-sm" style={{ color: '#c9a84c' }}>◆</div>

        {/* Header */}
        <div
          className="px-6 pt-5 pb-4 text-center border-b"
          style={{ borderColor: '#2a4030', background: 'rgba(201,168,76,0.06)' }}
        >
          <div
            className="text-[10px] tracking-[0.3em] font-bold"
            style={{ color: '#c9a84c' }}
          >
            REGISTER · FILE {['I', 'II', 'III'][slotNum - 1] || slotNum}
          </div>
          <h2
            className="text-2xl italic font-bold mt-1"
            style={{ fontFamily: "'Cinzel', Georgia, serif", color: '#e8e4d8' }}
          >
            New Researcher
          </h2>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {/* Preview */}
          <div
            className="rounded-xl p-4 flex items-center gap-3"
            style={{
              background: 'linear-gradient(135deg, #1a3520, #0f1f15)',
              border: '1.5px solid #c9a84c50',
            }}
          >
            <div
              className="w-16 h-16 rounded-lg flex items-center justify-center text-4xl shrink-0"
              style={{
                background: 'radial-gradient(circle, #1a3520, #0a1610)',
                border: '1.5px solid #c9a84c80',
                boxShadow: 'inset 0 0 12px rgba(201,168,76,0.2)',
              }}
            >
              {avatar}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[9px] tracking-widest" style={{ color: '#8aaa7a' }}>
                FIELD TAG
              </div>
              <div
                className="text-lg font-bold truncate"
                style={{ fontFamily: "'Cinzel', Georgia, serif", color: '#e8e4d8' }}
              >
                {trimmed || <span className="italic opacity-60">(your name)</span>}
              </div>
              <div className="text-[10px]" style={{ color: '#8aaa7a' }}>
                ⭐ Volunteer · 0 discoveries
              </div>
            </div>
          </div>

          {/* Name input */}
          <div>
            <label
              className="block text-[10px] tracking-widest font-bold mb-2"
              style={{ color: '#c9a84c' }}
            >
              RESEARCHER NAME
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value.slice(0, 20))}
              maxLength={20}
              autoFocus
              placeholder="Dr. Maren"
              className="w-full rounded-lg px-3 py-2.5 text-base transition-all outline-none"
              style={{
                background: '#0a1610',
                border: `1.5px solid ${canConfirm ? '#4a8a4a' : '#2a4030'}`,
                color: '#e8e4d8',
                fontFamily: "'Cinzel', Georgia, serif",
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && canConfirm) handleConfirm();
              }}
            />
            <div className="text-[9px] mt-1" style={{ color: '#5a7a5a' }}>
              {trimmed.length}/20 · at least 2 characters
            </div>
          </div>

          {/* Avatar picker */}
          <div>
            <label
              className="block text-[10px] tracking-widest font-bold mb-2"
              style={{ color: '#c9a84c' }}
            >
              CHOOSE AN EMBLEM
            </label>
            <div className="grid grid-cols-6 gap-1.5">
              {AVATARS.map(a => {
                const selected = a === avatar;
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAvatar(a)}
                    className="aspect-square rounded-lg flex items-center justify-center text-2xl transition-all hover:scale-[1.08] active:scale-[0.95]"
                    style={{
                      background: selected
                        ? 'radial-gradient(circle, #1a3520, #0f1f15)'
                        : '#0a1610',
                      border: `1.5px solid ${selected ? '#c9a84c' : '#2a4030'}`,
                      boxShadow: selected
                        ? '0 0 12px rgba(201,168,76,0.35), inset 0 0 8px rgba(201,168,76,0.15)'
                        : 'none',
                    }}
                  >
                    {a}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={onCancel}
              className="flex-1 rounded-lg py-2.5 text-xs font-bold transition-all"
              style={{
                background: '#14231a',
                border: '1.5px solid #2a4030',
                color: '#8aaa7a',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="flex-[2] rounded-lg py-2.5 text-xs font-bold transition-all hover:scale-[1.02] disabled:opacity-40 disabled:hover:scale-100"
              style={{
                background: canConfirm
                  ? 'linear-gradient(135deg, #2a5530, #1a3520)'
                  : '#14231a',
                border: `1.5px solid ${canConfirm ? '#c9a84c' : '#2a4030'}`,
                color: canConfirm ? '#c9a84c' : '#5a7a5a',
              }}
            >
              🧬 Begin Survey
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.94) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-modal-in {
          animation: modalIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
