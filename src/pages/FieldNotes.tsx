import { useMemo } from 'react';
import { BIOMES } from '@/data/biomes';
import type { GameState, FieldNote } from '@/types/game';

interface FieldNotesProps {
  state: GameState;
  onNavigate: (page: string) => void;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function NoteCard({ note }: { note: FieldNote }) {
  const biome = BIOMES.find(b => b.id === note.biomeId);
  const typeColors: Record<string, string> = {
    collection: '#4a8a4a',
    discovery: '#c9a84c',
    expedition: '#8aaa7a',
    milestone: '#a855f7',
  };

  return (
    <div
      className="rounded-xl p-3 transition-all"
      style={{
        background: note.type === 'discovery'
          ? 'linear-gradient(135deg, #1a2e20, #1a2518)'
          : '#14231a',
        border: `1px solid ${note.type === 'discovery' ? '#c9a84c30' : '#2a4030'}`,
      }}
    >
      <div className="flex items-start gap-3">
        <div className="text-xl shrink-0 mt-0.5">{note.emoji || '📝'}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{
                background: `${typeColors[note.type]}20`,
                color: typeColors[note.type],
              }}
            >
              {note.type === 'discovery' ? 'DISCOVERY' : note.type === 'collection' ? 'Sample' : note.type.charAt(0).toUpperCase() + note.type.slice(1)}
            </span>
            {biome && (
              <span className="text-xs" style={{ color: '#5a7a5a' }}>
                {biome.emoji} {biome.name}
              </span>
            )}
          </div>
          <p className="text-xs leading-relaxed" style={{ color: '#e8e4d8' }}>
            {note.text}
          </p>
          <div className="text-xs mt-1.5" style={{ color: '#5a7a5a', fontSize: '10px' }}>
            {formatTime(note.timestamp)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FieldNotes({ state, onNavigate }: FieldNotesProps) {
  const notes = useMemo(
    () => [...state.fieldNotes].reverse(),
    [state.fieldNotes]
  );

  const discoveries = notes.filter(n => n.type === 'discovery').length;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0a1610' }}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b" style={{ borderColor: '#2a4030', background: '#0c1a12' }}>
        <button
          onClick={() => onNavigate('hq')}
          className="text-sm"
          style={{ color: '#c9a84c' }}
        >
          ← HQ
        </button>
        <h2 className="text-sm font-semibold" style={{ color: '#e8e4d8', fontFamily: "'Outfit', sans-serif" }}>
          Field Notes
        </h2>
        <div className="text-xs" style={{ color: '#8aaa7a' }}>
          {notes.length} entries
        </div>
      </div>

      {/* Stats banner */}
      <div className="px-4 py-3">
        <div className="rounded-xl p-3 flex justify-around" style={{ background: '#14231a', border: '1px solid #2a4030' }}>
          <div className="text-center">
            <div className="text-lg font-bold" style={{ color: '#e8e4d8', fontFamily: 'Georgia, serif' }}>
              {notes.length}
            </div>
            <div className="text-xs" style={{ color: '#5a7a5a' }}>Notes</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold" style={{ color: '#c9a84c', fontFamily: 'Georgia, serif' }}>
              {discoveries}
            </div>
            <div className="text-xs" style={{ color: '#5a7a5a' }}>Discoveries</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold" style={{ color: '#4a8a4a', fontFamily: 'Georgia, serif' }}>
              {new Set(notes.map(n => n.biomeId)).size}
            </div>
            <div className="text-xs" style={{ color: '#5a7a5a' }}>Biomes</div>
          </div>
        </div>
      </div>

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {notes.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">📓</div>
            <div className="text-sm font-semibold mb-2" style={{ color: '#e8e4d8' }}>
              No field notes yet
            </div>
            <p className="text-xs" style={{ color: '#5a7a5a' }}>
              Collect specimens on expeditions to start your research journal.
            </p>
            <button
              onClick={() => onNavigate('expedition')}
              className="mt-4 px-5 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-105"
              style={{ background: '#1a3520', border: '1px solid #4a8a4a', color: '#c9a84c' }}
            >
              Start Expedition
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {notes.map(note => (
              <NoteCard key={note.id} note={note} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
