import { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { Plus, Search, X, Users, Tag, SlidersHorizontal } from 'lucide-react';
import { t, formatDate } from '../i18n';
import { getScoreInfo } from '../contexts/AppContext';

export default function People({ people, tags, onSelectPerson, addPerson, updatePerson }) {
  const { lang } = useApp();
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showTagManager, setShowTagManager] = useState(false);
  const [form, setForm] = useState(getEmptyForm());

  function getEmptyForm() {
    return {
      name: '', nickname: '', phone: '', email: '', dob: '',
      gender: 'male', facebook: '', tiktok: '', address: '',
      firstMetDate: '', notes: '', tags: [], relationshipScore: 50,
    };
  }

  const filtered = useMemo(() => {
    let list = [...people];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.nickname?.toLowerCase().includes(q) ||
        p.phone?.includes(q)
      );
    }
    if (activeTag) {
      list = list.filter(p => (p.tags || []).some(t => t.id === activeTag));
    }
    return list.sort((a, b) => (b.relationshipScore || 0) - (a.relationshipScore || 0));
  }, [people, search, activeTag]);

  // Score presets
  const scorePresets = [
    { range: [0, 39], label: 'scoreDistant', emoji: '👤' },
    { range: [40, 59], label: 'scoreAcquainted', emoji: '👋' },
    { range: [60, 79], label: 'scoreFriendly', emoji: '👍' },
    { range: [80, 94], label: 'scoreClose', emoji: '💪' },
    { range: [95, 100], label: 'scoreVeryClose', emoji: '🔥' },
  ];

  function handleSubmit() {
    if (!form.name.trim()) return;
    addPerson({
      ...form,
      tags: form.tags.filter(t => t.id),
      relationshipScore: form.relationshipScore,
    });
    setForm(getEmptyForm());
    setShowAdd(false);
  }

  function toggleFormTag(tag) {
    setForm(prev => {
      const exists = prev.tags.find(t => t.id === tag.id);
      return {
        ...prev,
        tags: exists
          ? prev.tags.filter(t => t.id !== tag.id)
          : [...prev.tags, { id: tag.id, nameVI: tag.nameVI, nameEN: tag.nameEN, color: tag.color }],
      };
    });
  }

  return (
    <div style={{ padding: 'var(--space-page-x)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>{t('people.title', lang)}</div>
          <div style={{ fontSize: 13, color: '#9CA3AF', fontWeight: 600 }}>{people.length} {t('dashboard.totalPeople', lang)}</div>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          style={{ width: 48, height: 48, borderRadius: 24, background: 'var(--grad-primary)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px rgba(230,0,45,0.3)' }}
        >
          <Plus size={24} color="white" />
        </button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <Search size={18} color="#9CA3AF" style={{ position: 'absolute', left: 14, top: 14 }} />
        <input
          className="input-pill"
          style={{ paddingLeft: 40 }}
          placeholder={t('people.searchPeople', lang)}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <X size={18} color="#9CA3AF" style={{ position: 'absolute', right: 14, top: 14, cursor: 'pointer' }} onClick={() => setSearch('')} />
        )}
      </div>

      {/* Tag filter chips */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
        <div
          className={`chip ${!activeTag ? 'active' : ''}`}
          onClick={() => setActiveTag(null)}
          style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
        >
          <Users size={14} />
          {t('people.allTags', lang)}
        </div>
        {tags.map(tag => (
          <div
            key={tag.id}
            className={`chip ${activeTag === tag.id ? 'active' : ''}`}
            onClick={() => setActiveTag(activeTag === tag.id ? null : tag.id)}
            style={{
              whiteSpace: 'nowrap', flexShrink: 0,
              ...(activeTag === tag.id ? {} : { borderLeft: `3px solid ${tag.color}` }),
            }}
          >
            {tag.nameVI || tag.nameEN}
          </div>
        ))}
        <div
          className="chip"
          onClick={() => setShowTagManager(true)}
          style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
        >
          <SlidersHorizontal size={14} />
          {t('people.manageTags', lang)}
        </div>
      </div>

      {/* People list */}
      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <Users size={48} color="#D1D5DB" style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 16, fontWeight: 600, color: '#9CA3AF' }}>{t('people.noPeople', lang)}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(p => {
            const s = getScoreInfo(p.relationshipScore || 0);
            const pTags = (p.tags || []).slice(0, 3);
            return (
              <div
                key={p.id}
                className="card"
                onClick={() => onSelectPerson(p.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', cursor: 'pointer' }}
              >
                {/* Avatar */}
                <div style={{
                  width: 48, height: 48, borderRadius: 16,
                  background: 'var(--grad-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, fontWeight: 800, color: 'white', flexShrink: 0,
                }}>
                  {(p.name || '?')[0].toUpperCase()}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 15, fontWeight: 700 }}>{p.name}</span>
                    {p.nickname && <span style={{ fontSize: 12, color: '#9CA3AF' }}>({p.nickname})</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                    {pTags.map(t => (
                      <span key={t.id} className="chip-tag" style={{ background: t.color || '#9CA3AF', fontSize: 10 }}>
                        {t.nameVI || t.nameEN}
                      </span>
                    ))}
                    {(p.tags || []).length > 3 && (
                      <span style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600 }}>+{p.tags.length - 3}</span>
                    )}
                  </div>
                </div>

                {/* Score */}
                <div style={{ textAlign: 'center', flexShrink: 0 }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#E6002D' }}>{p.relationshipScore || 0}</div>
                  <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600 }}>{s.emoji}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Person Modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>{t('people.addPerson', lang)}</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input className="input-pill" placeholder={t('people.name', lang)} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <input className="input-pill" placeholder={t('people.nickname', lang)} value={form.nickname} onChange={e => setForm(p => ({ ...p, nickname: e.target.value }))} />
                <select className="input-pill" value={form.gender} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))}>
                  <option value="male">{t('people.male', lang)}</option>
                  <option value="female">{t('people.female', lang)}</option>
                  <option value="other">{t('people.other', lang)}</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <input className="input-pill" type="date" placeholder={t('common.dateFormat', lang)} value={form.dob} onChange={e => setForm(p => ({ ...p, dob: e.target.value }))} />
                <input className="input-pill" placeholder={t('people.phone', lang)} value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <input className="input-pill" placeholder="Facebook" value={form.facebook} onChange={e => setForm(p => ({ ...p, facebook: e.target.value }))} />
                <input className="input-pill" placeholder="TikTok" value={form.tiktok} onChange={e => setForm(p => ({ ...p, tiktok: e.target.value }))} />
              </div>

              <input className="input-pill" placeholder={t('people.email', lang)} value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
              <input className="input-pill" placeholder={t('people.address', lang)} value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
              <input className="input-pill" type="date" placeholder={t('people.firstMet', lang)} value={form.firstMetDate} onChange={e => setForm(p => ({ ...p, firstMetDate: e.target.value }))} />

              {/* Tags selector */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#9CA3AF', marginBottom: 8 }}>{t('people.tags', lang)}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {tags.map(tag => {
                    const selected = form.tags.some(t => t.id === tag.id);
                    return (
                      <div
                        key={tag.id}
                        className={`chip ${selected ? 'active' : ''}`}
                        onClick={() => toggleFormTag(tag)}
                        style={selected ? {} : { borderLeft: `3px solid ${tag.color}` }}
                      >
                        {tag.nameVI || tag.nameEN}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Relationship Score slider */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#9CA3AF' }}>{t('people.relationshipScore', lang)}</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#E6002D' }}>{form.relationshipScore}</div>
                </div>
                <input
                  type="range" min="0" max="100"
                  value={form.relationshipScore}
                  onChange={e => setForm(p => ({ ...p, relationshipScore: parseInt(e.target.value) }))}
                  style={{ width: '100%', accentColor: '#E6002D' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  {scorePresets.map((preset, i) => (
                    <button
                      key={i}
                      onClick={() => setForm(p => ({ ...p, relationshipScore: preset.range[0] }))}
                      style={{
                        background: 'none', border: 'none', fontSize: 10, color: '#9CA3AF',
                        cursor: 'pointer', fontWeight: form.relationshipScore >= preset.range[0] && form.relationshipScore <= preset.range[1] ? 700 : 400,
                        color: form.relationshipScore >= preset.range[0] && form.relationshipScore <= preset.range[1] ? '#E6002D' : '#9CA3AF',
                      }}
                    >
                      {preset.emoji} {t(`people.${preset.label}`, lang)}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                className="input-pill"
                placeholder={t('people.notes', lang)}
                value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                style={{ minHeight: 60, resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => { setShowAdd(false); setForm(getEmptyForm()); }}>
                {t('common.cancel', lang)}
              </button>
              <button className="btn-primary" style={{ flex: 2 }} onClick={handleSubmit} disabled={!form.name.trim()}>
                {t('people.save', lang)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tag Manager Modal */}
      {showTagManager && <TagManager tags={tags} lang={lang} onClose={() => setShowTagManager(false)} />}

      <div style={{ height: 20 }} />
    </div>
  );
}

// ─── Tag Manager Component ───
function TagManager({ tags, lang, onClose }) {
  const { addTag, updateTag, deleteTag } = useApp();
  const [newTag, setNewTag] = useState({ nameVI: '', nameEN: '', color: '#6366F1' });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  function handleAdd() {
    if (!newTag.nameVI.trim()) return;
    addTag({ ...newTag, icon: 'tag' });
    setNewTag({ nameVI: '', nameEN: '', color: '#6366F1' });
  }

  function startEdit(tag) {
    setEditingId(tag.id);
    setEditForm({ nameVI: tag.nameVI, nameEN: tag.nameEN, color: tag.color });
  }

  function saveEdit(id) {
    updateTag(id, editForm);
    setEditingId(null);
  }

  const colors = ['#E6002D', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#6366F1', '#6B7280'];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>{t('people.manageTags', lang)}</div>

        {/* Existing tags */}
        <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tags.map(tag => (
            <div key={tag.id} className="card" style={{ padding: '12px 14px' }}>
              {editingId === tag.id ? (
                <div>
                  <input className="input-pill" style={{ marginBottom: 8 }} value={editForm.nameVI} onChange={e => setEditForm(p => ({ ...p, nameVI: e.target.value }))} placeholder={t('people.tagNameVi', lang)} />
                  <input className="input-pill" style={{ marginBottom: 8 }} value={editForm.nameEN} onChange={e => setEditForm(p => ({ ...p, nameEN: e.target.value }))} placeholder={t('people.tagNameEn', lang)} />
                  <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                    {colors.map(c => (
                      <div key={c} onClick={() => setEditForm(p => ({ ...p, color: c }))}
                        style={{ width: 24, height: 24, borderRadius: 12, background: c, cursor: 'pointer', border: editForm.color === c ? '2px solid #101010' : '2px solid transparent' }} />
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-secondary" style={{ flex: 1, padding: 8 }} onClick={() => setEditingId(null)}>{t('common.cancel', lang)}</button>
                    <button className="btn-primary" style={{ flex: 1, padding: 8 }} onClick={() => saveEdit(tag.id)}>{t('common.save', lang)}</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 6, background: tag.color, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{tag.nameVI}</span>
                    <span style={{ color: '#9CA3AF', fontSize: 12, marginLeft: 6 }}>{tag.nameEN}</span>
                  </div>
                  <button className="btn-secondary" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => startEdit(tag)}>{t('common.edit', lang)}</button>
                  <button className="btn-secondary" style={{ padding: '6px 10px', fontSize: 12, color: '#E6002D' }} onClick={() => deleteTag(tag.id)}>
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add new tag */}
        <div className="card" style={{ padding: '12px 14px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{t('people.addTag', lang)}</div>
          <input className="input-pill" style={{ marginBottom: 8 }} value={newTag.nameVI} onChange={e => setNewTag(p => ({ ...p, nameVI: e.target.value }))} placeholder={t('people.tagNameVi', lang)} />
          <input className="input-pill" style={{ marginBottom: 8 }} value={newTag.nameEN} onChange={e => setNewTag(p => ({ ...p, nameEN: e.target.value }))} placeholder={t('people.tagNameEn', lang)} />
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            {colors.map(c => (
              <div key={c} onClick={() => setNewTag(p => ({ ...p, color: c }))}
                style={{ width: 24, height: 24, borderRadius: 12, background: c, cursor: 'pointer', border: newTag.color === c ? '2px solid #101010' : '2px solid transparent' }} />
            ))}
          </div>
          <button className="btn-primary" style={{ padding: 12 }} onClick={handleAdd} disabled={!newTag.nameVI.trim()}>
            + {t('people.addTag', lang)}
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
          <button className="btn-secondary" onClick={onClose}>{t('common.close', lang)}</button>
        </div>
      </div>
    </div>
  );
}
