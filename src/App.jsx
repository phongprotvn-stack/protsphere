import { useState } from 'react';
import { useApp } from './contexts/AppContext';
import { Heart, Users, CalendarHeart, BookHeart, User, Clock } from 'lucide-react';
import { t } from './i18n';
import Dashboard from './screens/Dashboard';
import People from './screens/People';
import Events from './screens/Events';
import Memories from './screens/Memories';
import Settings from './screens/Settings';
import PersonDetail from './screens/PersonDetail';
import Places from './screens/Places';
import Timeline from './screens/Timeline';

const navItems = [
  { id: 'dashboard', Icon: Heart, labelKey: 'nav.dashboard' },
  { id: 'people', Icon: Users, labelKey: 'nav.people' },
  { id: 'events', Icon: CalendarHeart, labelKey: 'nav.events' },
  { id: 'memories', Icon: BookHeart, labelKey: 'nav.memories' },
  { id: 'settings', Icon: User, labelKey: 'nav.settings' },
];

export default function App() {
  const { activeTab, setActiveTab, lang, toast, people, events, memories, places, tags,
    addPerson, updatePerson, deletePerson, addInteraction,
    addEvent, updateEvent, deleteEvent,
    addMemory, updateMemory, deleteMemory,
    addPlace, updatePlace, deletePlace } = useApp();
  const [selectedPersonId, setSelectedPersonId] = useState(null);
  const [showPlaces, setShowPlaces] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);

  const showPerson = (id) => setSelectedPersonId(id);
  const hidePerson = () => setSelectedPersonId(null);

  const renderScreen = () => {
    // Timeline sub-view
    if (showTimeline) {
      return <Timeline onClose={() => setShowTimeline(false)} />;
    }

    // Places sub-view
    if (showPlaces) {
      return <Places places={places} addPlace={addPlace} updatePlace={updatePlace} deletePlace={deletePlace}
        onBack={() => setShowPlaces(false)} />;
    }

    // Person detail overlay
    if (selectedPersonId) {
      const person = people.find(p => p.id === selectedPersonId);
      if (person) {
        const personEvents = events.filter(e => (e.peopleIds || []).includes(selectedPersonId));
        const personMemories = memories.filter(m => (m.peopleIds || []).includes(selectedPersonId));
        return (
          <PersonDetail
            person={person}
            events={personEvents}
            memories={personMemories}
            onBack={hidePerson}
            onDelete={() => { deletePerson(selectedPersonId); hidePerson(); }}
            onAddInteraction={(interaction) => addInteraction(selectedPersonId, interaction)}
            people={people}
            places={places}
          />
        );
      }
    }

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard people={people} events={events} memories={memories} places={places}
          onShowPlaces={() => { setShowPlaces(true); setActiveTab('dashboard'); }}
          onShowTimeline={() => { setShowTimeline(true); setActiveTab('dashboard'); }} />;
      case 'people':
        return <People people={people} tags={tags} onSelectPerson={showPerson} addPerson={addPerson} updatePerson={updatePerson} />;
      case 'events':
        return <Events events={events} people={people} places={places} addEvent={addEvent} updateEvent={updateEvent} deleteEvent={deleteEvent} />;
      case 'memories':
        return <Memories memories={memories} people={people} places={places} addMemory={addMemory} updateMemory={updateMemory} deleteMemory={deleteMemory} />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard people={people} events={events} memories={memories} places={places} />;
    }
  };

  const showNav = !selectedPersonId && !showPlaces && !showTimeline;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#F8F8FA', position: 'relative' }}>
      <main style={{ flex: 1, overflow: 'hidden auto', position: 'relative' }}>
        <div className="screen screen-enter">
          {renderScreen()}
        </div>
      </main>

      {showNav && (
        <nav className="floating-nav">
          {navItems.map(({ id, Icon, labelKey }) => {
            const isActive = activeTab === id;
            return (
              <div
                key={id}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTab(id)}
              >
                <span className="nav-icon">
                  <Icon size={24} strokeWidth={isActive ? 2.4 : 2} />
                </span>
                <span className="nav-label">{t(labelKey, lang)}</span>
              </div>
            );
          })}
        </nav>
      )}

      {/* Toast */}
      <div className={`toast ${toast ? 'show' : ''}`}>{toast || ''}</div>
    </div>
  );
}
