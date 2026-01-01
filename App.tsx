import React, { useState, useCallback, useEffect, useRef } from 'react';
// Fixed: ShopItem type should be imported from types.ts
import { MiiFeatures, EditorTab, MiiPersonality, ViewMode, SavedMii, ShopItem } from './types';
// Fixed: ShopItem removed from constants import since it is a type defined in types.ts
import { INITIAL_FEATURES, SKIN_TONES, HAIR_COLORS, SHIRT_COLORS, FACE_SHAPES, HAIR_STYLES, EYE_TYPES, NOSE_TYPES, MOUTH_TYPES, GLASSES_TYPES, SHOP_ITEMS } from './constants';
import MiiPreview from './components/MiiPreview';
import { generateMiiPersonality, getMiiSpeech, encode, decode, decodeAudioData } from './geminiService';
import { GoogleGenAI, Modality, Type } from "@google/genai";

const CITY_STORAGE_KEY = 'mii_maker_city_v1';
const SHOP_STORAGE_KEY = 'mii_maker_shop_v1';
const SCORE_STORAGE_KEY = 'mii_maker_score_v1';

const DEFAULT_CINEMA_VIDEOS = [
  { id: '36_8i8U6zS8', title: 'Wii Sports Resort Theme', thumbnail: 'https://i.ytimg.com/vi/36_8i8U6zS8/hqdefault.jpg' },
  { id: '89_V_E6YySg', title: 'Mii Channel Music Full', thumbnail: 'https://i.ytimg.com/vi/89_V_E6YySg/hqdefault.jpg' },
  { id: 'rS3D14_NPrM', title: 'Wii Shop Channel Music', thumbnail: 'https://i.ytimg.com/vi/rS3D14_NPrM/hqdefault.jpg' },
  { id: '1-8GkSg7nMM', title: 'Wii Music Main Theme', thumbnail: 'https://i.ytimg.com/vi/1-8GkSg7nMM/hqdefault.jpg' },
];

interface ChatMessage {
  role: 'user' | 'mii';
  text: string;
}

interface CinemaVideo {
  id: string;
  title: string;
  thumbnail: string;
}

interface GameItem {
  id: number;
  type: 'coin' | 'bomb' | 'star';
  x: number;
  y: number;
  speed: number;
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
  
  // Interactive States
  const [jumpingMiiIds, setJumpingMiiIds] = useState<Set<string>>(new Set());
  const [fountainSurge, setFountainSurge] = useState(false);
  const [coinPosition, setCoinPosition] = useState<{x: number, y: number} | null>(null);
  const [score, setScore] = useState(0);
  const [unlockedItems, setUnlockedItems] = useState<string[]>([]);
  const [showEffect, setShowEffect] = useState<{text: string, x: number, y: number} | null>(null);

  // Cinema States
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [isCurtainOpen, setIsCurtainOpen] = useState(false);
  const [cinemaSearch, setCinemaSearch] = useState('');
  const [isSearchingCinema, setIsSearchingCinema] = useState(false);
  const [cinemaResults, setCinemaResults] = useState<CinemaVideo[]>(DEFAULT_CINEMA_VIDEOS);
  const youtubePlayerRef = useRef<any>(null);

  // Game Place States
  const [activeGame, setActiveGame] = useState<'none' | 'catcher'>('none');
  const [gameScore, setGameScore] = useState(0);
  const [catcherPos, setCatcherPos] = useState(50); // percentage
  const [gameItems, setGameItems] = useState<GameItem[]>([]);
  const [gameActive, setGameActive] = useState(false);
  const gameLoopRef = useRef<number>(null);
  const gameContainerRef = useRef<HTMLDivElement>(null);

