import { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { Plus, Search, X, CalendarHeart, MapPin } from 'lucide-react';
import { t, formatDate } from '../i18n';

const EVENT_TYPES = ['wedding', 'birthday', 'travel', 'party', 'sport', 'meeting', 'dinner', 'other'];

export default function Events({ events, people, places, addEvent, updateEvent, deleteEvent }) {
  const { lang } = useApp();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(getEmptyForm());

  function getEmptyForm() {
    return { title: '', date: '', eventType: '', peopleIds: [], placeId: '', notes: '' };
  }

  const filtered = useMemo(() => {
    let list = [...events];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(e => e.title?.toLowerCase().includes(q));
    }
    if (typeFilter) list = list.filter(e => e.eventType === typeFilter);
    return list.sort((a, b) => ((b.date || '') > (a.date || '') ? 1 : -1));
  }, [events, search, typeFilter]);

  return (
    <div style={{ padding: 'var(--space-page-x)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>{t('events.title', lang)}</div>
          <div style={{ fontSize: 13, color: '#9CA3AF', fontWeight: 600 }}>{events.length} {t('dashboard.totalEvents', lang)}</div>
        </div>
        <button onClick={() => setShowAdd(true)}
          style={{ width: 48, height: 48, borderRadius: 24, background: 'var(--grad-primary)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px rgba(230,0,45,0.3)' }}>
          <Plus size={24} color="white" />
        </button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 8 }}>
        <Search size={18} color="#9CA3AF" style={{ position: 'absolute', left: 14, top: 14 }} />
        <input className="input-pill" style={{ paddingLeft: 40 }} placeholder={t('events.searchEvents', lang)} value={search} onChange={e => setSearch(e.target.value)} />
        {search && <X size={18} color="#9CA3AF" style={{ position: 'absolute', right: 14, top: 14, cursor: 'pointer' }} onClick={() => setSearch('')} />}
      </div>

      {/* Type filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
        <div className={`chip ${!typeFilter ? 'active' : ''}`} style={{ whiteSpace: 'nowrap', flexShrink: 0 }} onClick={() => setTypeFilter(null)}>
          {t('events.allTypes', lang)}
        </div>
        {EVENT_TYPES.map(tp => (
          <div key={tp} className={`chip ${typeFilter === tp ? 'active' : ''}`} style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
            onClick={() => setTypeFilter(typeFilter === tp ? null : tp)}>
            {t(`events.${tp}`, lang)}
          </div>
        ))}
      </div>

      {/* Events list */}
      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <CalendarHeart size={48} color="#D1D5DB" style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 16, fontWeight: 600, color: '#9CA3AF' }}>{t('events.noEvents', lang)}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(e => {
            const eventPeople = (e.peopleIds || []).map(pid => people.find(p => p.id === pid)).filter(Boolean);
            const eventPlace = e.placeId ? places.find(p => p.id === e.placeId) : null;
            return (
              <div key={e.id} className="card" style={{ padding: '14px 16px', cursor: 'pointer' }}
                onClick={() => {
                  if (confirm(lang === 'vi' ? 'Xoá sự kiện này?' : 'Delete this event?')) {
                    deleteEvent(e.id);
                  }
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 16, background: '#F1F1F4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                    {e.eventType === 'wedding' ? '💍' : e.eventType === 'birthday' ? '🎂' : e.eventType === 'travel' ? '✈️' : e.eventType === 'party' ? '🎉' : e.eventType === 'sport' ? '🏆' : e.eventType === 'meeting' ? '🤝' : e.eventType === 'dinner' ? '🍽️' : '📌'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{e.title}</div>
                    <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
                      {e.date && <span>{formatDate(e.date)}</span>}
                      {e.eventType && <span> · {t(`events.${e.eventType}`, lang)}</span>}
                    </div>
                    {eventPeople.length > 0 && (
                      <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                        {eventPeople.slice(0, 3).map(p => (
                          <span key={p.id} style={{ fontSize: 11, background: '#F1F1F4', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
                            {p.name}
                          </span>
                        ))}
                        {eventPeople.length > 3 && <span style={{ fontSize: 11, color: '#9CA3AF' }}>+{eventPeople.length - 3}</span>}
                      </div>
                    )}
                    {eventPlace && (
                      <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <MapPin size={12} /> {eventPlace.name}
                      </div>
                    )}
                  </div>
                </div>
                {e.notes && <div style={{ fontSize: 12, color: '#6B7280', fontStyle: 'italic', marginTop: 8 }}>{e.notes}</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Event Modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>{t('events.addEvent', lang)}</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input className="input-pill" placeholder={t('events.eventTitle', lang)} value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
              <input className="input-pill" type="date" placeholder={t('events.date', lang)} value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />

              {/* Event type */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#9CA3AF', marginBottom: 8 }}>{t('events.eventType', lang)}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {EVENT_TYPES.map(tp => (
                    <div key={tp} className={`chip ${form.eventType === tp ? 'active' : ''}`} onClick={() => setForm(p => ({ ...p, eventType: tp }))}>
                      {t(`events.${tp}`, lang)}
                    </div>
                  ))}
                </div>
              </div>

              {/* People selector */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#9CA3AF', marginBottom: 8 }}>{t('events.people', lang)}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {people.map(p => {
                    const selected = form.peopleIds.includes(p.id);
                    return (
                      <div key={p.id} className={`chip ${selected ? 'active' : ''}`}
                        onClick={() => setForm(prev => ({
                          ...prev,
                          peopleIds: selected ? prev.peopleIds.filter(id => id !== p.id) : [...prev.peopleIds, p.id],
                        }))}>
                        {p.name}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Place selector */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#9CA3AF', marginBottom: 8 }}>{t('events.place', lang)}</div>
                <select className="input-pill" value={form.placeId} onChange={e => setForm(p => ({ ...p, placeId: e.target.value }))}>
                  <option value="">—</option>
                  {places.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <textarea className="input-pill" placeholder={t('events.notes', lang)} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} style={{ minHeight: 60 }} />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => { setShowAdd(false); setForm(getEmptyForm()); }}>{t('common.cancel', lang)}</button>
              <button className="btn-primary" style={{ flex: 2 }} onClick={() => { if (form.title.trim()) { addEvent(form); setForm(getEmptyForm()); setShowAdd(false); } }} disabled={!form.title.trim()}>
                {t('common.save', lang)}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ height: 20 }} />
    </div>
  );
}
