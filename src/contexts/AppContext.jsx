import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  onAuthChange, signInWithGoogle as fbSignInGoogle,
  signInWithEmail as fbSignInEmail, signUpWithEmail as fbSignUpEmail,
  signOutUser as fbSignOut,
  syncToFirestore, loadFromFirestore, syncTagsToFirestore, loadTagsFromFirestore,
  subscribeToFirestore,
} from '../firebase/firebase';

const AppContext = createContext();

const KEYS = {
  people: 'protsphere_people',
  events: 'protsphere_events',
  memories: 'protsphere_memories',
  places: 'protsphere_places',
  tags: 'protsphere_tags',
  settings: 'protsphere_settings',
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
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : def;
  } catch { return def; }
}

function persist(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) { console.error('Persist failed:', key, e.message); }
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function daysBetween(d1, d2) {
  if (!d1 || !d2) return 0;
  const a = new Date(d1 + 'T00:00:00');
  const b = new Date(d2 + 'T00:00:00');
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

function calcLifeScore(people, events, memories, places) {
  const relScore = people.length > 0
    ? Math.round(people.reduce((s, p) => s + (p.relationshipScore || 0), 0) / people.length) : 0;
  const socialRaw = Math.min(people.length * 4 + events.length * 1.5, 100);
  const visitedPlaces = places.filter(p => p.type === 'visited' || p.type === 'lived').length;
  const travelRaw = Math.min(visitedPlaces * 12 + places.filter(p => p.type === 'wantToVisit').length * 5, 100);
  const health = 70;
  const learningRaw = Math.min(memories.length * 3, 100);
  const positiveMoods = memories.filter(m => ['happy', 'excited', 'peaceful', 'grateful', 'inspired', 'loved'].includes(m.mood)).length;
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
  const syncRef = useRef(null);
  const pushVersionRef = useRef(null);
  const isInitialMount = useRef(true);
  const [sheetLoading, setSheetLoading] = useState(false);
  // (sheetLoading exposed for future manual import use)

  const lang = settings.lang;
  const isLoggedIn = !!user;

  useEffect(() => { persist(KEYS.people, people); }, [people]);
  useEffect(() => { persist(KEYS.events, events); }, [events]);
  useEffect(() => { persist(KEYS.memories, memories); }, [memories]);
  useEffect(() => { persist(KEYS.places, places); }, [places]);
  useEffect(() => { persist(KEYS.tags, tags); }, [tags]);
  useEffect(() => { persist(KEYS.settings, settings); }, [settings]);
  useEffect(() => { persist(KEYS.scoreHistory, scoreHistory); }, [scoreHistory]);

  // Firebase Auth listener
  useEffect(() => {
    const unsub = onAuthChange((fbUser) => {
      if (fbUser) {
        setUser({ uid: fbUser.uid, email: fbUser.email, displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'User' });
        setSettings(prev => ({ ...prev, loggedIn: true, email: fbUser.email || '', userId: fbUser.uid, displayName: fbUser.displayName || prev.displayName }));
      } else {
        setUser(null);
        setSettings(prev => ({ ...prev, loggedIn: false, userId: '' }));
      }
    });
    return unsub;
  }, []);

  // Load from Firestore on login + real-time listener
  useEffect(() => {
    if (!user?.uid) return;
    let unsub;
    let mounted = true;
    (async () => {
      try {
        // 1. Load tags from Firestore FIRST
        const fbTags = await loadTagsFromFirestore(user.uid);
        if (fbTags && mounted) setTags(fbTags);

        // 2. Load data from Firestore FIRST (before pushing)
        const fbData = await loadFromFirestore(user.uid);
        if (!mounted) return;

        const localPeople = people || [];
        const localEvents = events || [];
        const localMemories = memories || [];
        const localPlaces = places || [];

        const fbPeople = fbData.people || [];
        const fbEvents = fbData.events || [];
        const fbMemories = fbData.memories || [];
        const fbPlaces = fbData.places || [];

        // 3. Merge: if local is empty but Firestore has data → use Firestore data
        //    If both have data → merge (local additions + Firestore existing that aren't in local)
        //    If Firestore is empty → push local data up
        const mergeArrays = (local, remote) => {
          const merged = [...local];
          for (const rItem of remote) {
            const match = merged.find(m => m.id === rItem.id);
            if (!match) {
              merged.push(rItem);
            }
          }
          return merged;
        };

        const mergedPeople = mergeArrays(localPeople, fbPeople);
        const mergedEvents = mergeArrays(localEvents, fbEvents);
        const mergedMemories = mergeArrays(localMemories, fbMemories);
        const mergedPlaces = mergeArrays(localPlaces, fbPlaces);

        // If Firestore had data that local didn't have, update local state
        if (fbPeople.length > 0 && mergedPeople.length !== localPeople.length) {
          setPeople(mergedPeople);
        }
        if (fbEvents.length > 0 && mergedEvents.length !== localEvents.length) {
          setEvents(mergedEvents);
        }
        if (fbMemories.length > 0 && mergedMemories.length !== localMemories.length) {
          setMemories(mergedMemories);
        }
        if (fbPlaces.length > 0 && mergedPlaces.length !== localPlaces.length) {
          setPlaces(mergedPlaces);
        }

        // 4. Push merged data to Firestore (safe: won't overwrite what's already there)
        const mergedData = { people: mergedPeople, events: mergedEvents, memories: mergedMemories, places: mergedPlaces };
        await syncToFirestore(user.uid, mergedData);
        await syncTagsToFirestore(user.uid, tags);

        // 5. Set push version hashes PER COLLECTION for proper echo detection
        pushVersionRef.current = {
          people: JSON.stringify(mergedPeople),
          events: JSON.stringify(mergedEvents),
          memories: JSON.stringify(mergedMemories),
          places: JSON.stringify(mergedPlaces),
        };
      } catch (e) {
        console.warn('Firestore sync failed:', e.message);
      }
      if (!mounted) return;
        // Subscribe AFTER all sync/merge logic completes
        unsub = subscribeToFirestore(user.uid, (coll, data) => {
          const str = JSON.stringify(data);
          // Echo detection: compare per-collection JSON
          if (pushVersionRef.current?.[coll] === str) return;
          switch (coll) {
            case 'people': setPeople(data); break;
            case 'events': setEvents(data); break;
            case 'memories': setMemories(data); break;
            case 'places': setPlaces(data); break;
          }
        });
        showToast(lang === 'vi' ? 'Đã đồng bộ dữ liệu từ Cloud' : 'Data synced from Cloud');
      })();

      // Re-subscribe on tab visibility change to catch cross-device updates
      const onVisible = () => {
        if (document.visibilityState === 'visible') {
          if (unsub) { unsub(); unsub = null; }
          unsub = subscribeToFirestore(user.uid, (coll, data) => {
            const str = JSON.stringify(data);
            if (pushVersionRef.current?.[coll] === str) return;
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
      return () => { 
        mounted = false; 
        if (unsub) unsub(); 
        document.removeEventListener('visibilitychange', onVisible);
      };
  }, [user?.uid]);

  // Sync to Firestore on data change (debounced)
  useEffect(() => {
    if (!user?.uid) return;
    if (syncRef.current) clearTimeout(syncRef.current);
    syncRef.current = setTimeout(async () => {
      try {
        setIsSyncing(true);
        const data = { people, events, memories, places };
        await syncToFirestore(user.uid, data);
        await syncTagsToFirestore(user.uid, tags);
        // Update per-collection push hashes for echo detection
        pushVersionRef.current = {
          people: JSON.stringify(people),
          events: JSON.stringify(events),
          memories: JSON.stringify(memories),
          places: JSON.stringify(places),
        };
      } catch (e) {
        console.warn('Firestore sync failed:', e.message);
      } finally {
        setIsSyncing(false);
      }
    }, 3000);
    return () => { if (syncRef.current) clearTimeout(syncRef.current); };
  }, [people, events, memories, places, tags, user?.uid]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  // Life Score
  const lifeScore = calcLifeScore(people, events, memories, places);
  const suggestions = generateSuggestions(people, events, memories, lang, places);

  // Track score history
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

  const addPerson = useCallback((person) => {
    const p = { ...person, id: genId(), createdAt: new Date().toISOString() };
    setPeople(prev => [...prev, p]);
    showToast('Đã thêm ' + p.name);
    return p;
  }, [showToast]);

  const updatePerson = useCallback((id, updates) => {
    setPeople(prev => prev.map(p => p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p));
    showToast('Đã cập nhật');
  }, [showToast]);

  const deletePerson = useCallback((id) => {
    const p = people.find(x => x.id === id);
    setPeople(prev => prev.filter(x => x.id !== id));
    if (p) showToast('Đã xoá ' + p.name);
    setEvents(prev => prev.map(e => ({ ...e, peopleIds: (e.peopleIds || []).filter(pid => pid !== id) })));
    setMemories(prev => prev.map(m => ({ ...m, peopleIds: (m.peopleIds || []).filter(pid => pid !== id) })));
  }, [showToast, people]);

  const addInteraction = useCallback((personId, interaction) => {
    setPeople(prev => prev.map(p => {
      if (p.id !== personId) return p;
      const interactions = p.interactions || [];
      const newInteraction = { id: genId(), date: new Date().toISOString().split('T')[0], ...interaction };
      return { ...p, interactions: [...interactions, newInteraction], lastInteractionDate: new Date().toISOString().split('T')[0], updatedAt: new Date().toISOString() };
    }));
    showToast('Đã ghi nhận tương tác');
  }, [showToast]);

  const addEvent = useCallback((event) => {
    const e = { ...event, id: genId(), createdAt: new Date().toISOString() };
    setEvents(prev => [...prev, e]);
    showToast('Đã thêm sự kiện');
    return e;
  }, [showToast]);

  const updateEvent = useCallback((id, updates) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e));
    showToast('Đã cập nhật');
  }, [showToast]);

  const deleteEvent = useCallback((id) => {
    setEvents(prev => prev.filter(e => e.id !== id));
    showToast('Đã xoá sự kiện');
  }, [showToast]);

  const addMemory = useCallback((memory) => {
    const m = { ...memory, id: genId(), createdAt: new Date().toISOString() };
    setMemories(prev => [...prev, m]);
    showToast('Đã thêm ký ức');
    return m;
  }, [showToast]);

  const updateMemory = useCallback((id, updates) => {
    setMemories(prev => prev.map(m => m.id === id ? { ...m, ...updates, updatedAt: new Date().toISOString() } : m));
    showToast('Đã cập nhật');
  }, [showToast]);

  const deleteMemory = useCallback((id) => {
    setMemories(prev => prev.filter(m => m.id !== id));
    showToast('Đã xoá ký ức');
  }, [showToast]);

  const addPlace = useCallback((place) => {
    const p = { ...place, id: genId(), createdAt: new Date().toISOString() };
    setPlaces(prev => [...prev, p]);
    showToast('Đã thêm ' + place.name);
    return p;
  }, [showToast]);

  const updatePlace = useCallback((id, updates) => {
    setPlaces(prev => prev.map(p => p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p));
    showToast('Đã cập nhật');
  }, [showToast]);

  const deletePlace = useCallback((id) => {
    const p = places.find(x => x.id === id);
    setPlaces(prev => prev.filter(x => x.id !== id));
    if (p) showToast('Đã xoá ' + p.name);
  }, [showToast, places]);

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

  const exportData = useCallback(() => {
    const data = { people, events, memories, places, tags, exportedAt: new Date().toISOString() };
    const blob = new Blob(['\ufeff' + JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'protsphere_export_' + new Date().toISOString().split('T')[0] + '.json'; a.click();
    URL.revokeObjectURL(url);
    showToast('Đã xuất dữ liệu');
  }, [people, events, memories, places, tags, showToast]);

  const importData = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          if (data.people) setPeople(data.people);
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

  // Auth actions
  const signInWithGoogle = useCallback(async () => {
    try {
      await fbSignInGoogle();
      showToast('Đã đăng nhập');
    } catch (e) {
      showToast(lang === 'vi' ? 'Đăng nhập thất bại' : 'Login failed');
      throw e;
    }
  }, [showToast, lang]);

  const signInWithEmail = useCallback(async (email, password) => {
    try {
      await fbSignInEmail(email, password);
      showToast('Đã đăng nhập');
    } catch (e) {
      showToast((lang === 'vi' ? 'Đăng nhập thất bại: ' : 'Login failed: ') + e.message);
      throw e;
    }
  }, [showToast, lang]);

  const signUpWithEmail = useCallback(async (email, password) => {
    try {
      await fbSignUpEmail(email, password);
      showToast('Đã đăng ký');
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
    } catch (e) {
      showToast('Sign out failed');
    }
  }, [showToast]);

  const value = {
    people, setPeople, events, memories, places, tags, settings, activeTab, toast, lang,
    lifeScore, stats, suggestions, scoreHistory, user, isLoggedIn, isSyncing, sheetLoading,
    setActiveTab, toggleLang, setSettings, showToast,
    addPerson, updatePerson, deletePerson, addInteraction,
    addEvent, updateEvent, deleteEvent,
    addMemory, updateMemory, deleteMemory,
    addPlace, updatePlace, deletePlace,
    addTag, updateTag, deleteTag,
    exportData, importData, clearAllData,
    signInWithGoogle, signInWithEmail, signUpWithEmail, signOut,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