  // Chat States
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isTalking, setIsTalking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Voice Call States
  const [isVoiceCallActive, setIsVoiceCallActive] = useState(false);
  const [isConnectingCall, setIsConnectingCall] = useState(false);
  const liveSessionRef = useRef<any>(null);
  const audioContextsRef = useRef<{ input?: AudioContext, output?: AudioContext }>({});
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);

  // Random Plaza Talker state
  const [randomTalker, setRandomTalker] = useState<{id: string, text: string} | null>(null);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isTalking]);

  // Load persistence
  useEffect(() => {
    const storedCity = localStorage.getItem(CITY_STORAGE_KEY);
    if (storedCity) {
      try { setCity(JSON.parse(storedCity)); } catch (e) { console.error(e); }
    }
    const storedShop = localStorage.getItem(SHOP_STORAGE_KEY);
    if (storedShop) {
      try { setUnlockedItems(JSON.parse(storedShop)); } catch (e) { console.error(e); }
    }
    const storedScore = localStorage.getItem(SCORE_STORAGE_KEY);
    if (storedScore) {
      setScore(parseInt(storedScore) || 0);
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

  // Save persistence
  useEffect(() => {
    localStorage.setItem(CITY_STORAGE_KEY, JSON.stringify(city));
  }, [city]);
  useEffect(() => {
    localStorage.setItem(SHOP_STORAGE_KEY, JSON.stringify(unlockedItems));
  }, [unlockedItems]);
  useEffect(() => {
    localStorage.setItem(SCORE_STORAGE_KEY, score.toString());
  }, [score]);

  // Random events (Talker and Coin Spawn)
  useEffect(() => {
    if (viewMode !== 'city' || city.length === 0) return;
    const talkerInterval = setInterval(() => {
      const luckyMii = city[Math.floor(Math.random() * city.length)];
      setRandomTalker({ id: luckyMii.id, text: luckyMii.personality.catchphrase });
      setTimeout(() => setRandomTalker(null), 3000);
    }, 8000);
    const coinInterval = setInterval(() => {
      if (Math.random() > 0.6) {
        setCoinPosition({ x: 20 + Math.random() * 60, y: 20 + Math.random() * 40 });
      }
    }, 5000);
    return () => {
      clearInterval(talkerInterval);
      clearInterval(coinInterval);
    };
  }, [viewMode, city]);

  // Game Logic: Mii Catcher
  const startGameCatcher = () => {
    setActiveGame('catcher');
    setGameScore(0);
    setGameItems([]);
    setGameActive(true);
    setCatcherPos(50);
  };

  const handleGameMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!gameActive || !gameContainerRef.current) return;
    const rect = gameContainerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const x = ((clientX - rect.left) / rect.width) * 100;
    setCatcherPos(Math.max(5, Math.min(95, x)));
  };

  useEffect(() => {
    if (!gameActive || activeGame !== 'catcher') return;

    const spawnItem = () => {
      const types: GameItem['type'][] = ['coin', 'coin', 'coin', 'bomb', 'star'];
      const type = types[Math.floor(Math.random() * types.length)];
      const newItem: GameItem = {
        id: Date.now() + Math.random(),
        type,
        x: Math.random() * 90 + 5,
        y: -10,
        speed: 1 + Math.random() * 2,
      };
      setGameItems(prev => [...prev, newItem]);
    };

    const spawnInterval = setInterval(spawnItem, 800);

    const update = () => {
      setGameItems(prev => {
        const next = prev.map(item => ({ ...item, y: item.y + item.speed }));
        
        // Collision check
        const filtered = next.filter(item => {
          const isAtBottom = item.y > 80 && item.y < 95;
          const isHittingCatcher = Math.abs(item.x - catcherPos) < 10;
          
          if (isAtBottom && isHittingCatcher) {
            if (item.type === 'coin') setGameScore(s => s + 10);
            if (item.type === 'star') setGameScore(s => s + 50);
            if (item.type === 'bomb') {
              setGameActive(false);
              // Game Over logic handled elsewhere via gameActive state
            }
            return false;
          }
          return item.y < 110;
        });
        
        return filtered;
      });
      gameLoopRef.current = requestAnimationFrame(update);
    };

    gameLoopRef.current = requestAnimationFrame(update);

    return () => {
      clearInterval(spawnInterval);
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [gameActive, activeGame, catcherPos]);

  const quitGame = () => {
    if (gameScore > 0) {
      setScore(prev => prev + gameScore);
      setShowEffect({ text: `+${gameScore} GAME COINS!`, x: window.innerWidth / 2, y: window.innerHeight / 2 });
      setTimeout(() => setShowEffect(null), 2000);
    }
    setGameActive(false);
    setActiveGame('none');
    setGameScore(0);
    setGameItems([]);
  };

  // Cinema Search with Gemini
  const handleCinemaSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cinemaSearch.trim() || isSearchingCinema) return;

    setIsSearchingCinema(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Find 4 popular YouTube video IDs and titles for the search query: "${cinemaSearch}". 
        Make them fun and family-friendly. Return only a JSON array of objects with 'id', 'title', and 'thumbnail' (use https://i.ytimg.com/vi/[ID]/hqdefault.jpg).`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                thumbnail: { type: Type.STRING }
              },
              required: ["id", "title", "thumbnail"]
            }
          }
        }
      });
      const results = JSON.parse(response.text.trim());
      setCinemaResults(results);
    } catch (err) {
      console.error("Search failed:", err);
      const youtubeIdMatch = cinemaSearch.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([^& \n]+)/);
      if (youtubeIdMatch && youtubeIdMatch[1]) {
        setCinemaResults([{
          id: youtubeIdMatch[1],
          title: "Your Custom Video",
          thumbnail: `https://i.ytimg.com/vi/${youtubeIdMatch[1]}/hqdefault.jpg`
        }]);
      }
    } finally {
      setIsSearchingCinema(false);
    }
  };

  // YouTube API Integration
  const onPlayerStateChange = (event: any) => {
    if (event.data === 0) {
      setScore(prev => prev + 500);
      setShowEffect({ text: "+500 CINEMA BONUS!", x: window.innerWidth / 2, y: window.innerHeight / 2 });
      setTimeout(() => setShowEffect(null), 3000);
      setActiveVideo(null);
      setIsCurtainOpen(false);
    }
  };

  const initYoutubePlayer = (videoId: string) => {
    if (youtubePlayerRef.current) {
      youtubePlayerRef.current.loadVideoById(videoId);
      return;
    }

    const player = new (window as any).YT.Player('youtube-player', {
      height: '360',
      width: '640',
      videoId: videoId,
      playerVars: {
        'autoplay': 1,
        'controls': 1,
      },
      events: {
        'onStateChange': onPlayerStateChange
      }
    });
    youtubePlayerRef.current = player;
  };

  const handleVideoSelect = (id: string) => {
    setActiveVideo(id);
    setIsCurtainOpen(true);
    setTimeout(() => initYoutubePlayer(id), 100);
  };

  const triggerMiiJump = (id: string) => {
    setJumpingMiiIds(prev => new Set(prev).add(id));
    setTimeout(() => {
      setJumpingMiiIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 600);
  };

  const handleFountainClick = () => {
    setFountainSurge(true);
    city.forEach(mii => {
      setTimeout(() => triggerMiiJump(mii.id), Math.random() * 300);
    });
    setTimeout(() => setFountainSurge(false), 2000);
  };

  const handleCoinClick = (e: React.MouseEvent) => {
    setScore(prev => prev + 100);
    setCoinPosition(null);
    setShowEffect({ text: "+100", x: e.clientX, y: e.clientY });
    setTimeout(() => setShowEffect(null), 1000);
  };

  const handleBuyItem = (item: ShopItem) => {
    if (score >= item.price && !unlockedItems.includes(item.id)) {
      setScore(prev => prev - item.price);
      setUnlockedItems(prev => [...prev, item.id]);
    }
  };

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
      triggerMiiJump(selectedCityMii.id);
    } catch (err) {
      console.error(err);
      setChatHistory(prev => [...prev, { role: 'mii', text: "Sorry! My Mii brain got a bit tired." }]);
    } finally {
      setIsTalking(false);
    }
  };

  const endVoiceCall = () => {
    if (liveSessionRef.current) { try { liveSessionRef.current.close(); } catch {} liveSessionRef.current = null; }
    if (audioContextsRef.current.input) audioContextsRef.current.input.close();
    if (audioContextsRef.current.output) audioContextsRef.current.output.close();
    audioSourcesRef.current.forEach(s => s.stop());
    audioSourcesRef.current.clear();
    nextStartTimeRef.current = 0;
    setIsVoiceCallActive(false);
    setIsConnectingCall(false);
  };

  const saveToCity = () => {
    if (!personality) return;
    const newMii: SavedMii = { id: crypto.randomUUID(), features, personality, createdAt: Date.now() };
    setCity(prev => [newMii, ...prev]);
    setViewMode('city');
    setShowPassport(false);
  };

  const deleteFromCity = (id: string) => {
    if (confirm("Move this Mii out of the city?")) {
      setCity(prev => prev.filter(m => m.id !== id));
      setSelectedCityMii(null);
      setChatHistory([]);
      setViewMode('city');
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

  const goToMiiHome = (mii: SavedMii) => {
    setSelectedCityMii(mii);
    setViewMode('home');
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
    const availableHairColors = [...HAIR_COLORS, ...SHOP_ITEMS.filter(item => item.type === 'hairColor' && unlockedItems.includes(item.id)).map(i => i.value)];
    const availableShirtColors = [...SHIRT_COLORS, ...SHOP_ITEMS.filter(item => item.type === 'shirtColor' && unlockedItems.includes(item.id)).map(i => i.value)];

    switch (activeTab) {
      case EditorTab.FACE:
        return (
          <div className="space-y-6">
            <section>
              <h3 className="text-gray-600 font-bold mb-3 uppercase text-xs tracking-widest">Face Shape</h3>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {Object.keys(FACE_SHAPES).map(shape => (
                  <button key={shape} onClick={() => updateFeature('faceShape', shape)} className={`w-16 h-16 shrink-0 flex items-center justify-center rounded-xl border-2 transition-all ${features.faceShape === shape ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                    <div className={`w-8 h-10 border-2 border-gray-400 ${shape === 'round' ? 'rounded-full' : shape === 'square' ? 'rounded-sm' : 'rounded-b-full'}`} />
                  </button>
                ))}
              </div>
            </section>
            <section>
              <h3 className="text-gray-600 font-bold mb-3 uppercase text-xs tracking-widest">Skin Tone</h3>
              <div className="grid grid-cols-6 gap-2">
                {SKIN_TONES.map(tone => (
                  <button key={tone} onClick={() => updateFeature('skinTone', tone)} className={`w-10 h-10 rounded-full border-2 transition-all ${features.skinTone === tone ? 'border-blue-500 scale-110' : 'border-transparent'}`} style={{ backgroundColor: tone }} />
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
                  <button key={style} onClick={() => updateFeature('hairStyle', style)} className={`p-2 rounded-xl border-2 transition-all ${features.hairStyle === style ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                    <span className="text-xs font-medium capitalize text-gray-700">{style}</span>
                  </button>
                ))}
              </div>
            </section>
            <section>
              <h3 className="text-gray-600 font-bold mb-3 uppercase text-xs tracking-widest">Hair Color</h3>
              <div className="grid grid-cols-4 gap-2">
                {availableHairColors.map(color => (
                  <button key={color} onClick={() => updateFeature('hairColor', color)} className={`w-full h-8 rounded-lg border-2 transition-all ${features.hairColor === color ? 'border-blue-500 scale-105' : 'border-transparent'}`} style={{ backgroundColor: color }} />
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
                  <button key={type} onClick={() => updateFeature('eyeType', type)} className={`p-4 rounded-xl border-2 transition-all ${features.eyeType === type ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
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
                  <button key={style} onClick={() => updateFeature('glasses', style)} className={`p-2 rounded-xl border-2 transition-all ${features.glasses === style ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
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
                  <button key={type} onClick={() => updateFeature('noseType', type)} className={`p-4 rounded-xl border-2 transition-all ${features.noseType === type ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
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
                  <button key={type} onClick={() => updateFeature('mouthType', type)} className={`p-4 flex items-center justify-center rounded-xl border-2 transition-all ${features.mouthType === type ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
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
                {availableShirtColors.map(color => (
                  <button key={color} onClick={() => updateFeature('shirtColor', color)} className={`w-full h-10 rounded-lg border-2 transition-all ${features.shirtColor === color ? 'border-blue-500 scale-105' : 'border-transparent'}`} style={{ backgroundColor: color }} />
                ))}
              </div>
            </section>
          </div>
        );
      default:
        return null;
    }
  };

  const getHobbyIcon = (hobby: string) => {
    const h = hobby.toLowerCase();
    if (h.includes('game') || h.includes('play')) return '🎮';
    if (h.includes('cook') || h.includes('food')) return '🍳';
    if (h.includes('tenni') || h.includes('sport') || h.includes('bowl')) return '🎾';
    if (h.includes('music') || h.includes('sing')) return '🎵';
    if (h.includes('art') || h.includes('draw') || h.includes('paint')) return '🎨';
    if (h.includes('read')) return '📚';
    if (h.includes('garden')) return '🌱';
    return '⭐';
  };

  return (
    <div className="max-w-6xl mx-auto min-h-screen flex flex-col p-4 md:p-8">
      {showEffect && (
        <div className="fixed pointer-events-none z-[200] text-yellow-500 font-black text-2xl animate-coin-pop text-center w-full flex justify-center" style={{ left: 0, top: showEffect.y }}>
          <div className="bg-white/80 px-8 py-4 rounded-full wii-shadow border-4 border-yellow-400">{showEffect.text}</div>
        </div>
      )}

      <header className="flex flex-col items-center mb-8 animate-fade-in relative">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-2xl wii-shadow">M</div>
          <h1 className="text-4xl font-extrabold text-blue-900 tracking-tight">Mii Maker AI</h1>
        </div>
        <div className="flex mt-6 bg-white/50 backdrop-blur rounded-full p-1 border-2 border-blue-100 wii-shadow overflow-x-auto scrollbar-hide max-w-full">
          <button onClick={() => { setViewMode('editor'); setChatHistory([]); }} className={`px-8 py-2 rounded-full font-bold text-sm transition-all whitespace-nowrap ${viewMode === 'editor' ? 'bg-blue-600 text-white' : 'text-blue-400 hover:text-blue-600'}`}>Maker</button>
          <button onClick={() => { setViewMode('city'); setChatHistory([]); }} className={`px-8 py-2 rounded-full font-bold text-sm transition-all whitespace-nowrap ${viewMode === 'city' ? 'bg-blue-600 text-white' : 'text-blue-400 hover:text-blue-600'}`}>Mii City ({city.length})</button>
          <button onClick={() => { setViewMode('games'); setChatHistory([]); }} className={`px-8 py-2 rounded-full font-bold text-sm transition-all whitespace-nowrap ${viewMode === 'games' ? 'bg-blue-600 text-white' : 'text-blue-400 hover:text-blue-600'}`}>Game Place</button>
          <button onClick={() => { setViewMode('shop'); setChatHistory([]); }} className={`px-8 py-2 rounded-full font-bold text-sm transition-all whitespace-nowrap ${viewMode === 'shop' ? 'bg-blue-600 text-white' : 'text-blue-400 hover:text-blue-600'}`}>Shop</button>
          <button onClick={() => { setViewMode('cinema'); setChatHistory([]); }} className={`px-8 py-2 rounded-full font-bold text-sm transition-all whitespace-nowrap ${viewMode === 'cinema' ? 'bg-blue-600 text-white' : 'text-blue-400 hover:text-blue-600'}`}>Cinema</button>
        </div>
        <div className="absolute top-0 right-0 bg-yellow-400 px-4 py-1 rounded-full font-black text-yellow-900 wii-shadow scale-90 md:scale-100 flex items-center gap-2">
           <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><circle cx="10" cy="10" r="10" /></svg>
           {score}
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
              <button onClick={handleGeneratePersonality} disabled={isGenerating} className="w-full max-w-xs py-4 px-6 rounded-full bg-blue-600 text-white font-bold text-lg wii-shadow wii-button flex items-center justify-center gap-2 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                Get Mii Personality
              </button>
            ) : personality && (
              <div className="w-full bg-white rounded-3xl p-6 wii-shadow border-4 border-blue-100 animate-in fade-in zoom-in duration-500">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-2xl font-bold text-blue-900">{personality.name}</h2>
                  <div className="flex gap-2"><span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-bold uppercase tracking-widest">{personality.zodiacSign}</span></div>
                </div>
                <p className="text-gray-500 italic mb-4">"{personality.catchphrase}"</p>
                <div className="space-y-4 text-left">
                  <div><h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">About</h4><p className="text-gray-700 leading-relaxed text-sm">{personality.biography}</p></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Hobbies</h4><ul className="text-xs text-blue-600 space-y-1">{personality.hobbies.map(h => <li key={h} className="bg-blue-50 px-2 py-0.5 rounded inline-block mr-1 mb-1">{h}</li>)}</ul></div>
                    <div><h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Fave Food</h4><p className="text-sm font-medium text-gray-800">{personality.favoriteFood}</p></div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 mt-6">
                   <button onClick={saveToCity} className="flex-1 min-w-[120px] py-2 text-xs font-bold bg-green-500 text-white hover:bg-green-600 rounded-xl wii-shadow wii-button flex items-center justify-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>Move to City</button>
                  <button onClick={() => setShowShareModal(true)} className="flex-1 min-w-[120px] py-2 text-xs font-bold bg-blue-500 text-white hover:bg-blue-600 rounded-xl wii-shadow wii-button flex items-center justify-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>Share</button>
                   <button onClick={() => setShowPassport(false)} className="w-full py-2 text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors uppercase tracking-widest mt-2">← Edit Face</button>
                </div>
              </div>
            )}
          </div>
          <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 md:p-8 wii-shadow h-fit border-2 border-white">
            <nav className="flex mb-8 bg-gray-100 p-1 rounded-2xl overflow-x-auto scrollbar-hide">
              {Object.values(EditorTab).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 min-w-[70px] py-2 text-xs md:text-sm font-bold rounded-xl transition-all ${activeTab === tab ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>{tab}</button>
              ))}
            </nav>
            <div className="min-h-[300px]">{renderTabContent()}</div>
          </div>
        </main>
      ) : viewMode === 'games' ? (
        <div className="flex-1 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="arcade-bg rounded-[40px] p-8 min-h-[70vh] wii-shadow border-4 border-white/20 relative overflow-hidden flex flex-col items-center">
             <div className="relative z-10 w-full text-center mb-8">
               <h2 className="text-5xl font-black neon-text italic uppercase tracking-tighter mb-2">Game Place</h2>
               <p className="text-cyan-400 font-bold">Play games to fill your vault!</p>
             </div>

             {activeGame === 'none' ? (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl relative z-10">
                 <button 
                  onClick={startGameCatcher}
                  className="group relative bg-white/10 hover:bg-white/20 backdrop-blur border-2 border-white/30 rounded-[40px] p-8 transition-all hover:scale-105 active:scale-95 flex flex-col items-center"
                 >
                   <div className="w-32 h-32 bg-yellow-400/20 rounded-full flex items-center justify-center mb-6 group-hover:animate-bounce">
                     <span className="text-6xl">🪙</span>
                   </div>
                   <h3 className="text-2xl font-black text-white mb-2 uppercase italic">Mii Catcher</h3>
                   <p className="text-blue-300 text-sm">Catch falling coins and avoid bombs!</p>
                   <div className="mt-6 px-8 py-3 bg-cyan-500 text-white font-black rounded-2xl shadow-lg shadow-cyan-500/50">PLAY NOW</div>
                 </button>
                 
                 <div className="group relative bg-white/5 border-2 border-white/10 rounded-[40px] p-8 flex flex-col items-center opacity-60">
                   <div className="w-32 h-32 bg-purple-400/10 rounded-full flex items-center justify-center mb-6">
                     <span className="text-6xl">🧩</span>
                   </div>
                   <h3 className="text-2xl font-black text-white/50 mb-2 uppercase italic">Memory Match</h3>
                   <p className="text-blue-300/50 text-sm">Coming Soon in next update!</p>
                   <div className="mt-6 px-8 py-3 bg-gray-600 text-white/50 font-black rounded-2xl cursor-not-allowed">LOCKED</div>
                 </div>
               </div>
             ) : (
               <div 
                ref={gameContainerRef}
                className="relative w-full max-w-2xl h-[500px] bg-black/40 rounded-3xl border-4 border-cyan-500/30 overflow-hidden cursor-none"
                onMouseMove={handleGameMouseMove}
                onTouchMove={handleGameMouseMove}
               >
                 <div className="absolute top-4 left-4 z-20 bg-white/10 backdrop-blur px-6 py-2 rounded-full border border-white/20">
                   <span className="text-cyan-400 font-black text-xl">SCORE: {gameScore}</span>
                 </div>
                 <button onClick={quitGame} className="absolute top-4 right-4 z-20 bg-red-500/20 hover:bg-red-500 text-white px-4 py-2 rounded-full font-bold transition-colors">QUIT</button>
                 
                 {!gameActive && (
                   <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm animate-in zoom-in duration-300">
                     <h3 className="text-6xl font-black text-red-500 mb-4 uppercase italic">GAME OVER</h3>
                     <p className="text-white text-xl mb-8 font-bold">You earned {gameScore} coins!</p>
                     <button onClick={quitGame} className="px-12 py-4 bg-cyan-500 text-white font-black text-2xl rounded-2xl wii-shadow hover:scale-110 transition-transform">CONTINUE</button>
                   </div>
                 )}

                 {/* Catcher */}
                 <div 
                  className="absolute bottom-4 h-24 w-24 flex flex-col items-center justify-center transition-all duration-75"
                  style={{ left: `${catcherPos}%`, transform: 'translateX(-50%)' }}
                 >
                   <div className="relative">
                    <MiiPreview features={features} size={80} />
                    <div className="absolute -bottom-2 -left-2 -right-2 h-4 bg-cyan-400/50 blur-md rounded-full" />
                   </div>
                 </div>

                 {/* Falling Items */}
                 {gameItems.map(item => (
                   <div 
                    key={item.id} 
                    className="absolute text-3xl select-none"
                    style={{ left: `${item.x}%`, top: `${item.y}%`, transform: 'translateX(-50%)' }}
                   >
                     {item.type === 'coin' ? '🪙' : item.type === 'star' ? '⭐' : '💣'}
                   </div>
                 ))}
               </div>
             )}
           </div>
        </div>
      ) : viewMode === 'shop' ? (
        <div className="flex-1 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="bg-white/40 backdrop-blur-md rounded-[40px] p-8 min-h-[60vh] wii-shadow border-4 border-white/50 relative overflow-hidden">
             <div className="flex justify-between items-center mb-12 relative z-10"><div><h2 className="text-3xl font-extrabold text-blue-900">Mii Boutique</h2><p className="text-blue-600 text-sm">Unlock premium colors with your hard-earned coins!</p></div></div>
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
               {SHOP_ITEMS.map(item => {
                 const isUnlocked = unlockedItems.includes(item.id);
                 const canAfford = score >= item.price;
                 return (
                   <div key={item.id} className="bg-white p-6 rounded-3xl wii-shadow border-4 border-blue-50 flex flex-col items-center">
                     <div className="w-20 h-20 rounded-2xl mb-4 shadow-inner flex items-center justify-center" style={{ backgroundColor: item.value }}>{isUnlocked && <svg className="text-white w-10 h-10 drop-shadow-md" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>}</div>
                     <h3 className="font-bold text-blue-900 mb-1">{item.name}</h3>
                     <p className="text-xs text-gray-400 uppercase tracking-widest mb-4">{item.type.replace('Color', '')}</p>
                     {isUnlocked ? <span className="text-green-500 font-black text-sm uppercase">Unlocked!</span> : <button onClick={() => handleBuyItem(item)} disabled={!canAfford} className={`w-full py-3 rounded-2xl font-black transition-all ${canAfford ? 'bg-yellow-400 text-yellow-900 hover:bg-yellow-500 active:scale-95' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>{item.price} COINS</button>}
                   </div>
                 );
               })}
             </div>
           </div>
        </div>
      ) : viewMode === 'cinema' ? (
        <div className="flex-1 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="bg-[#1a1a1a] rounded-[40px] min-h-[70vh] wii-shadow border-8 border-gray-800 relative overflow-hidden flex flex-col items-center p-8">
             {!isCurtainOpen && (
               <div className="absolute inset-0 z-30 flex pointer-events-none">
                  <div className="flex-1 bg-red-800 border-r-4 border-red-900 shadow-2xl relative" />
                  <div className="flex-1 bg-red-800 border-l-4 border-red-900 shadow-2xl relative" />
               </div>
             )}
             <div className="relative z-10 w-full max-w-4xl flex flex-col items-center">
                <div className="mb-8 text-center">
                   <h2 className="text-4xl font-black text-white mb-2">Mii Cinema</h2>
                   <p className="text-blue-400 font-bold">Search and watch to earn <span className="text-yellow-400">500 Coins</span>!</p>
                </div>
                <form onSubmit={handleCinemaSearch} className="w-full max-w-xl flex gap-2 mb-8 animate-in slide-in-from-top-4 duration-500">
                   <input 
                     type="text" 
                     value={cinemaSearch}
                     onChange={(e) => setCinemaSearch(e.target.value)}
                     placeholder="Search videos or paste YouTube link..." 
                     className="flex-1 p-4 bg-gray-900 border-2 border-gray-700 rounded-2xl text-white font-bold focus:outline-none focus:border-blue-500 transition-colors"
                   />
                   <button 
                     type="submit"
                     disabled={isSearchingCinema}
                     className="bg-blue-600 text-white px-6 rounded-2xl font-black wii-shadow wii-button flex items-center gap-2 disabled:bg-gray-700"
                   >
                     {isSearchingCinema ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'SEARCH'}
                   </button>
                </form>
                {!activeVideo ? (
                  <div className="w-full space-y-8 animate-in fade-in zoom-in duration-500">
                    <section>
                      <h3 className="text-white/40 font-black uppercase tracking-widest text-xs mb-4">Results & Recommendations</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {cinemaResults.map(video => (
                          <button 
                            key={video.id} 
                            onClick={() => handleVideoSelect(video.id)}
                            className="group flex flex-col items-center"
                          >
                            <div className="relative w-full aspect-video bg-gray-900 rounded-2xl overflow-hidden border-4 border-white/10 group-hover:border-blue-500 transition-all wii-shadow">
                               <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                               <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"/></svg>
                               </div>
                            </div>
                            <span className="mt-3 text-white font-bold text-xs text-center line-clamp-2 group-hover:text-blue-400">{video.title}</span>
                          </button>
                        ))}
                      </div>
                    </section>
                  </div>
                ) : (
                  <div className="w-full max-w-[640px] aspect-video bg-black rounded-3xl overflow-hidden wii-shadow border-8 border-gray-700 relative">
                    <div id="youtube-player" className="w-full h-full" />
                    <button 
                      onClick={() => { setActiveVideo(null); setIsCurtainOpen(false); }}
                      className="absolute -top-12 right-0 text-white/50 hover:text-white font-bold flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                      Close
                    </button>
                  </div>
                )}
             </div>
             {!activeVideo && (
               <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4 px-8 opacity-40 transition-all pointer-events-none">
                  {city.slice(0, 8).map((mii, i) => (
                    <div key={i} className="transform scale-[0.6] origin-bottom animate-sway" style={{ animationDelay: `${i*0.2}s` }}>
                       <MiiPreview features={mii.features} size={100} />
                    </div>
                  ))}
               </div>
             )}
             <div className="absolute top-20 left-10 text-4xl popcorn-float opacity-20">🍿</div>
           </div>
        </div>
      ) : viewMode === 'home' && selectedCityMii ? (
        <div className="flex-1 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white/40 backdrop-blur-md rounded-[40px] p-8 min-h-[70vh] wii-shadow border-4 border-white/50 relative overflow-hidden flex flex-col">
            <div className="absolute inset-0 pointer-events-none perspective-room">
               <div className="absolute inset-0 bg-white/20 room-wall translate-z-[-200px]" />
               <div className="absolute bottom-0 w-full h-1/3 bg-white/10 border-t border-white/20 origin-bottom skew-x-[5deg] origin-left" />
               <div className="absolute bottom-0 w-full h-1/3 bg-white/5 border-t border-white/20 origin-bottom skew-x-[-5deg] origin-right" />
               <div className="absolute top-20 left-[15%] text-6xl opacity-30 animate-sway">{getHobbyIcon(selectedCityMii.personality.hobbies[0])}</div>
               <div className="absolute top-40 right-[15%] text-4xl opacity-20 animate-sparkle">{getHobbyIcon(selectedCityMii.personality.hobbies[1])}</div>
               <div className="absolute bottom-20 left-[10%] text-5xl opacity-40">🛋️</div>
               <div className="absolute bottom-24 right-[12%] text-5xl opacity-40">🌵</div>
            </div>
            <div className="relative z-10 flex justify-between items-start mb-12">
               <div>
                  <button onClick={() => { setViewMode('city'); setSelectedCityMii(null); }} className="text-blue-600 font-bold flex items-center gap-2 hover:text-blue-800 transition-colors mb-2">← Back to Plaza</button>
                  <h2 className="text-4xl font-extrabold text-blue-900">{selectedCityMii.personality.name}'s Home</h2>
               </div>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center relative z-10">
               <div onClick={() => triggerMiiJump(selectedCityMii!.id)} className={`cursor-pointer transition-transform hover:scale-105 active:scale-95 ${jumpingMiiIds.has(selectedCityMii.id) ? 'animate-mii-jump' : 'animate-gentle-bob'}`}>
                 <MiiPreview features={selectedCityMii.features} size={300} />
               </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white/40 backdrop-blur-md rounded-[40px] p-8 min-h-[60vh] wii-shadow border-4 border-white/50 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
               {coinPosition && <div onClick={handleCoinClick} className="absolute pointer-events-auto cursor-pointer z-[50] animate-bounce w-8 h-8 flex items-center justify-center" style={{ left: `${coinPosition.x}%`, top: `${coinPosition.y}%` }}><div className="w-6 h-6 bg-yellow-400 rounded-full border-2 border-yellow-600 shadow-lg flex items-center justify-center text-yellow-800 font-bold text-[10px] animate-rainbow">$</div></div>}
               <div className="absolute bottom-10 left-1/2 -translate-x-1/2 opacity-30 cursor-pointer pointer-events-auto hover:opacity-50 transition-all group"><svg width="120" height="80" viewBox="0 0 120 80"><ellipse cx="60" cy="70" rx="60" ry="12" fill="#94a3b8" /><ellipse cx="60" cy="65" rx="50" ry="10" fill="#cbd5e1" /><rect x="55" y="45" width="10" height="20" fill="#94a3b8" /><ellipse cx="60" cy="45" rx="25" ry="6" fill="#cbd5e1" /><path d="M60,45 Q40,15 25,45" stroke={fountainSurge ? "#3b82f6" : "#bae6fd"} strokeWidth={fountainSurge ? "4" : "2.5"} fill="none" className="animate-fountain" /><path d="M60,45 Q80,15 95,45" stroke={fountainSurge ? "#3b82f6" : "#bae6fd"} strokeWidth={fountainSurge ? "4" : "2.5"} fill="none" className="animate-fountain [animation-delay:0.3s]" /><path d="M60,45 Q60,5 60,45" stroke={fountainSurge ? "#3b82f6" : "#bae6fd"} strokeWidth={fountainSurge ? "4" : "2.5"} fill="none" className="animate-fountain [animation-delay:0.6s]" />{fountainSurge && <circle cx="60" cy="20" r="10" fill="white" className="animate-ping opacity-75" />}</svg><div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-[8px] font-bold px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">TOUCH!</div></div>
            </div>
            <div className="flex justify-between items-center mb-12 relative z-10"><div><h2 className="text-3xl font-extrabold text-blue-900">Mii Plaza</h2><p className="text-blue-600 text-sm">Tap a friend to visit their home!</p></div><button onClick={() => setViewMode('editor')} className="bg-blue-500 text-white px-6 py-2 rounded-full font-bold text-sm wii-shadow wii-button">+ Create New</button></div>
            {city.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center relative z-10"><div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-4"><svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg></div><h3 className="text-xl font-bold text-blue-800">Your city is empty!</h3><p className="text-blue-400 mt-1">Go to the Maker to invite some Miis.</p></div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-y-16 gap-x-6 relative z-10 pb-12">
                {city.map(mii => (
                  <div key={mii.id} onClick={() => { triggerMiiJump(mii.id); setSelectedCityMii(mii); setChatHistory([{ role: 'mii', text: `Hi there! ${mii.personality.catchphrase}` }]); }} className={`flex flex-col items-center group cursor-pointer animate-in zoom-in duration-300 relative ${jumpingMiiIds.has(mii.id) ? 'animate-mii-jump' : (selectedCityMii?.id === mii.id ? 'animate-gentle-bob' : '')}`}>
                    {randomTalker?.id === mii.id && <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-white border-4 border-blue-500 px-4 py-2 rounded-2xl wii-shadow z-50 animate-bounce whitespace-nowrap"><div className="text-blue-600 font-extrabold text-xs">{randomTalker.text}</div><div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-r-4 border-b-4 border-blue-500 rotate-45" /></div>}
                    <div className="relative transform transition-transform group-hover:scale-110 group-hover:-translate-y-2"><div className="absolute -bottom-2 w-12 h-4 bg-black/5 rounded-[100%] blur-sm opacity-0 group-hover:opacity-100 transition-opacity" /><MiiPreview features={mii.features} size={120} /></div>
                    <span className="mt-2 text-sm font-bold text-blue-900 bg-white/80 px-3 py-1 rounded-full wii-shadow">{mii.personality.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {selectedCityMii && viewMode === 'city' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-blue-900/60 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-[40px] p-8 wii-shadow border-[10px] border-blue-100 animate-slide-up relative flex flex-col items-center overflow-visible">
              <button onClick={() => { setSelectedCityMii(null); setChatHistory([]); endVoiceCall(); }} className="absolute top-4 right-4 text-blue-200 hover:text-blue-500 transition-colors z-20 p-2"><svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
              <div className="flex flex-col lg:flex-row gap-8 w-full h-full overflow-hidden">
                <div className="lg:w-1/3 flex flex-col items-center">
                  <div onClick={() => triggerMiiJump(selectedCityMii.id)} className={`bg-blue-50 rounded-full p-6 border-4 border-white shadow-inner mb-4 cursor-pointer hover:bg-blue-100 transition-colors ${jumpingMiiIds.has(selectedCityMii.id) ? 'animate-mii-jump' : 'animate-gentle-bob'}`}><MiiPreview features={selectedCityMii.features} size={160} /></div>
                  <h2 className="text-3xl font-extrabold text-blue-900 mb-1 text-center">{selectedCityMii.personality.name}</h2>
                  <p className="text-blue-500 font-bold italic mb-6 text-center">"{selectedCityMii.personality.catchphrase}"</p>
                  <div className="flex flex-col gap-2 w-full mt-4">
                    <button onClick={() => goToMiiHome(selectedCityMii!)} className="w-full py-4 bg-yellow-400 text-yellow-900 font-black rounded-2xl wii-shadow wii-button flex items-center justify-center gap-2">🏠 VISIT HOME</button>
                    <div className="flex gap-2">
                       <button onClick={() => editMii(selectedCityMii!)} className="flex-1 py-3 bg-blue-100 text-blue-600 font-bold rounded-2xl wii-button text-xs">Style</button>
                       <button onClick={() => deleteFromCity(selectedCityMii!.id)} className="flex-1 py-3 bg-red-50 text-red-400 font-bold rounded-2xl wii-button text-xs">Delete</button>
                    </div>
                  </div>
                </div>

                <div className="lg:w-2/3 flex flex-col h-[50vh] lg:h-[60vh] bg-blue-50/50 rounded-[30px] border-4 border-white p-4 relative overflow-hidden">
                    <div className="flex-1 overflow-y-auto pr-2 space-y-4 mb-4 scrollbar-hide">
                      {chatHistory.map((msg, idx) => (
                        <div key={idx} className={`flex flex-col ${msg.role === 'mii' ? 'items-start' : 'items-end'} animate-in slide-in-from-bottom-2 duration-300`}><div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm font-bold relative ${msg.role === 'mii' ? 'bg-white text-blue-900 border-2 border-blue-200 rounded-bl-none shadow-sm' : 'bg-blue-600 text-white rounded-br-none shadow-blue-200'}`}>{msg.text}<div className={`absolute bottom-0 w-3 h-3 ${msg.role === 'mii' ? '-left-1 bg-white border-l-2 border-b-2 border-blue-200' : '-right-1 bg-blue-600'} rotate-45 -z-10`} /></div></div>
                      ))}
                      {isTalking && <div className="flex items-start"><div className="bg-white border-2 border-blue-100 px-4 py-3 rounded-2xl shadow-sm"><div className="flex gap-1"><div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" /><div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]" /><div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:0.4s]" /></div></div></div>}
                      <div ref={chatEndRef} />
                    </div>
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                      <input type="text" value={userInput} onChange={(e) => setUserInput(e.target.value)} placeholder={`Say something to ${selectedCityMii.personality.name}...`} className="flex-1 p-4 bg-white rounded-2xl border-2 border-blue-100 text-sm focus:outline-none focus:border-blue-400 transition-colors wii-shadow font-bold text-blue-900 placeholder-blue-200" />
                      <button type="submit" disabled={isTalking || !userInput.trim()} className="bg-yellow-400 text-yellow-900 px-6 rounded-2xl font-black wii-shadow wii-button disabled:opacity-50">SEND</button>
                    </form>
                </div>
              </div>
           </div>
        </div>
      )}
      <footer className="mt-auto text-center text-blue-300 text-[10px] font-bold uppercase tracking-widest py-8">&copy; 2025 Mii Maker AI &bull; Parody App</footer>
    </div>
  );
};

export default App;