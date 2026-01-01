
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { MiiFeatures, EditorTab, MiiPersonality, ViewMode, SavedMii } from './types';
import { INITIAL_FEATURES, SKIN_TONES, HAIR_COLORS, SHIRT_COLORS, FACE_SHAPES, HAIR_STYLES, EYE_TYPES, NOSE_TYPES, MOUTH_TYPES, GLASSES_TYPES } from './constants';
import MiiPreview from './components/MiiPreview';
import { generateMiiPersonality, getMiiSpeech } from './geminiService';

const CITY_STORAGE_KEY = 'mii_maker_city_v1';

interface ChatMessage {
  role: 'user' | 'mii';
  text: string;
}

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('editor');
  const [features, setFeatures] = useState<MiiFeatures>(INITIAL_FEATURES);
  const [activeTab, setActiveTab] = useState<EditorTab>(EditorTab.FACE);
  const [personality, setPersonality] = useState<MiiPersonality | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPassport, setShowPassport] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
  const [city, setCity] = useState<SavedMii[]>([]);
  const [selectedCityMii, setSelectedCityMii] = useState<SavedMii | null>(null);
  
  // Chat States
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isTalking, setIsTalking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Random Plaza Talker state
  const [randomTalker, setRandomTalker] = useState<{id: string, text: string} | null>(null);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isTalking]);

  // Load city and import Mii from URL on mount
  useEffect(() => {
    const storedCity = localStorage.getItem(CITY_STORAGE_KEY);
    if (storedCity) {
      try {
        setCity(JSON.parse(storedCity));
      } catch (e) {
        console.error("Failed to load city data", e);
      }
    }

    const params = new URLSearchParams(window.location.search);
    const sharedData = params.get('mii');
    if (sharedData) {
      try {
        const decoded = JSON.parse(atob(sharedData));
        if (decoded.features) setFeatures(decoded.features);
        if (decoded.personality) {
          setPersonality(decoded.personality);
          setShowPassport(true);
        }
        window.history.replaceState({}, '', window.location.pathname);
      } catch (e) {
        console.error("Failed to import shared Mii", e);
      }
    }
  }, []);

  // Random background talker effect
  useEffect(() => {
    if (viewMode !== 'city' || city.length === 0) return;
    
    const interval = setInterval(() => {
      const luckyMii = city[Math.floor(Math.random() * city.length)];
      setRandomTalker({
        id: luckyMii.id,
        text: luckyMii.personality.catchphrase
      });
      
      setTimeout(() => setRandomTalker(null), 3000);
    }, 8000);

    return () => clearInterval(interval);
  }, [viewMode, city]);

  useEffect(() => {
    localStorage.setItem(CITY_STORAGE_KEY, JSON.stringify(city));
  }, [city]);

  const updateFeature = (key: keyof MiiFeatures, value: string) => {
    setFeatures(prev => ({ ...prev, [key]: value }));
    setPersonality(null); 
    setShowPassport(false);
  };

  const handleGeneratePersonality = async () => {
    setIsGenerating(true);
    try {
      const result = await generateMiiPersonality(features);
      setPersonality(result);
      setShowPassport(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedCityMii || !userInput.trim() || isTalking) return;

    const message = userInput.trim();
    setUserInput('');
    setChatHistory(prev => [...prev, { role: 'user', text: message }]);
    setIsTalking(true);

    try {
      const speech = await getMiiSpeech(selectedCityMii.personality, message);
      setChatHistory(prev => [...prev, { role: 'mii', text: speech }]);
    } catch (err) {
      console.error(err);
      setChatHistory(prev => [...prev, { role: 'mii', text: "Sorry! My Mii brain got a bit tired. Say that again?" }]);
    } finally {
      setIsTalking(false);
    }
  };

  const saveToCity = () => {
    if (!personality) return;
    const newMii: SavedMii = {
      id: crypto.randomUUID(),
      features,
      personality,
      createdAt: Date.now()
    };
    setCity(prev => [newMii, ...prev]);
    setViewMode('city');
    setShowPassport(false);
  };

  const deleteFromCity = (id: string) => {
    if (confirm("Move this Mii out of the city?")) {
      setCity(prev => prev.filter(m => m.id !== id));
      setSelectedCityMii(null);
      setChatHistory([]);
    }
  };

  const editMii = (mii: SavedMii) => {
    setFeatures(mii.features);
    setPersonality(mii.personality);
    setShowPassport(true);
    setViewMode('editor');
    setSelectedCityMii(null);
    setChatHistory([]);
  };

  const getShareUrl = (miiData?: { features: MiiFeatures, personality: MiiPersonality | null }) => {
    const dataToShare = miiData || { features, personality };
    const data = btoa(JSON.stringify(dataToShare));
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('mii', data);
    return url.toString();
  };

  const copyToClipboard = async (url: string) => {
    await navigator.clipboard.writeText(url);
    setCopyStatus('copied');
    setTimeout(() => setCopyStatus('idle'), 2000);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case EditorTab.FACE:
        return (
          <div className="space-y-6">
            <section>
              <h3 className="text-gray-600 font-bold mb-3 uppercase text-xs tracking-widest">Face Shape</h3>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {Object.keys(FACE_SHAPES).map(shape => (
                  <button
                    key={shape}
                    onClick={() => updateFeature('faceShape', shape)}
                    className={`w-16 h-16 shrink-0 flex items-center justify-center rounded-xl border-2 transition-all ${features.faceShape === shape ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                  >
                    <div className={`w-8 h-10 border-2 border-gray-400 ${shape === 'round' ? 'rounded-full' : shape === 'square' ? 'rounded-sm' : 'rounded-b-full'}`} />
                  </button>
                ))}
              </div>
            </section>
            <section>
              <h3 className="text-gray-600 font-bold mb-3 uppercase text-xs tracking-widest">Skin Tone</h3>
              <div className="grid grid-cols-6 gap-2">
                {SKIN_TONES.map(tone => (
                  <button
                    key={tone}
                    onClick={() => updateFeature('skinTone', tone)}
                    className={`w-10 h-10 rounded-full border-2 transition-all ${features.skinTone === tone ? 'border-blue-500 scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: tone }}
                  />
                ))}
              </div>
            </section>
          </div>
        );
      case EditorTab.HAIR:
        return (
          <div className="space-y-6">
            <section>
              <h3 className="text-gray-600 font-bold mb-3 uppercase text-xs tracking-widest">Hairstyle</h3>
              <div className="grid grid-cols-4 gap-3">
                {Object.keys(HAIR_STYLES).map(style => (
                  <button
                    key={style}
                    onClick={() => updateFeature('hairStyle', style)}
                    className={`p-2 rounded-xl border-2 transition-all ${features.hairStyle === style ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                  >
                    <span className="text-xs font-medium capitalize text-gray-700">{style}</span>
                  </button>
                ))}
              </div>
            </section>
            <section>
              <h3 className="text-gray-600 font-bold mb-3 uppercase text-xs tracking-widest">Hair Color</h3>
              <div className="grid grid-cols-4 gap-2">
                {HAIR_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => updateFeature('hairColor', color)}
                    className={`w-full h-8 rounded-lg border-2 transition-all ${features.hairColor === color ? 'border-blue-500 scale-105' : 'border-transparent'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </section>
          </div>
        );
      case EditorTab.EYES:
        return (
          <div className="space-y-6">
            <section>
              <h3 className="text-gray-600 font-bold mb-3 uppercase text-xs tracking-widest">Eye Expression</h3>
              <div className="grid grid-cols-4 gap-3">
                {Object.keys(EYE_TYPES).map(type => (
                  <button
                    key={type}
                    onClick={() => updateFeature('eyeType', type)}
                    className={`p-4 rounded-xl border-2 transition-all ${features.eyeType === type ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                  >
                    <svg width="30" height="15" viewBox="0 0 100 50">
                      <path d={EYE_TYPES[type as keyof typeof EYE_TYPES].left} stroke="black" strokeWidth="10" fill="none" strokeLinecap="round" />
                    </svg>
                  </button>
                ))}
              </div>
            </section>
            <section>
              <h3 className="text-gray-600 font-bold mb-3 uppercase text-xs tracking-widest">Eyewear</h3>
              <div className="grid grid-cols-4 gap-3">
                {Object.keys(GLASSES_TYPES).map(style => (
                  <button
                    key={style}
                    onClick={() => updateFeature('glasses', style)}
                    className={`p-2 rounded-xl border-2 transition-all ${features.glasses === style ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                  >
                    <span className="text-xs font-medium capitalize text-gray-700">{style}</span>
                  </button>
                ))}
              </div>
            </section>
          </div>
        );
      case EditorTab.NOSE_MOUTH:
        return (
          <div className="space-y-6">
            <section>
              <h3 className="text-gray-600 font-bold mb-3 uppercase text-xs tracking-widest">Nose Shape</h3>
              <div className="flex gap-3">
                {Object.keys(NOSE_TYPES).map(type => (
                  <button
                    key={type}
                    onClick={() => updateFeature('noseType', type)}
                    className={`p-4 rounded-xl border-2 transition-all ${features.noseType === type ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                  >
                    <svg width="20" height="20" viewBox="40 75 20 20">
                      <path d={NOSE_TYPES[type as keyof typeof NOSE_TYPES]} stroke="black" strokeWidth="2" fill="none" />
                    </svg>
                  </button>
                ))}
              </div>
            </section>
            <section>
              <h3 className="text-gray-600 font-bold mb-3 uppercase text-xs tracking-widest">Mouth</h3>
              <div className="grid grid-cols-4 gap-3">
                {Object.keys(MOUTH_TYPES).map(type => (
                  <button
                    key={type}
                    onClick={() => updateFeature('mouthType', type)}
                    className={`p-4 flex items-center justify-center rounded-xl border-2 transition-all ${features.mouthType === type ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                  >
                    <svg width="30" height="15" viewBox="30 100 40 30">
                      <path d={MOUTH_TYPES[type as keyof typeof MOUTH_TYPES]} stroke="black" strokeWidth="3" fill="none" strokeLinecap="round" />
                    </svg>
                  </button>
                ))}
              </div>
            </section>
          </div>
        );
      case EditorTab.CLOTHING:
        return (
          <div className="space-y-6">
            <section>
              <h3 className="text-gray-600 font-bold mb-3 uppercase text-xs tracking-widest">Shirt Color</h3>
              <div className="grid grid-cols-4 gap-2">
                {SHIRT_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => updateFeature('shirtColor', color)}
                    className={`w-full h-10 rounded-lg border-2 transition-all ${features.shirtColor === color ? 'border-blue-500 scale-105' : 'border-transparent'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </section>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto min-h-screen flex flex-col p-4 md:p-8">
      {/* Header */}
      <header className="flex flex-col items-center mb-8 animate-fade-in relative">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-2xl wii-shadow">
            M
          </div>
          <h1 className="text-4xl font-extrabold text-blue-900 tracking-tight">Mii Maker AI</h1>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex mt-6 bg-white/50 backdrop-blur rounded-full p-1 border-2 border-blue-100 wii-shadow">
          <button 
            onClick={() => { setViewMode('editor'); setChatHistory([]); }}
            className={`px-8 py-2 rounded-full font-bold text-sm transition-all ${viewMode === 'editor' ? 'bg-blue-600 text-white' : 'text-blue-400 hover:text-blue-600'}`}
          >
            Maker
          </button>
          <button 
            onClick={() => { setViewMode('city'); setChatHistory([]); }}
            className={`px-8 py-2 rounded-full font-bold text-sm transition-all ${viewMode === 'city' ? 'bg-blue-600 text-white' : 'text-blue-400 hover:text-blue-600'}`}
          >
            Mii City ({city.length})
          </button>
        </div>
      </header>

      {viewMode === 'editor' ? (
        <main className="flex-1 grid lg:grid-cols-2 gap-12 items-start">
          <div className="flex flex-col items-center gap-8">
            <div className="relative">
              <div className="absolute inset-0 bg-white rounded-full opacity-50 blur-3xl scale-110 -z-10" />
              <MiiPreview features={features} size={320} />
              
              {isGenerating && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-sm rounded-full animate-pulse">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-blue-700 font-bold mt-2 text-sm">Generating Soul...</span>
                  </div>
                </div>
              )}
            </div>

            {!showPassport ? (
              <button
                onClick={handleGeneratePersonality}
                disabled={isGenerating}
                className="w-full max-w-xs py-4 px-6 rounded-full bg-blue-600 text-white font-bold text-lg wii-shadow wii-button flex items-center justify-center gap-2 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Get Mii Personality
              </button>
            ) : personality && (
              <div className="w-full bg-white rounded-3xl p-6 wii-shadow border-4 border-blue-100 animate-in fade-in zoom-in duration-500">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-2xl font-bold text-blue-900">{personality.name}</h2>
                  <div className="flex gap-2">
                     <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-bold uppercase tracking-widest">{personality.zodiacSign}</span>
                  </div>
                </div>
                <p className="text-gray-500 italic mb-4">"{personality.catchphrase}"</p>
                
                <div className="space-y-4 text-left">
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">About</h4>
                    <p className="text-gray-700 leading-relaxed text-sm">{personality.biography}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Hobbies</h4>
                      <ul className="text-xs text-blue-600 space-y-1">
                        {personality.hobbies.map(h => <li key={h} className="bg-blue-50 px-2 py-0.5 rounded inline-block mr-1 mb-1">{h}</li>)}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Fave Food</h4>
                      <p className="text-sm font-medium text-gray-800">{personality.favoriteFood}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 mt-6">
                   <button 
                    onClick={saveToCity}
                    className="flex-1 min-w-[120px] py-2 text-xs font-bold bg-green-500 text-white hover:bg-green-600 rounded-xl wii-shadow wii-button flex items-center justify-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Move to City
                  </button>
                  <button 
                    onClick={() => setShowShareModal(true)}
                    className="flex-1 min-w-[120px] py-2 text-xs font-bold bg-blue-500 text-white hover:bg-blue-600 rounded-xl wii-shadow wii-button flex items-center justify-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    Share
                  </button>
                   <button 
                    onClick={() => setShowPassport(false)}
                    className="w-full py-2 text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors uppercase tracking-widest mt-2"
                  >
                    ← Edit Face
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 md:p-8 wii-shadow h-fit border-2 border-white">
            <nav className="flex mb-8 bg-gray-100 p-1 rounded-2xl overflow-x-auto scrollbar-hide">
              {Object.values(EditorTab).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 min-w-[70px] py-2 text-xs md:text-sm font-bold rounded-xl transition-all ${activeTab === tab ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  {tab}
                </button>
              ))}
            </nav>
            <div className="min-h-[300px]">
              {renderTabContent()}
            </div>
            <div className="mt-8 pt-8 border-t border-gray-100 flex justify-between items-center">
              <button 
                onClick={() => {
                  setFeatures(INITIAL_FEATURES);
                  setPersonality(null);
                  setShowPassport(false);
                }}
                className="text-gray-400 text-sm font-bold hover:text-red-500"
              >
                Reset All
              </button>
              <div className="text-gray-300 text-[10px] font-bold uppercase tracking-widest">
                Nintendo Style Avatar Gen
              </div>
            </div>
          </div>
        </main>
      ) : (
        <div className="flex-1 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white/40 backdrop-blur-md rounded-[40px] p-8 min-h-[60vh] wii-shadow border-4 border-white/50 relative">
            <div className="flex justify-between items-center mb-12 relative z-10">
              <div>
                <h2 className="text-3xl font-extrabold text-blue-900">Mii Plaza</h2>
                <p className="text-blue-600 text-sm">Tap a friend to chat with them!</p>
              </div>
              <button 
                onClick={() => setViewMode('editor')}
                className="bg-blue-500 text-white px-6 py-2 rounded-full font-bold text-sm wii-shadow wii-button"
              >
                + Create New
              </button>
            </div>

            {city.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-blue-800">Your city is empty!</h3>
                <p className="text-blue-400 mt-1">Go to the Maker to invite some Miis.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-y-16 gap-x-6 relative z-10 pb-12">
                {city.map(mii => (
                  <div 
                    key={mii.id} 
                    onClick={() => { setSelectedCityMii(mii); setChatHistory([{ role: 'mii', text: `Hi there! ${mii.personality.catchphrase}` }]); }}
                    className="flex flex-col items-center group cursor-pointer animate-in zoom-in duration-300 relative"
                  >
                    {/* Random background speech bubbles */}
                    {randomTalker?.id === mii.id && (
                      <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-white border-4 border-blue-500 px-4 py-2 rounded-2xl wii-shadow z-50 animate-bounce whitespace-nowrap">
                         <div className="text-blue-600 font-extrabold text-xs">{randomTalker.text}</div>
                         <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-r-4 border-b-4 border-blue-500 rotate-45" />
                      </div>
                    )}

                    <div className="relative transform transition-transform group-hover:scale-110 group-hover:-translate-y-2">
                      <div className="absolute -bottom-2 w-12 h-4 bg-black/5 rounded-[100%] blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />
                      <MiiPreview features={mii.features} size={120} />
                    </div>
                    <span className="mt-2 text-sm font-bold text-blue-900 bg-white/80 px-3 py-1 rounded-full wii-shadow">{mii.personality.name}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="absolute top-20 -right-20 w-64 h-64 bg-blue-100/30 rounded-full blur-3xl -z-0" />
            <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-green-100/30 rounded-full blur-3xl -z-0" />
          </div>
        </div>
      )}

      {/* Mii Details Modal - CLIP FIX: Removed overflow-hidden */}
      {selectedCityMii && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-blue-900/60 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-[40px] p-8 wii-shadow border-[10px] border-blue-100 animate-slide-up relative flex flex-col items-center overflow-visible">
              <button 
                onClick={() => { setSelectedCityMii(null); setChatHistory([]); }} 
                className="absolute top-4 right-4 text-blue-200 hover:text-blue-500 transition-colors z-20 p-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="flex flex-col lg:flex-row gap-8 w-full h-full overflow-hidden">
                {/* Left: Character Info */}
                <div className="lg:w-1/3 flex flex-col items-center">
                  <div className="bg-blue-50 rounded-full p-6 border-4 border-white shadow-inner mb-4">
                    <MiiPreview features={selectedCityMii.features} size={160} />
                  </div>
                  <h2 className="text-3xl font-extrabold text-blue-900 mb-1 text-center">{selectedCityMii.personality.name}</h2>
                  <p className="text-blue-500 font-bold italic mb-6 text-center">"{selectedCityMii.personality.catchphrase}"</p>
                  
                  <div className="bg-gray-50 p-4 rounded-3xl border-2 border-gray-100 text-left w-full mb-4">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Mii Story</h4>
                    <p className="text-xs text-gray-700 leading-relaxed font-medium">{selectedCityMii.personality.biography}</p>
                  </div>

                  <div className="flex gap-2 w-full">
                    <button 
                      onClick={() => editMii(selectedCityMii)}
                      className="flex-1 py-3 bg-blue-100 text-blue-600 font-bold rounded-2xl wii-button text-xs"
                    >
                      Style
                    </button>
                    <button 
                      onClick={() => deleteFromCity(selectedCityMii.id)}
                      className="flex-1 py-3 bg-red-50 text-red-400 font-bold rounded-2xl wii-button text-xs"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Right: AI Chat Bot Section */}
                <div className="lg:w-2/3 flex flex-col h-[50vh] lg:h-[60vh] bg-blue-50/50 rounded-[30px] border-4 border-white p-4 relative overflow-hidden">
                  <div className="flex-1 overflow-y-auto pr-2 space-y-4 mb-4 scrollbar-hide">
                    {chatHistory.map((msg, idx) => (
                      <div 
                        key={idx} 
                        className={`flex flex-col ${msg.role === 'mii' ? 'items-start' : 'items-end'} animate-in slide-in-from-bottom-2 duration-300`}
                      >
                        <div 
                          className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm font-bold relative ${
                            msg.role === 'mii' 
                              ? 'bg-white text-blue-900 border-2 border-blue-200 rounded-bl-none shadow-sm' 
                              : 'bg-blue-600 text-white rounded-br-none shadow-blue-200'
                          }`}
                        >
                          {msg.text}
                          {/* Chat Tail */}
                          <div className={`absolute bottom-0 w-3 h-3 ${
                            msg.role === 'mii' 
                              ? '-left-1 bg-white border-l-2 border-b-2 border-blue-200' 
                              : '-right-1 bg-blue-600'
                          } rotate-45 -z-10`} />
                        </div>
                      </div>
                    ))}
                    {isTalking && (
                      <div className="flex items-start">
                        <div className="bg-white border-2 border-blue-100 px-4 py-3 rounded-2xl shadow-sm">
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input 
                      type="text"
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      placeholder={`Say something to ${selectedCityMii.personality.name}...`}
                      className="flex-1 p-4 bg-white rounded-2xl border-2 border-blue-100 text-sm focus:outline-none focus:border-blue-400 transition-colors wii-shadow font-bold text-blue-900 placeholder-blue-200"
                    />
                    <button 
                      type="submit"
                      disabled={isTalking || !userInput.trim()}
                      className="bg-yellow-400 text-yellow-900 px-6 rounded-2xl font-black wii-shadow wii-button disabled:opacity-50"
                    >
                      SEND
                    </button>
                  </form>
                </div>
              </div>
           </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-blue-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[40px] p-8 wii-shadow border-8 border-blue-100 animate-slide-up flex flex-col items-center">
            <h3 className="text-2xl font-extrabold text-blue-900 mb-6">Share Mii</h3>
            <div className="p-4 bg-blue-50 rounded-[30px] border-4 border-white shadow-inner mb-6">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(getShareUrl())}`} 
                alt="Mii QR Code" 
                className="w-40 h-40 rounded-lg shadow-lg"
              />
            </div>
            <div className="w-full relative mb-6">
               <input readOnly value={getShareUrl()} className="w-full p-4 bg-gray-100 rounded-2xl text-[10px] text-gray-500 border-2 border-gray-200 focus:outline-none" />
               <button onClick={() => copyToClipboard(getShareUrl())} className={`absolute right-1 top-1 bottom-1 px-4 rounded-xl text-xs font-bold transition-all ${copyStatus === 'copied' ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'}`}>
                 {copyStatus === 'copied' ? 'Copied!' : 'Copy'}
               </button>
            </div>
            <button onClick={() => setShowShareModal(false)} className="w-full py-4 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-2xl transition-colors">
              Done
            </button>
          </div>
        </div>
      )}

      <footer className="mt-auto text-center text-blue-300 text-[10px] font-bold uppercase tracking-widest py-8">
        &copy; 2025 Mii Maker AI &bull; Parody App
      </footer>
    </div>
  );
};

export default App;
