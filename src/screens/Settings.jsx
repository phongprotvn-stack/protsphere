import { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { Heart, Globe, Download, Upload, Trash2, Info, ChevronRight, Database, RefreshCw, Plus, Link, X, Cloud, CloudOff } from 'lucide-react';
import { t } from '../i18n';
import { useMultiSourceSync } from '../hooks/useMultiSourceSync';

export default function Settings() {
  const { people, setPeople, settings, lang, toggleLang, exportData, importData, clearAllData, user, isLoggedIn, isSyncing, signInWithGoogle, signInWithEmail, signUpWithEmail, signOut, showToast, tags } = useApp();
  const [authMode, setAuthMode] = useState('google');
  const [authEmail, setAuthEmail] = useState('');
  const [authPass, setAuthPass] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [showAddSource, setShowAddSource] = useState(false);
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');

  const { sources, syncingId, lastSyncMap, errorMap, addSource, removeSource, updateSource, syncFromSource, pushToSource } = useMultiSourceSync({ people, setPeople, showToast, allTags: tags });

  const handleAddSource = () => {
    const name = newSourceName.trim() || `Google Sheet ${sources.length + 1}`;
    const url = newSourceUrl.trim();
    if (!url) return;
    addSource(name, url);
    setNewSourceName('');
    setNewSourceUrl('');
    setShowAddSource(false);
  };

  const handleEmailAuth = async () => {
    try {
      if (isSignUp) await signUpWithEmail(authEmail, authPass);
      else await signInWithEmail(authEmail, authPass);
      setAuthEmail('');
      setAuthPass('');
    } catch {}
  };

  const menuSections = [
    {
      title: t('settings.dataManagement', lang),
      items: [
        { icon: Download, color: '#10B981', label: t('settings.exportData', lang), desc: 'JSON', onClick: exportData },
        { icon: Upload, color: '#3B82F6', label: t('settings.importData', lang), desc: 'JSON', onClick: importData },
        { icon: Trash2, color: '#E6002D', label: t('settings.clearAllData', lang), desc: '', onClick: clearAllData },
      ],
    },
    {
      title: t('settings.appInfo', lang),
      items: [
        { icon: Info, color: '#8B5CF6', label: t('settings.about', lang), desc: 'v2.0.0' },
      ],
    },
  ];

  return (
    <div style={{ padding: 'var(--space-page-x)' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>{t('settings.title', lang)}</div>
      </div>

      {/* Profile card */}
      <div className="card" style={{ textAlign: 'center', padding: 24, marginBottom: 20 }}>
        <div style={{
          width: 72, height: 72, borderRadius: 24,
          background: 'var(--grad-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, fontWeight: 800, color: 'white', margin: '0 auto 12px',
        }}>
          {isLoggedIn ? (user?.displayName || user?.email || 'P')[0].toUpperCase() : 'P'}
        </div>
        <div style={{ fontSize: 20, fontWeight: 800 }}>{isLoggedIn ? (user?.displayName || user?.email) : 'PROT'}</div>
        <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>{t('app.tagline', lang)}</div>
      </div>

      {/* Auth Section */}
      <div style={{ marginBottom: 20 }}>
        <div className="title" style={{ marginBottom: 12 }}>{isLoggedIn ? '☁️' : '🔐'} {t('settings.login', lang)}</div>
        {isLoggedIn ? (
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 16, background: 'var(--grad-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: 'white', flexShrink: 0 }}>
                {(user?.displayName || user?.email || 'U')[0].toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{user?.displayName || user?.email}</div>
                <div style={{ fontSize: 12, color: '#9CA3AF' }}>
                  {isSyncing ? `🔄 ${t('settings.syncing', lang)}` : `☁️ ${t('settings.syncStatus', lang)}`}
                </div>
              </div>
              <button className="btn-secondary" style={{ padding: '8px 14px', fontSize: 12, color: '#E6002D' }}
                onClick={signOut}>
                {t('settings.signOut', lang)}
              </button>
            </div>
          </div>
        ) : (
          <div className="card">
            <div style={{ marginBottom: 12 }}>
              {authMode === 'email' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input className="input-pill" type="email" placeholder={t('settings.email', lang)}
                    value={authEmail} onChange={e => setAuthEmail(e.target.value)} />
                  <input className="input-pill" type="password" placeholder={t('settings.password', lang)}
                    value={authPass} onChange={e => setAuthPass(e.target.value)} />
                  <button className="btn-primary" onClick={handleEmailAuth} disabled={!authEmail || !authPass}>
                    {isSignUp ? t('settings.signUp', lang) : t('settings.login', lang)}
                  </button>
                  <div style={{ textAlign: 'center', fontSize: 12, color: '#9CA3AF', cursor: 'pointer' }}
                    onClick={() => setIsSignUp(!isSignUp)}>
                    {isSignUp ? `${t('settings.login', lang)} →` : `${t('settings.noAccount', lang)} ${t('settings.signUp', lang)} →`}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0' }}>
                    <div style={{ flex: 1, height: 1, background: '#F3F4F6' }} />
                    <span style={{ fontSize: 11, color: '#9CA3AF' }}>OR</span>
                    <div style={{ flex: 1, height: 1, background: '#F3F4F6' }} />
                  </div>
                </div>
              ) : null}
              <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}
                onClick={signInWithGoogle}>
                Google {t('settings.login', lang)}
              </button>
              <div style={{ textAlign: 'center', marginTop: 8 }}>
                <span style={{ fontSize: 12, color: '#9CA3AF', cursor: 'pointer' }}
                  onClick={() => setAuthMode(authMode === 'email' ? 'google' : 'email')}>
                  {authMode === 'email' ? t('settings.signInGoogle', lang) : t('settings.signInEmail', lang)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Language */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Globe size={18} color="#9CA3AF" /> {t('settings.language', lang)}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div
            className={`chip ${lang === 'vi' ? 'active' : ''}`}
            style={{ flex: 1, justifyContent: 'center', padding: '12px 0' }}
            onClick={() => { if (lang !== 'vi') toggleLang(); }}
          >
            🇻🇳 {t('settings.vietnamese', lang)}
          </div>
          <div
            className={`chip ${lang === 'en' ? 'active' : ''}`}
            style={{ flex: 1, justifyContent: 'center', padding: '12px 0' }}
            onClick={() => { if (lang !== 'en') toggleLang(); }}
          >
            🇺🇸 {t('settings.english', lang)}
          </div>
        </div>
      </div>

      {/* Cloud Sync Status */}
      <div className="card" style={{ marginBottom: 20, padding: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
        {isLoggedIn ? (
          <><Cloud size={18} color="#10B981" /> <span style={{ fontSize: 13, color: '#6B7280' }}>{t('settings.syncStatus', lang)}</span></>
        ) : (
          <><CloudOff size={18} color="#9CA3AF" /> <span style={{ fontSize: 13, color: '#9CA3AF' }}>{t('settings.notSynced', lang)}</span></>
        )}
        {isSyncing && <RefreshCw size={14} color="#3B82F6" style={{ animation: 'spin 1s linear infinite' }} />}
      </div>

      {/* Multi-Source Data Sync */}
      <div style={{ marginBottom: 20 }}>
        <div className="title" style={{ marginBottom: 12 }}>
          <Database size={18} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} color="#9CA3AF" />
          {t('settings.sheetSync', lang)}
        </div>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 14 }}>{t('settings.multiSourceDesc', lang)}</div>

          {/* Source list */}
          {sources.length === 0 && !showAddSource && (
            <div style={{ fontSize: 12, color: '#9CA3AF', fontStyle: 'italic', marginBottom: 14 }}>
              {t('settings.noSources', lang)}
            </div>
          )}

          {sources.map(src => (
            <div key={src.id} style={{
              marginBottom: 12, padding: 12, borderRadius: 12,
              background: '#F9FAFB', border: '1px solid #F3F4F6',
            }}>
              {/* Source header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Link size={14} color="#9CA3AF" />
                <input style={{
                  flex: 1, fontSize: 13, fontWeight: 600, border: 'none',
                  background: 'transparent', outline: 'none', color: '#374151',
                }}
                  value={src.name}
                  onChange={e => updateSource(src.id, { name: e.target.value })}
                />
                <span style={{ fontSize: 10, color: lastSyncMap[src.id] ? '#10B981' : '#9CA3AF' }}>
                  {lastSyncMap[src.id] ? `✓ ${new Date(lastSyncMap[src.id]).toLocaleTimeString()}` : ''}
                </span>
                <button style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2 }}
                  onClick={() => {
                    if (confirm(t('settings.sourceDeleteConfirm', lang))) removeSource(src.id);
                  }}>
                  <X size={14} color="#9CA3AF" />
                </button>
              </div>

              {/* URL */}
              <input className="input-pill" type="url" placeholder="https://script.google.com/macros/s/.../exec"
                value={src.configUrl} onChange={e => updateSource(src.id, { configUrl: e.target.value })}
                style={{ fontSize: 11, padding: '6px 10px', marginBottom: 8, width: '100%' }} />

              {/* Error */}
              {errorMap[src.id] && (
                <div style={{ fontSize: 11, color: '#E6002D', marginBottom: 6 }}>❌ {errorMap[src.id]}</div>
              )}

              {/* Buttons */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-primary" style={{ flex: 1, justifyContent: 'center', fontSize: 12, padding: '8px 0' }}
                  onClick={() => syncFromSource(src.id)}
                  disabled={syncingId === src.id || !src.configUrl}>
                  {syncingId === src.id ? <><RefreshCw size={12} style={{ animation: 'spin 1s linear infinite', marginRight: 4 }} /> {t('settings.sheetSyncing', lang)}</> : t('settings.sheetFrom', lang)}
                </button>
                <button className="btn-secondary" style={{ flex: 1, justifyContent: 'center', fontSize: 12, padding: '8px 0' }}
                  onClick={() => pushToSource(src.id)}
                  disabled={syncingId === src.id || !src.configUrl}>
                  {t('settings.sheetTo', lang)}
                </button>
              </div>
            </div>
          ))}

          {/* Add source button / form */}
          {showAddSource ? (
            <div style={{
              padding: 12, borderRadius: 12,
              background: '#F9FAFB', border: '1px dashed #D1D5DB',
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 8 }}>{t('settings.addSource', lang)}</div>
              <input className="input-pill" type="text" placeholder={t('settings.sourceNamePlaceholder', lang)}
                value={newSourceName} onChange={e => setNewSourceName(e.target.value)}
                style={{ marginBottom: 8 }} />
              <input className="input-pill" type="url" placeholder={t('settings.addSourceUrl', lang)}
                value={newSourceUrl} onChange={e => setNewSourceUrl(e.target.value)}
                style={{ marginBottom: 8 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-primary" style={{ flex: 1, justifyContent: 'center', fontSize: 12, padding: '8px 0' }}
                  onClick={handleAddSource} disabled={!newSourceUrl.trim()}>
                  {t('settings.addSource', lang)}
                </button>
                <button className="btn-secondary" style={{ flex: 1, justifyContent: 'center', fontSize: 12, padding: '8px 0' }}
                  onClick={() => { setShowAddSource(false); setNewSourceName(''); setNewSourceUrl(''); }}>
                  {t('common.cancel', lang)}
                </button>
              </div>
            </div>
          ) : (
            <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center', fontSize: 12, padding: '10px 0' }}
              onClick={() => setShowAddSource(true)}>
              <Plus size={14} style={{ marginRight: 6 }} /> {t('settings.addSource', lang)}
            </button>
          )}
        </div>
      </div>

      {/* Data Management */}
      <div style={{ marginBottom: 20 }}>
        <div className="title" style={{ marginBottom: 12 }}>{t('settings.dataManagement', lang)}</div>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {menuSections[0].items.map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="action-field" style={{ padding: '16px var(--space-card-inner)', borderBottom: i < menuSections[0].items.length - 1 ? '1px solid #F3F4F6' : 'none' }}
                onClick={item.onClick ? item.onClick : undefined}>
                <div className="af-label">
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: `${item.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={16} color={item.color} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{item.label}</div>
                    {item.desc && <div style={{ fontSize: 11, color: '#9CA3AF' }}>{item.desc}</div>}
                  </div>
                </div>
                <ChevronRight size={18} color="#D1D5DB" />
              </div>
            );
          })}
        </div>
      </div>

      {/* App Info */}
      <div style={{ marginBottom: 20 }}>
        <div className="title" style={{ marginBottom: 12 }}>{t('settings.appInfo', lang)}</div>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="action-field" style={{ padding: '16px var(--space-card-inner)' }}>
            <div className="af-label">
              <div style={{ width: 32, height: 32, borderRadius: 10, background: '#8B5CF615', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Info size={16} color="#8B5CF6" />
              </div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{t('settings.about', lang)}</div>
            </div>
            <div className="af-value" style={{ fontSize: 12 }}>v2.0.0</div>
          </div>
        </div>
      </div>

      {/* Version footer */}
      <div style={{ textAlign: 'center', padding: '20px 0', color: '#D1D5DB', fontSize: 12, fontWeight: 600 }}>
        🧬 PROT SPHERE v2.0.0
      </div>

      <div style={{ height: 20 }} />
    </div>
  );
}