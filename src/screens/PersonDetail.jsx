import { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { ArrowLeft, Trash2, Phone, MapPin, MessageCircle, Heart, CalendarDays, BookHeart, Edit3, Plus } from 'lucide-react';
import { t, formatDate, daysBetween } from '../i18n';
import { getScoreInfo } from '../contexts/AppContext';

export default function PersonDetail({ person, events, memories, onBack, onDelete, onAddInteraction }) {
  const { lang, people, places, updatePerson } = useApp();
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ ...person });
  const [showInteraction, setShowInteraction] = useState(false);
  const [interactionText, setInteractionText] = useState('');
  const [interactionType, setInteractionType] = useState('meet');

  const s = getScoreInfo(person.relationshipScore || 0);
  const today = new Date().toISOString().split('T')[0];
  const lastContact = person.lastInteractionDate ? daysBetween(person.lastInteractionDate, today) : null;

  const interactionTypes = [
    { id: 'meet', label: 'Gặp mặt' },
    { id: 'call', label: 'Gọi điện' },
    { id: 'message', label: 'Nhắn tin' },
  ];

  const handleAddInteraction = () => {
    onAddInteraction({ type: interactionType, notes: interactionText });
    setInteractionText('');
    setShowInteraction(false);
  };

  const handleSaveEdit = () => {
    updatePerson(person.id, editForm);
    setShowEdit(false);
  };

  const fields = [
    { icon: Phone, label: person.phone || '—' },
    { icon: MessageCircle, label: person.facebook ? `FB: ${person.facebook}` : null },
    { icon: MessageCircle, label: person.tiktok ? `TT: ${person.tiktok}` : null },
    { icon: MapPin, label: person.address || '—' },
    { icon: CalendarDays, label: person.dob ? `${formatDate(person.dob)}${person.firstMetDate ? ` | Quen: ${formatDate(person.firstMetDate)}` : ''}` : person.firstMetDate ? `Quen: ${formatDate(person.firstMetDate)}` : '—' },
  ].filter(f => f.label);

  return (
    <div style={{ padding: 'var(--space-page-x)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, paddingTop: 8 }}>
        <div onClick={onBack} style={{ width: 40, height: 40, borderRadius: 20, background: '#F1F1F4', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <ArrowLeft size={20} />
        </div>
        <div style={{ flex: 1 }} />
        <div onClick={() => setShowEdit(true)} style={{ width: 40, height: 40, borderRadius: 20, background: '#F1F1F4', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <Edit3 size={18} color="#6B7280" />
        </div>
        <div onClick={onDelete} style={{ width: 40, height: 40, borderRadius: 20, background: 'rgba(230,0,45,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <Trash2 size={18} color="#E6002D" />
        </div>
      </div>

      {/* Avatar + Name */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{
          width: 80, height: 80, borderRadius: 24,
          background: 'var(--grad-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 32, fontWeight: 800, color: 'white', margin: '0 auto 12px',
        }}>
          {(person.name || '?')[0].toUpperCase()}
        </div>
        <div style={{ fontSize: 24, fontWeight: 800 }}>{person.name}</div>
        {person.nickname && <div style={{ fontSize: 14, color: '#9CA3AF' }}>"{person.nickname}"</div>}
      </div>

      {/* Tags */}
      {(person.tags || []).length > 0 && (
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
          {(person.tags || []).map(t => (
            <span key={t.id} className="chip-tag" style={{ background: t.color || '#9CA3AF' }}>
              {t.nameVI || t.nameEN}
            </span>
          ))}
        </div>
      )}

      {/* Relationship Score */}
      <div className="card" style={{ marginBottom: 16, textAlign: 'center', padding: 20 }}>
        <div style={{ fontSize: 48, fontWeight: 900, color: '#E6002D', lineHeight: 1 }}>
          {person.relationshipScore || 0}
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#9CA3AF', marginTop: 4 }}>
          {s.emoji} {t('people.' + s.key, lang) || s.key}
        </div>
        <div className="score-bar" style={{ marginTop: 12, maxWidth: 200, margin: '12px auto 0' }}>
          <div className="score-bar-fill" style={{ width: `${person.relationshipScore || 0}%`, background: 'var(--grad-primary)' }} />
        </div>
      </div>

      {/* Last contact */}
      {lastContact !== null && (
        <div className="card" style={{ marginBottom: 16, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Heart size={20} color={lastContact > 30 ? '#F59E0B' : '#10B981'} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{t('people.lastInteraction', lang)}</div>
            <div style={{ fontSize: 12, color: '#9CA3AF' }}>
              {lastContact === 0 ? t('score.today', lang) :
               lastContact === 1 ? t('score.yesterday', lang) :
               t('score.daysAgo', lang, { days: lastContact })}
            </div>
          </div>
          <button className="btn-secondary" style={{ padding: '8px 14px', fontSize: 12 }} onClick={() => setShowInteraction(true)}>
            <Plus size={14} /> {t('people.addInteraction', lang)}
          </button>
        </div>
      )}

      {/* Contact Info */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>📋 {t('people.name', lang)}</div>
        {fields.map((f, i) => (
          <div key={i} className="action-field" style={{ padding: '8px 0' }}>
            <div className="af-label"><f.icon size={16} color="#9CA3AF" />{f.label}</div>
          </div>
        ))}
        {person.notes && (
          <div style={{ padding: '8px 0', fontSize: 13, color: '#6B7280', fontStyle: 'italic' }}>
            "{person.notes}"
          </div>
        )}
      </div>

      {/* Shared Events */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>🎪 {t('people.commonEvents', lang)} ({events.length})</div>
        {events.length === 0 ? (
          <div style={{ fontSize: 13, color: '#9CA3AF', padding: '8px 0' }}>{t('events.noEvents', lang)}</div>
        ) : (
          events.slice(0, 5).map(e => (
            <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #F3F4F6' }}>
              <div style={{ width: 36, height: 36, borderRadius: 12, background: '#F1F1F4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🎪</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{e.title}</div>
                <div style={{ fontSize: 11, color: '#9CA3AF' }}>{e.date ? formatDate(e.date) : ''}</div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Shared Memories */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>💭 {t('people.commonMemories', lang)} ({memories.length})</div>
        {memories.length === 0 ? (
          <div style={{ fontSize: 13, color: '#9CA3AF', padding: '8px 0' }}>{t('memories.noMemories', lang)}</div>
        ) : (
          memories.slice(0, 5).map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #F3F4F6' }}>
              <div style={{ width: 36, height: 36, borderRadius: 12, background: '#F1F1F4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>💭</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{m.title}</div>
                <div style={{ fontSize: 11, color: '#9CA3AF' }}>{m.mood} · {m.date ? formatDate(m.date) : ''}</div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Interaction Modal */}
      {showInteraction && (
        <div className="modal-overlay" onClick={() => setShowInteraction(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>{t('people.addInteraction', lang)}</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {interactionTypes.map(t => (
                <button
                  key={t.id}
                  className={`chip ${interactionType === t.id ? 'active' : ''}`}
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => setInteractionType(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <input className="input-pill" placeholder={t('people.notes', lang)} value={interactionText} onChange={e => setInteractionText(e.target.value)} />
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowInteraction(false)}>{t('common.cancel', lang)}</button>
              <button className="btn-primary" style={{ flex: 2 }} onClick={handleAddInteraction}>{t('common.save', lang)}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEdit && (
        <div className="modal-overlay" onClick={() => setShowEdit(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>{t('people.editPerson', lang)}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input className="input-pill" value={editForm.name || ''} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} placeholder={t('people.name', lang)} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <input className="input-pill" value={editForm.nickname || ''} onChange={e => setEditForm(p => ({ ...p, nickname: e.target.value }))} placeholder={t('people.nickname', lang)} />
                <input className="input-pill" value={editForm.phone || ''} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} placeholder={t('people.phone', lang)} />
              </div>
              <input className="input-pill" type="date" value={editForm.dob || ''} onChange={e => setEditForm(p => ({ ...p, dob: e.target.value }))} placeholder={t('people.dob', lang)} />
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#9CA3AF' }}>{t('people.relationshipScore', lang)}: {editForm.relationshipScore}</span>
                <input type="range" min="0" max="100" value={editForm.relationshipScore} onChange={e => setEditForm(p => ({ ...p, relationshipScore: parseInt(e.target.value) }))} style={{ flex: 1, accentColor: '#E6002D' }} />
              </div>
              <textarea className="input-pill" value={editForm.notes || ''} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} placeholder={t('people.notes', lang)} style={{ minHeight: 60 }} />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowEdit(false)}>{t('common.cancel', lang)}</button>
              <button className="btn-primary" style={{ flex: 2 }} onClick={handleSaveEdit}>{t('common.save', lang)}</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ height: 20 }} />
    </div>
  );
}
