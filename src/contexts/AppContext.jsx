import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  onAuthChange, signInWithGoogle as fbSignInGoogle,
  signInWithEmail as fbSignInEmail, signUpWithEmail as fbSignUpEmail,
  signOutUser as fbSignOut,
  loadTagsFromFirestore, subscribeToFirestore,
} from '../firebase/firebase';
import { initApiClient, apiPeople, apiEvents, apiMemories, apiPlaces, apiDataHub } from '../api/client';
import { apiAuth } from '../api/client';

const AppContext = createContext();

const KEYS = {
  people: 'protsphere_people', events: 'protsphere_events',
  memories: 'protsphere_memories', places: 'protsphere_places',
  tags: 'protsphere_tags', settings: 'protsphere_settings',
  scoreHistory: 'protsphere_score_history',
};

const DEFAULT_TAGS = [
  { id: 'nuclear_family', nameVI: 'Gia đình ruột', nameEN: 'Nuclear Family', icon: 'home', color: '#E6002D' },
  { id: 'extended_family', nameVI: 'Họ hàng', nameEN: 'Extended Family', icon: 'users', color: '#F59E0B' },
  { id: 'high_school', nameVI: 'Bạn cấp 3', nameEN: 'High School', icon: 'graduation-cap', color: '#10B981' },
  { id: 'college', nameVI: 'Bạn đại học', nameEN: 'College', icon: 'book-open', color: '#3B82F6' },
  { id: 'sport', nameVI: 'Bạn thể thao', nameEN: 'Sport Buddies', icon: 'trophy', color: '#8B5CF6' },
  { id: 'former_colleague', nameVI: 'Đồng nghiệp cũ', nameEN: 'Former Colleague', icon: 'briefcase', color: '#EC4899' },
  { id: 'current_colleague', nameVI: 'Đồng nghiệp mới', nameEN: 'Current Colleague', icon: 'building', color: '#6366F1' },
  { id: 'pickleball', nameVI: 'Pickleball', nameEN: 'Pickleball', icon: 'target', color: '#E6002D' },
  { id: 'other', nameVI: 'Khác', nameEN: 'Other', icon: 'more-horizontal', color: '#9CA3AF' },
];

const DEFAULT_SETTINGS = { lang: 'vi', loggedIn: false, displayName: 'PROT', email: '', userId: '' };

const SCORE_LEVELS = [
  { min: 0, max: 39, key: 'scoreDistant', emoji: '👤' },
  { min: 40, max: 59, key: 'scoreAcquainted', emoji: '👋' },
  { min: 60, max: 79, key: 'scoreFriendly', emoji: '👍' },
  { min: 80, max: 94, key: 'scoreClose', emoji: '💪' },
  { min: 95, max: 100, key: 'scoreVeryClose', emoji: '🔥' },
];

export function getScoreInfo(score) {
  return SCORE_LEVELS.find(l => score >= l.min && score <= l.max) || SCORE_LEVELS[4];
}

function loadJSON(key, def) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : def; }
  catch { return def; }
}
function persist(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
}

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

function daysBetween(d1, d2) {
  if (!d1 || !d2) return 0;
  return Math.round((new Date(d2) - new Date(d1)) / (1000 * 60 * 60 * 24));
}

function calcLifeScore(people, events, memories, places) {
  const relScore = people.length > 0
    ? Math.round(people.reduce((s, p) => s + (p.relationshipScore || 0), 0) / people.length) : 0;
  const socialRaw = Math.min(people.length * 4 + events.length * 1.5, 100);
  const visitedPlaces = places.filter(p => p.type === 'visited' || p.type === 'lived').length;
  const travelRaw = Math.min(visitedPlaces * 12 + places.filter(p => p.type === 'wantToVisit').length * 5, 100);
  const health = 70;
  const learningRaw = Math.min(memories.length * 3, 100);
  const positiveMoods = memories.filter(m => ['happy','excited','peaceful','grateful','inspired','loved'].includes(m.mood)).length;
  const emotionRaw = memories.length > 0 ? Math.round((positiveMoods / memories.length) * 100) : 50;
  const scores = {
    relationships: relScore, social: Math.round(socialRaw), travel: Math.round(travelRaw),
    health, learning: Math.round(learningRaw), emotion: Math.round(emotionRaw),
  };
  const lifeScore = Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / 6);
  return { lifeScore, ...scores };
}

