import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Heart, 
  Shield, 
  TrendingUp, 
  Calendar, 
  Sparkles,
  BarChart3,
  Settings,
  Moon,
  Sun,
  Newspaper,
  Users,
  UserPlus,
  UserCheck
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { format } from 'date-fns';
import './App.css';

const COLORS = {
  very_positive: '#10B981',
  positive: '#34D399', 
  neutral: '#6B7280',
  negative: '#F59E0B',
  very_negative: '#EF4444'
};

const EMOTION_ICONS = {
  joy: '😊',
  sadness: '😢',
  anger: '😠',
  fear: '😨',
  surprise: '😲',
  disgust: '🤢'
};

export default function App() {
  const [entry, setEntry] = useState("");
  const [entries, setEntries] = useState([]);
  const [nextPrompt, setNextPrompt] = useState("What's on your mind today?");
  const [weeklySummary, setWeeklySummary] = useState("");
  const [insights, setInsights] = useState(null);
  const [trends, setTrends] = useState([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currentView, setCurrentView] = useState('journal');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [chatHistory, setChatHistory] = useState({});
  const [selectedDate, setSelectedDate] = useState(null);
  const [dailyChats, setDailyChats] = useState([]);
  const [hashtags, setHashtags] = useState([]);
  const [selectedHashtag, setSelectedHashtag] = useState(null);
  const [hashtagChats, setHashtagChats] = useState([]);
  const [aiPrompts, setAiPrompts] = useState([]);

  const loadInitialData = useCallback(async () => {
    try {
      console.log('Loading initial data, connection status:', connectionStatus);
      // Always try to load data, regardless of connection status
      if (connectionStatus === 'connected' || connectionStatus === 'disconnected') {
        const [entriesRes, insightsRes, trendsRes, dailyChatsRes, hashtagsRes] = await Promise.all([
          fetch("/api/entries"),
          fetch("/api/insights"),
          fetch("/api/sentiment-trends"),
          fetch("/api/chats/daily").catch(err => {
            console.warn('Daily chats API failed, using fallback:', err);
            return { json: () => [] };
          }),
          fetch("/api/hashtags").catch(err => {
            console.warn('Hashtags API failed, using fallback:', err);
            return { json: () => [] };
          })
        ]);

        const [entriesData, insightsData, trendsData, dailyChatsData, hashtagsData, promptsData] = await Promise.all([
          entriesRes.json(),
          insightsRes.json(),
          trendsRes.json(),
          dailyChatsRes.json(),
          hashtagsRes.json(),
          fetch('/api/ai-prompts').then(res => res.json())
        ]);

        setEntries(entriesData);
        setInsights(insightsData);
        console.log('Setting trends data:', trendsData);
        setTrends(trendsData.data || []);
        setDailyChats(dailyChatsData);
        setHashtags(hashtagsData);
        setAiPrompts(promptsData.prompts || []);
        
        // Debug logging
        console.log('Loaded data:', {
          entries: entriesData.length,
          insights: insightsData,
          trends: trendsData.data?.length || 0,
          dailyChats: dailyChatsData.length,
          hashtags: hashtagsData.length,
          prompts: promptsData.prompts?.length || 0
        });
        
        // Debug first entry structure
        if (entriesData.length > 0) {
          console.log('First entry structure:', entriesData[0]);
        }
        if (dailyChatsData.length > 0) {
          console.log('First daily chat structure:', dailyChatsData[0]);
        }
      } else {
        // Load from localStorage for offline mode
        const savedEntries = localStorage.getItem('journalEntries');
        if (savedEntries) {
          setEntries(JSON.parse(savedEntries));
        }
      }
    } catch (err) {
      console.error("❌ Error loading data:", err);
      // Load from localStorage for offline mode
      const savedEntries = localStorage.getItem('journalEntries');
      if (savedEntries) {
        setEntries(JSON.parse(savedEntries));
      }
    }
  }, [connectionStatus]);

  // Check backend connection on startup
  useEffect(() => {
    checkBackendConnection();
  }, []);

  // Load data when connection status changes
  useEffect(() => {
    console.log('Connection status changed to:', connectionStatus);
    if (connectionStatus !== 'checking') {
      loadInitialData();
    }
  }, [connectionStatus, loadInitialData]);

  // Also try to load data after a delay, in case connection check is slow
  useEffect(() => {
    const timer = setTimeout(() => {
      if (connectionStatus === 'checking') {
        console.log('Connection check taking too long, trying to load data anyway');
        loadInitialData();
      }
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [connectionStatus, loadInitialData]);

  // Auto-advance carousel
  useEffect(() => {
    if (!isAutoPlaying || currentView !== 'journal') return;
    
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % 5); // 5 resource sets
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, currentView]);

  const checkBackendConnection = async () => {
    try {
      console.log('Checking backend connection...');
      const response = await fetch("/api/health");
      if (response.ok) {
        console.log('Backend connected successfully');
        setConnectionStatus('connected');
      } else {
        console.log('Backend responded with error:', response.status);
        setConnectionStatus('disconnected');
      }
    } catch (error) {
      console.log("Backend not running, using offline mode:", error);
      setConnectionStatus('offline');
    }
  };

  // Carousel navigation functions
  const goToSlide = (index) => {
    setCurrentSlide(index);
    setIsAutoPlaying(false);
    // Resume auto-play after 10 seconds of manual navigation
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const goToPrevious = () => {
    const prevIndex = currentSlide === 0 ? 4 : currentSlide - 1;
    goToSlide(prevIndex);
  };

  const goToNext = () => {
    const nextIndex = (currentSlide + 1) % 5;
    goToSlide(nextIndex);
  };

  // Chat history functionality
  const viewChatHistory = async (timestamp) => {
    const date = new Date(timestamp);
    const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    try {
      if (connectionStatus === 'connected') {
        const response = await fetch(`/api/chat-history/${dateKey}`);
        if (response.ok) {
          const history = await response.json();
          setChatHistory(prev => ({ ...prev, [dateKey]: history }));
          setSelectedDate(dateKey);
        }
      } else {
        // For offline mode, get from localStorage
        const savedHistory = localStorage.getItem(`chatHistory_${dateKey}`);
        if (savedHistory) {
          setChatHistory(prev => ({ ...prev, [dateKey]: JSON.parse(savedHistory) }));
          setSelectedDate(dateKey);
        }
      }
    } catch (error) {
      console.error('Error fetching chat history:', error);
    }
  };

  const viewDailyChats = (dayData) => {
    setChatHistory(dayData.chats);
    setSelectedDate(dayData.date);
  };

  const viewHashtagChats = async (hashtag) => {
    try {
      const response = await fetch(`/api/chats/hashtag/${hashtag}`);
      if (response.ok) {
        const hashtagData = await response.json();
        setHashtagChats(hashtagData);
        setSelectedHashtag(hashtag);
      }
    } catch (error) {
      console.error('Error loading hashtag chats:', error);
    }
  };


  // Simple sentiment analysis for offline mode
  const analyzeSentimentOffline = (text) => {
    const positiveWords = /happy|great|excited|joy|love|amazing|wonderful|fantastic|good|positive|grateful|blessed/i;
    const negativeWords = /sad|angry|stressed|bad|tired|worried|anxious|frustrated|upset|terrible|awful|horrible/i;
    
    let sentiment = 'neutral';
    let emotions = [];
    
    if (positiveWords.test(text)) {
      sentiment = 'positive';
      emotions.push('joy');
    } else if (negativeWords.test(text)) {
      sentiment = 'negative';
      emotions.push('sadness');
    }
    
    if (/work|job|career|office/i.test(text)) emotions.push('work');
    if (/family|friend|relationship/i.test(text)) emotions.push('relationships');
    if (/health|exercise|gym/i.test(text)) emotions.push('health');
    if (/creative|art|music|write/i.test(text)) emotions.push('creativity');
    
    return {
      sentiment,
      emotions,
      themes: emotions.filter(e => e !== 'joy' && e !== 'sadness')
    };
  };

  const analyzeEntry = async () => {
    if (!entry.trim()) {
      alert("Please write something before saving!");
      return;
    }

    setIsAnalyzing(true);
    
    try {
      if (connectionStatus === 'connected') {
        // Use backend API
        const sentimentRes = await fetch("/api/sentiment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            text: entry,
            timestamp: new Date().toISOString() // Send timestamp to preserve it
          }),
        });
        const sentimentData = await sentimentRes.json();

        setEntries(prev => [sentimentData, ...prev]);
        setLastAnalysis(sentimentData);

        // Get empathetic prompt
        const promptRes = await fetch("/api/prompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            text: entry, 
            sentiment: sentimentData.sentiment,
            emotions: sentimentData.emotions 
          }),
        });
        const promptData = await promptRes.json();
        setNextPrompt(promptData.prompt);

        // Refresh insights
        const insightsRes = await fetch("/api/insights");
        const insightsData = await insightsRes.json();
        setInsights(insightsData);

        // Reload all data to update Recent Chats immediately
        await loadInitialData();
      } else {
        // Use offline analysis
        const analysis = analyzeSentimentOffline(entry);
        const newEntry = {
          id: Date.now(),
          text: entry.trim(),
          sentiment: analysis.sentiment,
          emotions: analysis.emotions,
          themes: analysis.themes,
          ts: new Date().toISOString(),
          wordCount: entry.trim().split(/\s+/).length
        };

        setEntries(prev => [newEntry, ...prev]);
        setLastAnalysis(newEntry);
        
        // Generate simple prompt
        const prompts = {
          positive: "That sounds wonderful! What made today feel so good?",
          negative: "I hear you. What's one small thing that helped you today?",
          neutral: "How are you feeling about everything right now?"
        };
        setNextPrompt(prompts[analysis.sentiment] || "What's on your mind today?");
        
        // Save to localStorage
        const updatedEntries = [newEntry, ...entries];
        localStorage.setItem('journalEntries', JSON.stringify(updatedEntries));
      }

      setEntry("");
    } catch (err) {
      console.error("❌ Error analyzing entry:", err);
      alert("Error analyzing entry. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const fetchSummary = async () => {
    try {
      if (connectionStatus === 'connected') {
        const res = await fetch("/api/summary");
        const data = await res.json();
        setWeeklySummary(data.summary);
      } else {
        // Generate simple summary for offline mode
        if (entries.length === 0) {
          setWeeklySummary("No entries yet to summarize.");
          return;
        }
        
        const recentEntries = entries.slice(0, 7); // Last 7 entries
        const sentimentCounts = recentEntries.reduce((acc, e) => {
          acc[e.sentiment] = (acc[e.sentiment] || 0) + 1;
          return acc;
        }, {});
        
        const totalEntries = recentEntries.length;
        const positiveCount = sentimentCounts.positive || 0;
        const negativeCount = sentimentCounts.negative || 0;
        
        let summary = `This week, you wrote ${totalEntries} entries. `;
        
        if (positiveCount > negativeCount) {
          summary += "🌟 You've had more positive moments than challenging ones.";
        } else if (negativeCount > positiveCount) {
          summary += "💙 This week seems challenging. Remember, it's okay to not be okay.";
        } else {
          summary += "⚖️ Your emotional landscape shows balance - both ups and downs are part of the journey.";
        }
        
        setWeeklySummary(summary);
      }
    } catch (err) {
      console.error("❌ Error fetching summary:", err);
      setWeeklySummary("Error fetching summary.");
    }
  };

  const getSentimentColor = (sentiment) => COLORS[sentiment] || COLORS.neutral;
  const getSentimentEmoji = (sentiment) => {
    const emojis = {
      very_positive: '🌟',
      positive: '😊',
      neutral: '😐',
      negative: '😔',
      very_negative: '😢'
    };
    return emojis[sentiment] || '😐';
  };

  const safeFormatDate = (dateValue, formatString, fallback = 'Unknown') => {
    try {
      if (!dateValue) return fallback;
      
      // Handle date-only strings (like "2025-09-04") by adding time to avoid timezone issues
      let date;
      if (typeof dateValue === 'string' && dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Date-only string, add noon time to avoid timezone issues
        date = new Date(dateValue + 'T12:00:00');
      } else {
        date = new Date(dateValue);
      }
      
      if (isNaN(date.getTime())) return fallback;
      return format(date, formatString);
    } catch (error) {
      console.warn('Date formatting error:', error, 'for value:', dateValue);
      return fallback;
    }
  };

  const renderJournalView = () => (
    <div className="journal-container">

      {/* Privacy Indicator - Centered */}
      <motion.div 
        className="privacy-banner privacy-banner-centered"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Shield className="privacy-icon" />
        <span>Your data stays private • {connectionStatus === 'connected' ? 'Cloud-based AI processing' : 'Local analysis only'}</span>
      </motion.div>

      {/* Dynamic Prompt */}
      <motion.div 
        className="prompt-container"
        key={nextPrompt}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="prompt-header">
          <Sparkles className="prompt-icon" />
          <span className="companion-message">Sam, your AI companion here.</span>
        </div>
        <p className="prompt-text">{nextPrompt}</p>
      </motion.div>

      {/* Journal Input */}
      <div className="input-container">
        <textarea
          rows="6"
          placeholder="Share your thoughts, feelings, or experiences..."
          value={entry}
          onChange={(e) => setEntry(e.target.value)}
          className="journal-textarea"
        />
        <motion.button 
          onClick={analyzeEntry}
          disabled={isAnalyzing}
          className="analyze-button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {isAnalyzing ? (
            <motion.div 
              className="loading-spinner"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          ) : (
            <>
              <Heart size={16} />
              Reflect
            </>
          )}
        </motion.button>
      </div>

      {/* Last Analysis Result */}
      <AnimatePresence>
        {lastAnalysis && (
          <motion.div 
            className="analysis-result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="sentiment-display">
              <span className="sentiment-emoji">{getSentimentEmoji(lastAnalysis.sentiment)}</span>
              <span className="sentiment-label">{lastAnalysis.sentiment.replace('_', ' ')}</span>
            </div>
            {lastAnalysis.emotions && lastAnalysis.emotions.length > 0 && (
              <div className="emotions-display">
                {lastAnalysis.emotions.map(emotion => (
                  <span key={emotion} className="emotion-tag">
                    {EMOTION_ICONS[emotion]} {emotion}
                  </span>
                ))}
              </div>
            )}
            {lastAnalysis.themes && lastAnalysis.themes.length > 0 && (
              <div className="themes-display">
                {lastAnalysis.themes.map(theme => (
                  <span key={theme} className="theme-tag">#{theme}</span>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hashtag Filter */}
      {hashtags.length > 0 && (
        <div className="hashtag-filter">
          <h4>Filter by Theme:</h4>
          <div className="hashtag-buttons">
            {hashtags.map(hashtag => (
              <button
                key={hashtag}
                className={`hashtag-btn ${selectedHashtag === hashtag ? 'active' : ''}`}
                onClick={() => viewHashtagChats(hashtag)}
              >
                #{hashtag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recent Chats */}
      <div className="recent-entries">
        <h3>Recent Chats</h3>
        <div className="entries-list">
          {(dailyChats.length > 0 ? dailyChats : entries).slice(0, 5).map((item, index) => {
            // Handle both daily chats structure and regular entries structure
            const isDailyChat = item.thumbnail;
            const entry = isDailyChat ? item.thumbnail : item;
            
            // Get timestamp - handle different field names
            const timestamp = entry.timestamp || entry.ts;
            const date = isDailyChat ? item.displayDate : safeFormatDate(timestamp, 'MMM d, yyyy', 'Unknown Date');
            const time = safeFormatDate(timestamp, 'h:mm a', 'Unknown Time');
            const chatCount = isDailyChat ? item.chats.length : 1;
            
            return (
              <motion.div 
                key={isDailyChat ? item.date : entry.id}
                className="entry-item clickable-entry"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                onClick={() => isDailyChat ? viewDailyChats(item) : viewChatHistory(timestamp)}
              >
                <div className="entry-header">
                  <span className="entry-date">
                    {date} {time}
                  </span>
                  <span 
                    className="entry-sentiment"
                    style={{ color: getSentimentColor(entry.sentiment) }}
                  >
                    {getSentimentEmoji(entry.sentiment)} {entry.sentiment.replace('_', ' ')}
                  </span>
                </div>
                <p className="entry-text">{entry.text || entry.userInput}</p>
                {entry.themes && entry.themes.length > 0 && (
                  <div className="entry-themes">
                    {entry.themes.map(theme => (
                      <span key={theme} className="theme-badge">#{theme}</span>
                    ))}
                  </div>
                )}
                <div className="entry-meta">
                  <span className="chat-count">{chatCount} chat{chatCount > 1 ? 's' : ''}</span>
                  <span className="click-hint">Click to view chat history</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Weekly Reflections */}
      <div className="summary-section">
        <h3>Weekly Reflections</h3>
        <button onClick={fetchSummary} className="summary-button">
          <Calendar size={16} />
          Generate Weekly Reflections
        </button>
        {weeklySummary && (
          <motion.div 
            className="summary-content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {weeklySummary}
          </motion.div>
        )}
      </div>

      {/* Chat History Modal */}
      <AnimatePresence>
        {selectedDate && (
          <motion.div 
            className="chat-history-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setSelectedDate(null);
              setSelectedHashtag(null);
            }}
          >
            <motion.div 
              className="chat-history-content"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="chat-history-header">
                <h3>
                  {selectedHashtag ? `Chats tagged #${selectedHashtag}` : 
                   `Chat History - ${safeFormatDate(selectedDate, 'MMMM d, yyyy', 'Unknown Date')}`}
                </h3>
                <button 
                  className="close-button"
                  onClick={() => {
                    setSelectedDate(null);
                    setSelectedHashtag(null);
                  }}
                >
                  ×
                </button>
              </div>
              <div className="chat-history-list">
                {(selectedHashtag ? hashtagChats : chatHistory).map((chat, index) => (
                  <div key={index} className="chat-entry">
                    {/* Show conversation if available, otherwise show old format */}
                    {chat.conversation ? (
                      chat.conversation.map((message, msgIndex) => (
                        <div key={msgIndex} className={`chat-message ${message.role}`}>
                          <div className="chat-time">
                            {safeFormatDate(message.timestamp, 'h:mm a', 'Unknown Time')}
                          </div>
                          <div className="chat-content">
                            <div className="chat-role">{message.role === 'user' ? 'You' : 'Sam'}</div>
                            <div className="chat-text">{message.text}</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="chat-message">
                        <div className="chat-time">
                          {safeFormatDate(chat.timestamp || chat.ts, 'h:mm a', 'Unknown Time')}
                        </div>
                        <div className="chat-content">
                          <div className="chat-role">You</div>
                          <div className="chat-text">{chat.text || chat.userInput}</div>
                          {chat.analysis && (
                            <div className="chat-analysis">
                              <span className="sentiment-badge">{getSentimentEmoji(chat.analysis.sentiment)} {chat.analysis.sentiment}</span>
                              {chat.analysis.themes && (
                                <div className="chat-themes">
                                  {chat.analysis.themes.map(theme => (
                                    <span key={theme} className="theme-tag">#{theme}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const renderMentalHealthResources = () => {
    const resourceSets = [
      {
        title: "📚 Getting Started",
        resources: [
          {
            title: "APA Guide to Journaling",
            source: "apa.org",
            link: "https://www.apa.org/topics/journaling",
            description: "Learn the psychological benefits of journaling from the American Psychological Association."
          },
          {
            title: "The Science Behind Journaling",
            source: "psychologytoday.com", 
            link: "https://www.psychologytoday.com/us/blog/the-mindful-self-express/201403/the-science-behind-journaling",
            description: "Discover the research-backed benefits of expressive writing."
          }
        ]
      },
      {
        title: "🧠 Mental Health Benefits",
        resources: [
          {
            title: "NIMH Mental Health Care",
            source: "nimh.nih.gov",
            link: "https://www.nimh.nih.gov/health/topics/caring-for-your-mental-health",
            description: "National Institute of Mental Health resources for mental wellness."
          },
          {
            title: "CDC Mental Health Resources",
            source: "cdc.gov",
            link: "https://www.cdc.gov/mentalhealth/learn/index.htm",
            description: "Centers for Disease Control mental health information and resources."
          }
        ]
      },
      {
        title: "✍️ Journaling Techniques",
        resources: [
          {
            title: "How to Start Journaling",
            source: "verywellmind.com",
            link: "https://www.verywellmind.com/how-to-start-journaling-4582453",
            description: "Step-by-step guide to beginning your journaling practice."
          },
          {
            title: "Mayo Clinic Journaling Guide",
            source: "mayoclinic.org",
            link: "https://www.mayoclinic.org/healthy-lifestyle/stress-management/in-depth/journaling/art-20048655",
            description: "Medical perspective on journaling for stress management."
          }
        ]
      },
      {
        title: "🎯 Best Practices",
        resources: [
          {
            title: "Writing for Healing",
            source: "health.harvard.edu",
            link: "https://www.health.harvard.edu/blog/writing-can-help-us-heal-from-trauma-2020052219799",
            description: "Harvard Health insights on therapeutic writing practices."
          },
          {
            title: "Journaling for Mental Health",
            source: "psychology.org",
            link: "https://www.psychology.org/resources/journaling-for-mental-health/",
            description: "Comprehensive guide to mental health journaling techniques."
          }
        ]
      },
      {
        title: "💡 Quick Tips",
        resources: [
          {
            title: "Daily Practice",
            source: "Expert Tip",
            link: "#",
            description: "Write for 15-20 minutes daily for best results. Consistency is key to building a beneficial habit."
          },
          {
            title: "Focus on Emotions",
            source: "Expert Tip", 
            link: "#",
            description: "Focus on emotions and thoughts, not just events. This helps process feelings more effectively."
          },
          {
            title: "Be Authentic",
            source: "Expert Tip",
            link: "#", 
            description: "Be honest and authentic in your writing. Don't worry about grammar or structure - just express yourself."
          },
          {
            title: "Reflect & Grow",
            source: "Expert Tip",
            link: "#",
            description: "Reflect on patterns and growth over time. Look for themes and progress in your entries."
          }
        ]
      }
    ];

    const currentSet = resourceSets[currentSlide];

    return (
      <div className="mental-health-resources">
        <h2>Mental Health Resources</h2>
        <p className="resources-subtitle">Evidence-based tips and resources for effective journaling</p>
        
        <div className="carousel-container">
          <div className="carousel-header">
            <h3 className="carousel-title">{currentSet.title}</h3>
            <div className="carousel-controls">
              <button 
                className="carousel-btn prev-btn" 
                onClick={goToPrevious}
                aria-label="Previous resources"
              >
                ←
              </button>
              <span className="carousel-indicator">
                {currentSlide + 1} / 5
              </span>
              <button 
                className="carousel-btn next-btn" 
                onClick={goToNext}
                aria-label="Next resources"
              >
                →
              </button>
            </div>
          </div>

          <div className="carousel-content">
            <div className="resource-links">
              {currentSet.resources.map((resource, index) => (
                <a 
                  key={index}
                  href={resource.link} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="resource-link"
                >
                  <span className="resource-title">{resource.title}</span>
                  <span className="resource-source">{resource.source}</span>
                  <span className="resource-description">{resource.description}</span>
                </a>
              ))}
            </div>
          </div>

          <div className="carousel-dots">
            {[0, 1, 2, 3, 4].map((index) => (
              <button
                key={index}
                className={`carousel-dot ${index === currentSlide ? 'active' : ''}`}
                onClick={() => goToSlide(index)}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* AI-Generated Writing Prompts Section */}
        <div className="ai-prompts-section">
          <h3 className="ai-prompts-title">🤖 AI-Generated Writing Prompts</h3>
          <p className="ai-prompts-subtitle">Personalized prompts based on your recent journaling patterns and sentiment</p>
          
          <div className="ai-prompts-grid">
            {aiPrompts.map((prompt, index) => (
              <div key={index} className="ai-prompt-item">
                <div className="ai-prompt-content">
                  <h4 className="ai-prompt-title">{prompt}</h4>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderInsightsView = () => {
    console.log('Rendering insights view, insights state:', insights);
    console.log('Rendering insights view, trends state:', trends);
    return (
      <div className="insights-container">
        <h2>Your Emotional Journey</h2>
        
        {insights ? (
        <div className="insights-grid">
          <div className="insight-card">
            <div className="insight-header">
              <BarChart3 size={24} />
              <h3>Overview</h3>
            </div>
            <div className="insight-stats">
              <div className="stat">
                <span className="stat-number">{insights.totalEntries}</span>
                <span className="stat-label">Total Entries</span>
              </div>
              <div className="stat">
                <span className="stat-number">{insights.averageWordCount}</span>
                <span className="stat-label">Avg Words</span>
              </div>
              <div className="stat">
                <span className="stat-number">{insights.writingStreak || 0}</span>
                <span className="stat-label">Writing Streak</span>
              </div>
              <div className="stat">
                <span className="stat-number">{insights.moodTrend?.direction || '➡️'}</span>
                <span className="stat-label">Mood Trend</span>
              </div>
              <div className="stat">
                <span className="stat-number">{insights.currentMood?.emoji || '😐'}</span>
                <span className="stat-label">Current Mood</span>
              </div>
              <div className="stat">
                <span className="stat-number">{insights.growthScore?.percentage || '0%'}</span>
                <span className="stat-label">Growth Score</span>
              </div>
            </div>
          </div>

          <div className="insight-card">
            <div className="insight-header">
              <TrendingUp size={24} />
              <h3>Top Themes</h3>
            </div>
            <div className="themes-list">
              {insights.mostCommonThemes.map(({ theme, count }) => (
                <div key={theme} className="theme-item">
                  <span className="theme-name">#{theme}</span>
                  <span className="theme-count">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="insights-empty">
          <div className="empty-state">
            <BarChart3 size={48} />
            <h3>No Insights Yet</h3>
            <p>Start journaling to see your emotional journey and insights!</p>
          </div>
        </div>
      )}

      {/* Sentiment Trends Chart */}
      {trends && trends.length > 0 ? (
        <div className="chart-container">
          <h3>Sentiment Trends (Last 30 Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(74, 144, 226, 0.1)" />
              <XAxis 
                dataKey="displayDate" 
                tick={{ fill: '#4A90E2', fontSize: 12 }}
                axisLine={{ stroke: '#4A90E2' }}
              />
              <YAxis 
                domain={[-1, 1]}
                tick={{ fill: '#4A90E2', fontSize: 12 }}
                axisLine={{ stroke: '#4A90E2' }}
                tickFormatter={(value) => {
                  if (value === 1) return 'Very Positive';
                  if (value === 0.5) return 'Positive';
                  if (value === 0) return 'Neutral';
                  if (value === -0.5) return 'Negative';
                  if (value === -1) return 'Very Negative';
                  return value;
                }}
              />
              <Tooltip 
                labelFormatter={(date) => `Date: ${date}`}
                formatter={(value, name) => [
                  `${value > 0 ? '+' : ''}${value}`,
                  'Sentiment Score'
                ]}
                contentStyle={{
                  backgroundColor: 'rgba(74, 144, 226, 0.9)',
                  border: '1px solid #4A90E2',
                  borderRadius: '8px',
                  color: 'white'
                }}
                labelStyle={{
                  color: 'white'
                }}
                itemStyle={{
                  color: 'white'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="sentiment" 
                stroke="#4A90E2" 
                strokeWidth={3}
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  const isAnnotated = payload.annotation;
                  return (
                    <g>
                      <circle 
                        cx={cx} 
                        cy={cy} 
                        r={isAnnotated ? 6 : 4} 
                        fill={isAnnotated ? '#FF6B6B' : '#4A90E2'} 
                        stroke={isAnnotated ? '#FF6B6B' : '#4A90E2'}
                        strokeWidth={2}
                      />
                      {isAnnotated && (
                        <text 
                          x={cx} 
                          y={cy - 15} 
                          textAnchor="middle" 
                          fontSize="10" 
                          fill="#FF6B6B"
                          fontWeight="bold"
                        >
                          {payload.annotation.text}
                        </text>
                      )}
                    </g>
                  );
                }}
                activeDot={{ r: 8, fill: '#4A90E2', stroke: '#4A90E2', strokeWidth: 2 }}
              />
              {/* Reference lines for sentiment levels */}
              <ReferenceLine y={0} stroke="rgba(74, 144, 226, 0.3)" strokeDasharray="2 2" />
              <ReferenceLine y={0.5} stroke="rgba(34, 197, 94, 0.3)" strokeDasharray="2 2" />
              <ReferenceLine y={-0.5} stroke="rgba(239, 68, 68, 0.3)" strokeDasharray="2 2" />
            </LineChart>
          </ResponsiveContainer>
          
          {/* Chart Summary */}
          {trends.length > 0 && (
            <div className="chart-summary">
              <div className="summary-stats">
                <div className="stat">
                  <span className="stat-label">Average Sentiment:</span>
                  <span className="stat-value">
                    {trends.reduce((sum, day) => sum + day.sentiment, 0) / trends.length > 0 
                      ? (trends.reduce((sum, day) => sum + day.sentiment, 0) / trends.length).toFixed(2)
                      : '0.00'
                    }
                  </span>
                </div>
                <div className="stat">
                  <span className="stat-label">Days Tracked:</span>
                  <span className="stat-value">{trends.length}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Best Day:</span>
                  <span className="stat-value">
                    {trends.reduce((best, current) => current.sentiment > best.sentiment ? current : best).displayDate}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="chart-container">
          <h3>Sentiment Trends (Last 30 Days)</h3>
          <div className="chart-empty">
            <p>Chart will appear here as you add more journal entries over time.</p>
          </div>
        </div>
      )}
    </div>
    );
  };

  const renderFutureEnhancement = () => {
    const getTabInfo = () => {
      switch (currentView) {
        case 'newsfeed':
          return {
            title: 'News Feed',
            icon: <Newspaper size={48} />,
            description: 'Stay updated with the latest journaling insights, mental health tips, and community updates.'
          };
        case 'followers':
          return {
            title: 'Followers',
            icon: <Users size={48} />,
            description: 'Connect with others who follow your journaling journey and share insights.'
          };
        case 'following':
          return {
            title: 'Following',
            icon: <UserPlus size={48} />,
            description: 'Follow inspiring journalers and mental health advocates for daily motivation.'
          };
        case 'closefriends':
          return {
            title: 'Close Friends',
            icon: <UserCheck size={48} />,
            description: 'Share your journaling insights with your closest friends and family members.'
          };
        default:
          return {
            title: 'Future Enhancement',
            icon: <Sparkles size={48} />,
            description: 'This feature is coming soon!'
          };
      }
    };

    const tabInfo = getTabInfo();

    return (
      <div className="future-enhancement-container">
        <div className="future-enhancement-content">
          <div className="future-icon">
            {tabInfo.icon}
          </div>
          <h2 className="future-title">{tabInfo.title}</h2>
          <p className="future-description">{tabInfo.description}</p>
          <div className="coming-soon-badge">
            <Sparkles size={16} />
            Coming Soon
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`app ${isDarkMode ? 'dark' : 'light'}`}>
      <header className="app-header">
        <div className="header-content">
          <h1>📝 AI Journaling Companion</h1>
          <div className="header-controls">
            <button 
              className="theme-toggle"
              onClick={() => setIsDarkMode(!isDarkMode)}
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button 
              className="settings-button"
              onClick={() => setCurrentView(currentView === 'journal' ? 'insights' : 'journal')}
            >
              <Settings size={20} />
            </button>
          </div>
        </div>
        
        <nav className="view-nav">
          <button 
            className={`nav-button ${currentView === 'journal' ? 'active' : ''}`}
            onClick={() => setCurrentView('journal')}
          >
            <Heart size={16} />
            Journal
          </button>
          <button 
            className={`nav-button ${currentView === 'insights' ? 'active' : ''}`}
            onClick={() => setCurrentView('insights')}
          >
            <BarChart3 size={16} />
            Insights
          </button>
          <button 
            className={`nav-button ${currentView === 'newsfeed' ? 'active' : ''}`}
            onClick={() => setCurrentView('newsfeed')}
          >
            <Newspaper size={16} />
            News Feed
          </button>
          <button 
            className={`nav-button ${currentView === 'followers' ? 'active' : ''}`}
            onClick={() => setCurrentView('followers')}
          >
            <Users size={16} />
            Followers
          </button>
          <button 
            className={`nav-button ${currentView === 'following' ? 'active' : ''}`}
            onClick={() => setCurrentView('following')}
          >
            <UserPlus size={16} />
            Following
          </button>
          <button 
            className={`nav-button ${currentView === 'closefriends' ? 'active' : ''}`}
            onClick={() => setCurrentView('closefriends')}
          >
            <UserCheck size={16} />
            Close Friends
          </button>
        </nav>
      </header>

      <main className="app-main">
        <div className={`main-content ${currentView === 'insights' ? 'insights-view' : ''}`}>
          {currentView === 'journal' ? (
            <>
              <motion.div
                className="journal-section active"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                {renderJournalView()}
              </motion.div>
              
              <motion.div
                className="right-section active"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                {renderMentalHealthResources()}
              </motion.div>
            </>
          ) : currentView === 'insights' ? (
            <motion.div
              className="insights-section active"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {renderInsightsView()}
            </motion.div>
          ) : (
            <motion.div
              className="future-section active"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {renderFutureEnhancement()}
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}