function generateSuggestions(people, events, memories, lang, places) {
  const suggestions = [];
  const today = new Date().toISOString().split('T')[0];
  for (const p of people) {
    const tags = p.tags || [];
    const isFamily = tags.some(t => t.id === 'nuclear_family' || t.id === 'extended_family');
    if (!isFamily) continue;
    const lastContact = p.lastInteractionDate || p.createdAt?.split('T')[0] || today;
    const days = daysBetween(lastContact, today);
    if (days > 30 && days < 1000) {
      suggestions.push({
        id: genId(), type: 'relationship_care', priority: days > 60 ? 'high' : 'medium',
        icon: '🤗', personId: p.id,
        titleVI: `Đã ${days} ngày chưa liên lạc với ${p.name}`,
        titleEN: `Haven't contacted ${p.name} in ${days} days`,
        actionVI: 'Gọi điện / Nhắn tin ngay', actionEN: 'Call / Message now',
      });
    }
  }
  const todayDate = new Date();
  const upcoming = [];
  for (const p of people) {
    if (!p.dob) continue;
    const [, mb, db] = p.dob.split('-');
    const m = parseInt(mb), d = parseInt(db);
    const bdThisYear = new Date(todayDate.getFullYear(), m - 1, d);
    const diff = Math.round((bdThisYear - todayDate) / (1000 * 60 * 60 * 24));
    if (diff >= 0 && diff <= 30) upcoming.push({ name: p.name, diff, personId: p.id });
  }
  if (upcoming.length > 0) {
    suggestions.push({
      id: genId(), type: 'birthday_reminder', priority: 'high', icon: '🎂',
      titleVI: `Sắp có ${upcoming.length} sinh nhật: ${upcoming.map(u => u.name).join(', ')}`,
      titleEN: `Upcoming ${upcoming.length} birthdays: ${upcoming.map(u => u.name).join(', ')}`,
      actionVI: 'Chuẩn bị quà 🎁', actionEN: 'Prepare gifts 🎁',
    });
  }
  const lowScore = people.filter(p => (p.relationshipScore || 0) < 40 && (p.relationshipScore || 0) > 0);
  if (lowScore.length > 0) {
    suggestions.push({
      id: genId(), type: 'relationship_boost', priority: 'medium', icon: '💪',
      titleVI: `${lowScore.length} mối quan hệ cần vun đắp thêm`,
      titleEN: `${lowScore.length} relationships need more attention`,
      actionVI: 'Xem danh sách', actionEN: 'View list',
    });
  }
  const wantToVisit = places.filter(p => p.type === 'wantToVisit');
  if (wantToVisit.length > 0) {
    suggestions.push({
      id: genId(), type: 'travel_goal', priority: 'low', icon: '✈️',
      titleVI: `Bạn còn ${wantToVisit.length} nơi muốn đến: ${wantToVisit.slice(0, 3).map(p => p.name).join(', ')}`,
      titleEN: `You still want to visit ${wantToVisit.length} places: ${wantToVisit.slice(0, 3).map(p => p.name).join(', ')}`,
      actionVI: 'Lên kế hoạch', actionEN: 'Plan now',
    });
  }
  if (memories.length === 0) {
    suggestions.push({
      id: genId(), type: 'first_memory', priority: 'high', icon: '💭',
      titleVI: 'Hãy ghi lại ký ức đầu tiên của bạn!',
      titleEN: 'Record your first memory!',
      actionVI: 'Viết ký ức', actionEN: 'Write memory',
    });
  }
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  return suggestions.slice(0, 5);
}

export function AppProvider({ children }) {
  const [people, setPeople] = useState(() => loadJSON(KEYS.people, []));
  const [events, setEvents] = useState(() => loadJSON(KEYS.events, []));
  const [memories, setMemories] = useState(() => loadJSON(KEYS.memories, []));
  const [places, setPlaces] = useState(() => loadJSON(KEYS.places, []));
  const [tags, setTags] = useState(() => loadJSON(KEYS.tags, DEFAULT_TAGS));
  const [settings, setSettings] = useState(() => loadJSON(KEYS.settings, DEFAULT_SETTINGS));
  const [activeTab, setActiveTab] = useState('dashboard');
  const [toast, setToast] = useState(null);
  const [user, setUser] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [scoreHistory, setScoreHistory] = useState(() => loadJSON(KEYS.scoreHistory, []));
  const [userRole, setUserRole] = useState(null);
  const unsubscribeRef = useRef(null);

  const lang = settings.lang;
  const isLoggedIn = !!user;

  // Persist to localStorage
  useEffect(() => { persist(KEYS.people, people); }, [people]);
  useEffect(() => { persist(KEYS.events, events); }, [events]);
  useEffect(() => { persist(KEYS.memories, memories); }, [memories]);
  useEffect(() => { persist(KEYS.places, places); }, [places]);
  useEffect(() => { persist(KEYS.tags, tags); }, [tags]);
  useEffect(() => { persist(KEYS.settings, settings); }, [settings]);
  useEffect(() => { persist(KEYS.scoreHistory, scoreHistory); }, [scoreHistory]);

  // Init API client
  useEffect(() => {
    initApiClient();
  }, []);

  // Firebase Auth listener
  useEffect(() => {
    const unsub = onAuthChange(async (fbUser) => {
      if (fbUser) {
        setUser({ uid: fbUser.uid, email: fbUser.email, displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'User' });
        setSettings(prev => ({ ...prev, loggedIn: true, email: fbUser.email || '', userId: fbUser.uid, displayName: fbUser.displayName || prev.displayName }));
        // Get role from API
        try {
          const me = await apiAuth.me();
          setUserRole(me.role || 'editor');
        } catch {
          setUserRole('editor');
        }
      } else {
        setUser(null);
        setUserRole(null);
        setSettings(prev => ({ ...prev, loggedIn: false, userId: '' }));
      }
    });
    return unsub;
  }, []);

  // Firestore real-time listener for reads (only when logged in)
  useEffect(() => {
    if (!user?.uid) return;
    let mounted = true;
    let unsub;

    (async () => {
      // Load tags first
      try {
        const fbTags = await loadTagsFromFirestore(user.uid);
        if (fbTags && mounted) setTags(fbTags);
      } catch {}

      // Subscribe to real-time updates from Firestore
      unsub = subscribeToFirestore(user.uid, (coll, data) => {
        if (!mounted) return;
        const strData = JSON.stringify(data);
        // Don't overwrite if local was just written by API (will be updated by listener)
        switch (coll) {
          case 'people': setPeople(data); break;
          case 'events': setEvents(data); break;
          case 'memories': setMemories(data); break;
          case 'places': setPlaces(data); break;
        }
      });

      // Refresh on visibility change (cross-device sync)
      const onVisible = () => {
        if (document.visibilityState === 'visible') {
          if (unsub) unsub();
          unsub = subscribeToFirestore(user.uid, (coll, data) => {
            if (!mounted) return;
            switch (coll) {
              case 'people': setPeople(data); break;
              case 'events': setEvents(data); break;
              case 'memories': setMemories(data); break;
              case 'places': setPlaces(data); break;
            }
          });
        }
      };
      document.addEventListener('visibilitychange', onVisible);
      unsubscribeRef.current = () => {
        if (unsub) unsub();
        document.removeEventListener('visibilitychange', onVisible);
      };
    })();

    return () => { mounted = false; if (unsubscribeRef.current) unsubscribeRef.current(); };
  }, [user?.uid]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  // Life Score
  const lifeScore = calcLifeScore(people, events, memories, places);
  const suggestions = generateSuggestions(people, events, memories, lang, places);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setScoreHistory(prev => {
      const last = prev[prev.length - 1];
      if (last && last.date === today && last.score === lifeScore.lifeScore) return prev;
      const entry = { date: today, score: lifeScore.lifeScore, ...lifeScore };
      const cleaned = prev.filter(e => e.date !== today);
      return [...cleaned, entry].slice(-90);
    });
  }, [lifeScore.lifeScore]);

  const stats = {
    totalPeople: people.length, totalEvents: events.length,
    totalMemories: memories.length, totalPlaces: places.length,
    totalPhotos: memories.reduce((s, m) => s + (m.photos?.length || 0), 0),
    topPeople: [...people].sort((a, b) => (b.relationshipScore || 0) - (a.relationshipScore || 0)).slice(0, 5),
    peopleByTag: tags.map(t => ({ ...t, count: people.filter(p => (p.tags || []).some(pt => pt.id === t.id)).length })),
  };

  // ─── CRUD: People (all writes go through API) ───
  const addPerson = useCallback(async (person) => {
    const p = { ...person, id: genId(), createdAt: new Date().toISOString() };
    setPeople(prev => [...prev, p]); // optimistic local update
    try {
      const result = await apiPeople.create(p);
      showToast('Đã thêm ' + p.name);
      return result;
    } catch (e) {
      setPeople(prev => prev.filter(x => x.id !== p.id)); // rollback
      showToast('Lỗi: ' + e.message);
    }
  }, [showToast]);

  const updatePerson = useCallback(async (id, updates) => {
    setPeople(prev => prev.map(p => p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p));
    try {
      await apiPeople.update(id, updates);
    } catch (e) {
      showToast('Lỗi: ' + e.message);
    }
  }, [showToast]);

  const deletePerson = useCallback(async (id) => {
    const p = people.find(x => x.id === id);
    setPeople(prev => prev.filter(x => x.id !== id));
    setEvents(prev => prev.map(e => ({ ...e, peopleIds: (e.peopleIds || []).filter(pid => pid !== id) })));
    setMemories(prev => prev.map(m => ({ ...m, peopleIds: (m.peopleIds || []).filter(pid => pid !== id) })));
    try {
      await apiPeople.delete(id);
      if (p) showToast('Đã xoá ' + p.name);
    } catch (e) {
      showToast('Lỗi: ' + e.message);
    }
  }, [showToast, people]);

  const addInteraction = useCallback(async (personId, interaction) => {
    const newInteraction = { id: genId(), date: new Date().toISOString().split('T')[0], ...interaction };
    setPeople(prev => prev.map(p => {
      if (p.id !== personId) return p;
      const interactions = p.interactions || [];
      return { ...p, interactions: [...interactions, newInteraction], lastInteractionDate: new Date().toISOString().split('T')[0], updatedAt: new Date().toISOString() };
    }));
    try {
      await apiPeople.update(personId, {
        interactions: [...((people.find(p => p.id === personId)?.interactions) || []), newInteraction],
        lastInteractionDate: new Date().toISOString().split('T')[0],
      });
      showToast('Đã ghi nhận tương tác');
    } catch (e) {
      showToast('Lỗi: ' + e.message);
    }
  }, [showToast, people]);

  // ─── CRUD: Events ───
  const addEvent = useCallback(async (event) => {
    const e = { ...event, id: genId(), createdAt: new Date().toISOString() };
    setEvents(prev => [...prev, e]);
    try {
      const result = await apiEvents.create(e);
      showToast('Đã thêm sự kiện');
      return result;
    } catch (e2) {
      setEvents(prev => prev.filter(x => x.id !== e.id));
      showToast('Lỗi: ' + e2.message);
    }
  }, [showToast]);

  const updateEvent = useCallback(async (id, updates) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e));
    try { await apiEvents.update(id, updates); } catch (e) { showToast('Lỗi: ' + e.message); }
  }, [showToast]);

  const deleteEvent = useCallback(async (id) => {
    setEvents(prev => prev.filter(e => e.id !== id));
    try { await apiEvents.delete(id); showToast('Đã xoá sự kiện'); } catch (e) { showToast('Lỗi: ' + e.message); }
  }, [showToast]);

  // ─── CRUD: Memories ───
  const addMemory = useCallback(async (memory) => {
    const m = { ...memory, id: genId(), createdAt: new Date().toISOString() };
    setMemories(prev => [...prev, m]);
    try {
      const result = await apiMemories.create(m);
      showToast('Đã thêm ký ức');
      return result;
    } catch (e2) {
      setMemories(prev => prev.filter(x => x.id !== m.id));
      showToast('Lỗi: ' + e2.message);
    }
  }, [showToast]);

  const updateMemory = useCallback(async (id, updates) => {
    setMemories(prev => prev.map(m => m.id === id ? { ...m, ...updates, updatedAt: new Date().toISOString() } : m));
    try { await apiMemories.update(id, updates); } catch (e) { showToast('Lỗi: ' + e.message); }
  }, [showToast]);

  const deleteMemory = useCallback(async (id) => {
    setMemories(prev => prev.filter(m => m.id !== id));
    try { await apiMemories.delete(id); showToast('Đã xoá ký ức'); } catch (e) { showToast('Lỗi: ' + e.message); }
  }, [showToast]);

  // ─── CRUD: Places ───
  const addPlace = useCallback(async (place) => {
    const p = { ...place, id: genId(), createdAt: new Date().toISOString() };
    setPlaces(prev => [...prev, p]);
    try {
      const result = await apiPlaces.create(p);
      showToast('Đã thêm ' + place.name);
      return result;
    } catch (e2) {
      setPlaces(prev => prev.filter(x => x.id !== p.id));
      showToast('Lỗi: ' + e2.message);
    }
  }, [showToast]);

  const updatePlace = useCallback(async (id, updates) => {
    setPlaces(prev => prev.map(p => p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p));
    try { await apiPlaces.update(id, updates); } catch (e) { showToast('Lỗi: ' + e.message); }
  }, [showToast]);

  const deletePlace = useCallback(async (id) => {
    const p = places.find(x => x.id === id);
    setPlaces(prev => prev.filter(x => x.id !== id));
    try {
      await apiPlaces.delete(id);
      if (p) showToast('Đã xoá ' + p.name);
    } catch (e) { showToast('Lỗi: ' + e.message); }
  }, [showToast, places]);

  // ─── Tags ───
  const addTag = useCallback((tag) => {
    const t = { id: genId(), ...tag };
    setTags(prev => [...prev, t]);
    showToast('Đã thêm nhóm ' + (tag.nameVI || tag.nameEN));
    return t;
  }, [showToast]);

  const updateTag = useCallback((id, updates) => {
    setTags(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    setPeople(prev => prev.map(p => ({ ...p, tags: (p.tags || []).map(pt => pt.id === id ? { ...pt, ...updates } : pt) })));
    showToast('Đã cập nhật nhóm');
  }, [showToast]);

  const deleteTag = useCallback((id) => {
    setTags(prev => prev.filter(t => t.id !== id));
    setPeople(prev => prev.map(p => ({ ...p, tags: (p.tags || []).filter(pt => pt.id !== id) })));
    showToast('Đã xoá nhóm');
  }, [showToast]);

  const toggleLang = useCallback(() => {
    setSettings(prev => ({ ...prev, lang: prev.lang === 'vi' ? 'en' : 'vi' }));
  }, []);

  const exportData = useCallback(async () => {
    try {
      const data = await apiDataHub.exportJson();
      const blob = new Blob(['\ufeff' + JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'protsphere_export_' + new Date().toISOString().split('T')[0] + '.json'; a.click();
      URL.revokeObjectURL(url);
      showToast('Đã xuất dữ liệu');
    } catch (e) { showToast('Lỗi xuất: ' + e.message); }
  }, [showToast]);

  const importData = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          if (data.people) {
            await apiDataHub.importJson(data.people);
            setPeople(data.people);
          }
          if (data.events) setEvents(data.events);
          if (data.memories) setMemories(data.memories);
          if (data.places) setPlaces(data.places);
          if (data.tags) setTags(data.tags);
          showToast('Đã nhập dữ liệu thành công!');
        } catch { showToast('File không hợp lệ'); }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [showToast]);

  const clearAllData = useCallback(() => {
    if (!confirm(lang === 'vi' ? 'Xoá tất cả dữ liệu?' : 'Delete all data?')) return;
    setPeople([]); setEvents([]); setMemories([]); setPlaces([]); setTags(DEFAULT_TAGS);
    setScoreHistory([]);
    showToast(lang === 'vi' ? 'Đã xoá tất cả dữ liệu' : 'All data cleared');
  }, [lang, showToast]);

  // Auth
  const signInWithGoogle = useCallback(async () => {
    try {
      await fbSignInGoogle();
    } catch (e) {
      showToast(lang === 'vi' ? 'Đăng nhập thất bại' : 'Login failed');
      throw e;
    }
  }, [showToast, lang]);

  const signInWithEmail = useCallback(async (email, password) => {
    try {
      await fbSignInEmail(email, password);
    } catch (e) {
      showToast((lang === 'vi' ? 'Đăng nhập thất bại: ' : 'Login failed: ') + e.message);
      throw e;
    }
  }, [showToast, lang]);

  const signUpWithEmail = useCallback(async (email, password) => {
    try {
      await fbSignUpEmail(email, password);
    } catch (e) {
      showToast((lang === 'vi' ? 'Đăng ký thất bại: ' : 'Signup failed: ') + e.message);
      throw e;
    }
  }, [showToast, lang]);

  const signOut = useCallback(async () => {
    try {
      await fbSignOut();
      setUser(null);
      showToast('Đã đăng xuất');
    } catch { showToast('Sign out failed'); }
  }, [showToast]);

  const value = {
    people, setPeople, events, memories, places, tags, settings, activeTab, toast, lang,
    lifeScore, stats, suggestions, scoreHistory, user, isLoggedIn, isSyncing, userRole,
    setActiveTab, toggleLang, setSettings, showToast,
    addPerson, updatePerson, deletePerson, addInteraction,
    addEvent, updateEvent, deleteEvent,
    addMemory, updateMemory, deleteMemory,
    addPlace, updatePlace, deletePlace,
    addTag, updateTag, deleteTag,
    exportData, importData, clearAllData,
    signInWithGoogle, signInWithEmail, signUpWithEmail, signOut,
    apiDataHub, apiAuth,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
