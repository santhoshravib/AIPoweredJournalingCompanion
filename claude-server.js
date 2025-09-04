// AI-Powered Journaling Companion with Claude API Integration
require('dotenv').config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const Anthropic = require('@anthropic-ai/sdk');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : ['http://localhost:3000'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

app.use(express.json({ limit: '10mb' }));

// Initialize Claude API
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || 'your-claude-api-key-here',
});

// In-memory store with enhanced data structure
let entries = [];
let userInsights = {
  patterns: {},
  themes: {},
  emotionalJourney: [],
  privacySettings: {
    onDeviceProcessing: false, // Using Claude API
    dataRetention: 30 // days
  }
};

/**
 * Generate AI response using Claude
 */
async function generateAIResponse(text, analysis) {
  try {
    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: `You are Sam, an empathetic AI journaling companion. Respond to this journal entry with a supportive, thoughtful message. Be encouraging and help the person reflect on their feelings. Keep it conversational and warm, but direct and natural - no formal greetings like "Hey there" or "Hello", no theatrical elements like "*clears throat*" or signatures. Respond as if you're continuing a natural conversation.

Journal entry: "${text}"
Detected sentiment: ${analysis.sentiment}
Themes: ${analysis.themes.join(', ')}

Respond as Sam would - with empathy, understanding, and gentle guidance. Keep it natural and conversational, as if continuing an ongoing dialogue.`
      }]
    });

    const aiResponseText = response.content[0].text;
    console.log('🤖 Generated AI response:', aiResponseText.substring(0, 100) + '...');
    return aiResponseText;
  } catch (error) {
    console.error('Claude AI response error:', error);
    // Fallback response
    return "Thank you for sharing that with me. I'm here to listen and help you process your thoughts and feelings. How are you feeling about this situation?";
  }
}

/**
 * Enhanced sentiment analysis using Claude
 */
async function analyzeSentimentWithClaude(text) {
  try {
    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307", // Fast and cost-effective
      max_tokens: 200,
      messages: [{
        role: "user",
        content: `Analyze the sentiment and emotions in this journal entry. Respond with ONLY a JSON object containing:
{
  "sentiment": "very_positive|positive|neutral|negative|very_negative",
  "emotions": ["joy", "sadness", "anger", "fear", "surprise", "disgust"],
  "themes": ["work", "relationships", "health", "creativity", "travel", "learning", "stress", "gratitude", "goals", "nature"],
  "confidence": 0.0-1.0
}

Journal entry: "${text}"`
      }]
    });

    const content = response.content[0].text;
    const analysis = JSON.parse(content);
    
    return {
      sentiment: analysis.sentiment || 'neutral',
      emotions: analysis.emotions || [],
      themes: analysis.themes || [],
      confidence: analysis.confidence || 0.5
    };
  } catch (error) {
    console.error('Claude API error:', error);
    // Fallback to simple analysis
    return analyzeSentimentFallback(text);
  }
}

/**
 * Fallback sentiment analysis
 */
function analyzeSentimentFallback(text) {
  let sentiment = "neutral";
  if (/happy|great|excited|joy|love|amazing|wonderful|fantastic|good|positive|grateful|blessed/i.test(text)) {
    sentiment = "positive";
  } else if (/sad|angry|stressed|bad|tired|worried|anxious|frustrated|upset|terrible|awful|horrible/i.test(text)) {
    sentiment = "negative";
  }

  const emotions = [];
  if (/happy|joy|excited|amazing/i.test(text)) emotions.push("joy");
  if (/sad|down|blue|hurt/i.test(text)) emotions.push("sadness");
  if (/angry|mad|furious|upset/i.test(text)) emotions.push("anger");
  if (/worried|anxious|scared|afraid/i.test(text)) emotions.push("fear");

  const themes = [];
  if (/work|job|career|office/i.test(text)) themes.push("work");
  if (/family|friend|relationship|love/i.test(text)) themes.push("relationships");
  if (/health|exercise|gym|doctor/i.test(text)) themes.push("health");
  if (/creative|art|music|write|design/i.test(text)) themes.push("creativity");

  return {
    sentiment,
    emotions,
    themes,
    confidence: 0.6
  };
}

/**
 * Generate empathetic prompt using Claude
 */
async function generateEmpatheticPromptWithClaude(entry, allEntries) {
  try {
    const recentEntries = allEntries.slice(-3).map(e => `${e.sentiment}: ${e.text}`).join('\n');
    
    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 150,
      messages: [{
        role: "user",
        content: `You are an empathetic AI journaling companion. Based on this journal entry and recent entries, generate a thoughtful, supportive follow-up QUESTION (not a response).

Current entry: "${entry.text}"
Sentiment: ${entry.sentiment}
Emotions: ${entry.emotions.join(', ')}
Themes: ${entry.themes.join(', ')}

Recent entries:
${recentEntries}

Generate a single, empathetic FOLLOW-UP QUESTION that:
- Acknowledges their current emotional state
- Encourages deeper reflection
- Feels supportive and non-judgmental
- Is specific to their situation
- Starts with a question word (What, How, When, Where, Why, etc.)

Examples of good follow-up questions:
- "What has been contributing to these feelings for you lately?"
- "How can you show yourself some kindness today?"
- "What would help you feel more connected right now?"

Respond with ONLY the question text, no quotes or formatting.`
      }]
    });

    return response.content[0].text.trim();
  } catch (error) {
    console.error('Claude prompt generation error:', error);
    return generatePromptFallback(entry);
  }
}

/**
 * Fallback prompt generation
 */
function generatePromptFallback(entry) {
  const { sentiment, text } = entry;
  
  if (sentiment === "positive") {
    return "That sounds wonderful! What made today feel so good?";
  } else if (sentiment === "negative") {
    return "I hear you. What's one small thing that helped you today?";
  } else if (/work/i.test(text)) {
    return "Work can be intense. How did you find balance today?";
  } else if (/family/i.test(text)) {
    return "Family moments matter. How are you feeling about your connections?";
  } else {
    return "How are you feeling about everything right now?";
  }
}

/**
 * Generate weekly insights using Claude
 */
async function generateWeeklyInsightsWithClaude(weekEntries) {
  if (weekEntries.length === 0) {
    return { summary: "No entries this week to reflect on.", insights: [] };
  }

  try {
    const entriesText = weekEntries.map(e => `${e.sentiment}: ${e.text}`).join('\n');
    
    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 300,
      messages: [{
        role: "user",
        content: `Analyze these journal entries from the past week and provide a gentle, insightful summary. Be empathetic and supportive.

Entries:
${entriesText}

Provide a summary that:
- Acknowledges their emotional journey
- Identifies patterns or themes
- Offers gentle insights
- Feels supportive and encouraging
- Is 2-3 sentences long

Respond with ONLY the summary text.`
      }]
    });

    return {
      summary: response.content[0].text.trim(),
      insights: [],
      sentimentCounts: {},
      topThemes: []
    };
  } catch (error) {
    console.error('Claude insights error:', error);
    return generateInsightsFallback(weekEntries);
  }
}

/**
 * Fallback insights generation
 */
function generateInsightsFallback(weekEntries) {
  const sentimentCounts = weekEntries.reduce((acc, entry) => {
    acc[entry.sentiment] = (acc[entry.sentiment] || 0) + 1;
    return acc;
  }, {});

  const totalEntries = weekEntries.length;
  const positiveCount = sentimentCounts.positive || 0;
  const negativeCount = sentimentCounts.negative || 0;

  let summary = `This week, you wrote ${totalEntries} entries. `;
  
  if (positiveCount > negativeCount) {
    summary += "🌟 You've had more positive moments than challenging ones.";
  } else if (negativeCount > positiveCount) {
    summary += "💙 This week seems challenging. Remember, it's okay to not be okay.";
  } else {
    summary += "⚖️ Your emotional landscape shows balance.";
  }

  return { summary, insights: [], sentimentCounts, topThemes: [] };
}

/**
 * Calculate writing streak (consecutive days with entries)
 */
function calculateWritingStreak(entries) {
  if (entries.length === 0) return 0;
  
  // Sort entries by date (newest first)
  const sortedEntries = [...entries].sort((a, b) => new Date(b.ts || b.timestamp) - new Date(a.ts || a.timestamp));
  
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Check if there's an entry today
  const hasEntryToday = sortedEntries.some(entry => {
    const entryDate = new Date(entry.ts || entry.timestamp);
    entryDate.setHours(0, 0, 0, 0);
    return entryDate.getTime() === today.getTime();
  });
  
  if (!hasEntryToday) {
    // If no entry today, start counting from yesterday
    today.setDate(today.getDate() - 1);
  }
  
  // Count consecutive days with entries
  for (let i = 0; i < 365; i++) { // Check up to a year
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() - i);
    
    const hasEntryOnDate = sortedEntries.some(entry => {
      const entryDate = new Date(entry.ts || entry.timestamp);
      entryDate.setHours(0, 0, 0, 0);
      return entryDate.getTime() === checkDate.getTime();
    });
    
    if (hasEntryOnDate) {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
}

/**
 * Calculate mood trend over the last 7 days
 */
function calculateMoodTrend(entries) {
  if (entries.length === 0) return { trend: 'stable', direction: '➡️', description: 'No data yet' };
  
  // Get entries from last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const recentEntries = entries.filter(entry => 
    new Date(entry.ts || entry.timestamp) >= sevenDaysAgo
  );
  
  if (recentEntries.length < 2) {
    return { trend: 'stable', direction: '➡️', description: 'Need more data' };
  }
  
  // Sort by date
  recentEntries.sort((a, b) => new Date(a.ts || a.timestamp) - new Date(b.ts || b.timestamp));
  
  // Calculate sentiment scores (very_positive = 2, positive = 1, neutral = 0, negative = -1, very_negative = -2)
  const sentimentScores = recentEntries.map(entry => {
    switch (entry.sentiment) {
      case 'very_positive': return 2;
      case 'positive': return 1;
      case 'neutral': return 0;
      case 'negative': return -1;
      case 'very_negative': return -2;
      default: return 0;
    }
  });
  
  // Calculate trend using simple linear regression
  const n = sentimentScores.length;
  const x = Array.from({ length: n }, (_, i) => i);
  const y = sentimentScores;
  
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  
  // Determine trend
  if (slope > 0.1) {
    return { trend: 'improving', direction: '↗️', description: 'Getting better' };
  } else if (slope < -0.1) {
    return { trend: 'declining', direction: '↘️', description: 'Needs attention' };
  } else {
    return { trend: 'stable', direction: '➡️', description: 'Staying steady' };
  }
}

/**
 * Calculate current mood (most recent entry's sentiment)
 */
function calculateCurrentMood(entries) {
  if (entries.length === 0) return { mood: 'neutral', emoji: '😐', description: 'No data yet' };
  
  // Get the most recent entry
  const mostRecent = entries.sort((a, b) => new Date(b.ts || b.timestamp) - new Date(a.ts || a.timestamp))[0];
  
  switch (mostRecent.sentiment) {
    case 'very_positive':
      return { mood: 'very_positive', emoji: '😄', description: 'Feeling amazing' };
    case 'positive':
      return { mood: 'positive', emoji: '😊', description: 'Feeling good' };
    case 'negative':
      return { mood: 'negative', emoji: '😔', description: 'Having a tough time' };
    case 'very_negative':
      return { mood: 'very_negative', emoji: '😢', description: 'Really struggling' };
    case 'neutral':
    default:
      return { mood: 'neutral', emoji: '😐', description: 'Feeling balanced' };
  }
}

/**
 * Calculate growth score based on multiple factors
 */
function calculateGrowthScore(entries) {
  if (entries.length === 0) return { score: 0, percentage: '0%', description: 'No data yet' };
  
  let score = 0;
  let factors = 0;
  
  // Factor 1: Consistency (writing streak)
  const streak = calculateWritingStreak(entries);
  const consistencyScore = Math.min(streak * 2, 20); // Max 20 points for consistency
  score += consistencyScore;
  factors++;
  
  // Factor 2: Sentiment improvement over time
  const moodTrend = calculateMoodTrend(entries);
  let sentimentScore = 10; // Base score
  if (moodTrend.trend === 'improving') sentimentScore = 20;
  else if (moodTrend.trend === 'declining') sentimentScore = 5;
  score += sentimentScore;
  factors++;
  
  // Factor 3: Entry frequency (more entries = more engagement)
  const daysSinceFirst = entries.length > 0 ? 
    Math.ceil((new Date() - new Date(entries[entries.length - 1].ts || entries[entries.length - 1].timestamp)) / (1000 * 60 * 60 * 24)) : 1;
  const frequencyScore = Math.min((entries.length / Math.max(daysSinceFirst, 1)) * 10, 20); // Max 20 points
  score += frequencyScore;
  factors++;
  
  // Factor 4: Word count growth (showing deeper reflection)
  const avgWords = entries.reduce((sum, e) => sum + (e.wordCount || 0), 0) / entries.length;
  const wordScore = Math.min(avgWords / 5, 20); // Max 20 points (100 words = 20 points)
  score += wordScore;
  factors++;
  
  // Factor 5: Positive sentiment ratio
  const positiveEntries = entries.filter(e => e.sentiment === 'positive' || e.sentiment === 'very_positive').length;
  const positiveRatio = positiveEntries / entries.length;
  const positiveScore = positiveRatio * 20; // Max 20 points
  score += positiveScore;
  factors++;
  
  // Calculate final score (0-100)
  const maxPossibleScore = 100; // 20+20+20+20+20 = 100 max points
  const finalScore = Math.round((score / maxPossibleScore) * 100); // Convert to percentage
  const percentage = Math.min(Math.max(finalScore, 0), 100); // Ensure between 0-100
  
  let description = 'Getting started';
  if (percentage >= 80) description = 'Excellent progress';
  else if (percentage >= 60) description = 'Good progress';
  else if (percentage >= 40) description = 'Steady progress';
  else if (percentage >= 20) description = 'Building momentum';
  
  return { 
    score: percentage, 
    percentage: `${percentage}%`, 
    description: description 
  };
}

// API Routes

/**
 * Health check with Claude API status
 */
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "healthy",
    aiProvider: "Claude API",
    privacy: {
      onDeviceProcessing: userInsights.privacySettings.onDeviceProcessing,
      dataRetention: userInsights.privacySettings.dataRetention,
      totalEntries: entries.length
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * Enhanced sentiment analysis and entry saving with Claude
 */
app.post("/api/sentiment", async (req, res) => {
  const { text, timestamp } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: "Text is required" });
  }

  try {
    const analysis = await analyzeSentimentWithClaude(text);
    const aiResponse = await generateAIResponse(text, analysis);
    
    // Use provided timestamp or create new one
    const entryTimestamp = timestamp || new Date().toISOString();
    
    const entry = {
      id: entries.length + 1,
      userInput: text.trim(),
      aiResponse: aiResponse, // Same response for both prompt area and chat history
      sentiment: analysis.sentiment,
      emotions: analysis.emotions,
      themes: analysis.themes,
      confidence: analysis.confidence,
      ts: entryTimestamp,
      wordCount: text.trim().split(/\s+/).length,
      conversation: [
        {
          role: "user",
          text: text.trim(),
          timestamp: entryTimestamp
        },
        {
          role: "ai",
          text: aiResponse, // Same AI response in chat history
          timestamp: new Date(new Date(entryTimestamp).getTime() + 1000).toISOString() // AI response 1 second later
        }
      ]
    };

    entries.push(entry);
    
    // Update emotional journey
    userInsights.emotionalJourney.push({
      date: entry.ts,
      sentiment: entry.sentiment,
      emotions: entry.emotions
    });

    console.log("📌 New entry saved with Claude analysis:", {
      id: entry.id,
      sentiment: entry.sentiment,
      emotions: entry.emotions,
      themes: entry.themes,
      confidence: entry.confidence
    });

    res.json(entry);
  } catch (error) {
    console.error("Error analyzing entry:", error);
    res.status(500).json({ error: "Failed to analyze entry" });
  }
});

/**
 * Get all entries
 */
app.get("/api/entries", (req, res) => {
  res.json(entries);
});

/**
 * Generate empathetic prompt with Claude
 */
app.post("/api/prompt", async (req, res) => {
  const { text, sentiment, emotions } = req.body;
  
  try {
    // Find the most recent entry that matches this text to get the already-generated response
    const recentEntry = entries.find(entry => 
      entry.userInput === text.trim() && 
      entry.sentiment === sentiment
    );
    
    if (recentEntry && recentEntry.aiResponse) {
      // Return the same AI response that was already generated
      res.json({ prompt: recentEntry.aiResponse });
    } else {
      // Fallback if no matching entry found
      const fallbackResponse = "I'm here to listen and support you. How are you feeling right now?";
      res.json({ prompt: fallbackResponse });
    }
  } catch (error) {
    console.error("Error getting AI response:", error);
    const fallbackResponse = "I'm here to listen and support you. How are you feeling right now?";
    res.json({ prompt: fallbackResponse });
  }
});

/**
 * Enhanced weekly summary with Claude
 */
app.get("/api/summary", async (req, res) => {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const weekEntries = entries.filter(entry => 
    new Date(entry.ts) >= weekAgo
  );

  try {
    const insights = await generateWeeklyInsightsWithClaude(weekEntries);
    res.json(insights);
  } catch (error) {
    console.error("Error generating summary:", error);
    const fallbackInsights = generateInsightsFallback(weekEntries);
    res.json(fallbackInsights);
  }
});

/**
 * Get emotional trends for visualization
 */
app.get("/api/trends", (req, res) => {
  const last30Days = entries.filter(entry => {
    const entryDate = new Date(entry.ts);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return entryDate >= thirtyDaysAgo;
  });

  const trends = last30Days.map(entry => ({
    date: entry.ts.split('T')[0],
    sentiment: entry.sentiment,
    emotions: entry.emotions,
    themes: entry.themes
  }));

  res.json({ trends, totalEntries: last30Days.length });
});

/**
 * Privacy settings endpoint
 */
app.get("/api/privacy", (req, res) => {
  res.json(userInsights.privacySettings);
});

/**
 * Get user insights dashboard data
 */
app.get("/api/insights", (req, res) => {
  const insights = {
    totalEntries: entries.length,
    averageWordCount: entries.length > 0 ? 
      Math.round(entries.reduce((sum, e) => sum + e.wordCount, 0) / entries.length) : 0,
    mostCommonThemes: {},
    emotionalJourney: userInsights.emotionalJourney.slice(-30),
    privacySettings: userInsights.privacySettings
  };

  // Calculate Writing Streak
  insights.writingStreak = calculateWritingStreak(entries);

  // Calculate Mood Trend
  insights.moodTrend = calculateMoodTrend(entries);

  // Calculate Current Mood
  insights.currentMood = calculateCurrentMood(entries);

  // Calculate Growth Score
  insights.growthScore = calculateGrowthScore(entries);

  // Count themes
  entries.forEach(entry => {
    entry.themes.forEach(theme => {
      if (!insights.mostCommonThemes[theme]) {
        insights.mostCommonThemes[theme] = { count: 0 };
      }
      insights.mostCommonThemes[theme].count++;
    });
  });

  // Convert to array and sort
  insights.mostCommonThemes = Object.entries(insights.mostCommonThemes)
    .sort(([,a], [,b]) => b.count - a.count)
    .slice(0, 5)
    .map(([theme, data]) => ({ theme, count: data.count }));

  res.json(insights);
});

/**
 * Get chats grouped by day
 */
app.get("/api/chats/daily", (req, res) => {
  // Group entries by day
  const dailyChats = {};
  
  entries.forEach(entry => {
    const date = new Date(entry.timestamp || entry.ts);
    const dayKey = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    if (!dailyChats[dayKey]) {
      dailyChats[dayKey] = {
        date: dayKey,
        displayDate: date.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        }),
        chats: [],
        thumbnail: null
      };
    }
    
    dailyChats[dayKey].chats.push(entry);
  });
  
  // Sort chats within each day by timestamp
  Object.values(dailyChats).forEach(day => {
    day.chats.sort((a, b) => new Date(a.timestamp || a.ts) - new Date(b.timestamp || b.ts));
    day.thumbnail = day.chats[0]; // First chat is the thumbnail
  });
  
  // Convert to array and sort by date (newest first)
  const dailyChatsArray = Object.values(dailyChats)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  
  res.json(dailyChatsArray);
});

/**
 * Get chats filtered by hashtag
 */
app.get("/api/chats/hashtag/:hashtag", (req, res) => {
  const hashtag = req.params.hashtag.toLowerCase();
  
  const filteredChats = entries.filter(entry => 
    entry.themes.some(theme => theme.toLowerCase() === hashtag)
  );
  
  // Sort by timestamp (newest first)
  filteredChats.sort((a, b) => new Date(b.timestamp || b.ts) - new Date(a.timestamp || a.ts));
  
  res.json(filteredChats);
});

/**
 * Get all unique hashtags
 */
app.get("/api/hashtags", (req, res) => {
  const hashtags = new Set();
  
  entries.forEach(entry => {
    entry.themes.forEach(theme => {
      hashtags.add(theme);
    });
  });
  
  const hashtagsArray = Array.from(hashtags).sort();
  res.json(hashtagsArray);
});

/**
 * Get sentiment trends data for the last 30 days
 */
app.get("/api/sentiment-trends", (req, res) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  // Filter entries from last 30 days
  const recentEntries = entries.filter(entry => 
    new Date(entry.ts || entry.timestamp) >= thirtyDaysAgo
  );
  
  // Group entries by day
  const dailySentiment = {};
  
  recentEntries.forEach(entry => {
    const date = new Date(entry.ts || entry.timestamp);
    const dayKey = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    if (!dailySentiment[dayKey]) {
      dailySentiment[dayKey] = {
        date: dayKey,
        displayDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        sentiments: [],
        emotions: [],
        themes: []
      };
    }
    
    // Convert sentiment to numeric score
    let sentimentScore = 0;
    switch (entry.sentiment) {
      case 'very_positive': sentimentScore = 1; break;
      case 'positive': sentimentScore = 0.5; break;
      case 'neutral': sentimentScore = 0; break;
      case 'negative': sentimentScore = -0.5; break;
      case 'very_negative': sentimentScore = -1; break;
      default: sentimentScore = 0;
    }
    
    dailySentiment[dayKey].sentiments.push(sentimentScore);
    dailySentiment[dayKey].emotions.push(...entry.emotions);
    dailySentiment[dayKey].themes.push(...entry.themes);
  });
  
  // Calculate daily averages and create trend data
  const trendData = Object.values(dailySentiment).map(day => {
    const avgSentiment = day.sentiments.length > 0 
      ? day.sentiments.reduce((sum, score) => sum + score, 0) / day.sentiments.length 
      : 0;
    
    // Count emotions
    const emotionCounts = {};
    day.emotions.forEach(emotion => {
      emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
    });
    
    // Count themes
    const themeCounts = {};
    day.themes.forEach(theme => {
      themeCounts[theme] = (themeCounts[theme] || 0) + 1;
    });
    
    return {
      date: day.date,
      displayDate: day.displayDate,
      sentiment: Math.round(avgSentiment * 100) / 100, // Round to 2 decimal places
      entryCount: day.sentiments.length,
      topEmotion: Object.keys(emotionCounts).reduce((a, b) => emotionCounts[a] > emotionCounts[b] ? a : b, 'neutral'),
      topTheme: Object.keys(themeCounts).reduce((a, b) => themeCounts[a] > themeCounts[b] ? a : b, 'general')
    };
  });
  
  // Sort by date
  trendData.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  // Add smart annotations
  const annotatedData = trendData.map((point, index) => {
    let annotation = null;
    
    // Check for significant changes
    if (index > 0) {
      const prevSentiment = trendData[index - 1].sentiment;
      const currentSentiment = point.sentiment;
      const change = currentSentiment - prevSentiment;
      
      if (Math.abs(change) >= 0.5) {
        if (change > 0) {
          annotation = { type: 'improvement', text: 'Great day!' };
        } else {
          annotation = { type: 'decline', text: 'Challenging day' };
        }
      }
    }
    
    // Check for best/worst days
    const allSentiments = trendData.map(d => d.sentiment);
    const maxSentiment = Math.max(...allSentiments);
    const minSentiment = Math.min(...allSentiments);
    
    if (point.sentiment === maxSentiment && point.sentiment > 0.3) {
      annotation = { type: 'best', text: 'Best day this month!' };
    } else if (point.sentiment === minSentiment && point.sentiment < -0.3) {
      annotation = { type: 'worst', text: 'Tough day' };
    }
    
    return {
      ...point,
      annotation
    };
  });
  
  res.json({
    data: annotatedData,
    summary: {
      totalDays: trendData.length,
      averageSentiment: trendData.length > 0 
        ? Math.round(trendData.reduce((sum, d) => sum + d.sentiment, 0) / trendData.length * 100) / 100 
        : 0,
      bestDay: trendData.length > 0 ? trendData.reduce((best, current) => current.sentiment > best.sentiment ? current : best) : null,
      worstDay: trendData.length > 0 ? trendData.reduce((worst, current) => current.sentiment < worst.sentiment ? current : worst) : null
    }
  });
});

/**
 * Generate AI-powered writing prompts based on user's sentiment and themes
 */
app.get("/api/ai-prompts", (req, res) => {
  try {
    if (entries.length === 0) {
      // Default prompts for new users
      const defaultPrompts = [
        "💭 What's on your mind today?",
        "🌱 What's one thing you learned about yourself recently?",
        "❤️ What made you smile today?",
        "🎯 What's a goal you're working towards?",
        "✨ What are you grateful for right now?"
      ];
      return res.json({ prompts: defaultPrompts });
    }

    // Analyze recent entries (last 5)
    const recentEntries = entries.slice(-5);
    const avgSentiment = calculateAverageSentiment(recentEntries);
    const commonThemes = extractCommonThemes(recentEntries);
    const recentEmotions = extractRecentEmotions(recentEntries);

    // Generate contextual prompts based on analysis
    const prompts = generateContextualPrompts(avgSentiment, commonThemes, recentEmotions);
    
    res.json({ 
      prompts,
      analysis: {
        sentiment: avgSentiment,
        themes: commonThemes,
        emotions: recentEmotions
      }
    });
  } catch (error) {
    console.error("Error generating AI prompts:", error);
    res.status(500).json({ error: "Failed to generate prompts" });
  }
});

/**
 * Calculate average sentiment from recent entries
 */
function calculateAverageSentiment(entries) {
  if (entries.length === 0) return 'neutral';
  
  const sentimentScores = {
    'very_positive': 2,
    'positive': 1,
    'neutral': 0,
    'negative': -1,
    'very_negative': -2
  };
  
  const totalScore = entries.reduce((sum, entry) => {
    return sum + (sentimentScores[entry.sentiment] || 0);
  }, 0);
  
  const avgScore = totalScore / entries.length;
  
  if (avgScore >= 1.5) return 'very_positive';
  if (avgScore >= 0.5) return 'positive';
  if (avgScore >= -0.5) return 'neutral';
  if (avgScore >= -1.5) return 'negative';
  return 'very_negative';
}

/**
 * Extract common themes from recent entries
 */
function extractCommonThemes(entries) {
  const themeCounts = {};
  entries.forEach(entry => {
    if (entry.themes) {
      entry.themes.forEach(theme => {
        themeCounts[theme] = (themeCounts[theme] || 0) + 1;
      });
    }
  });
  
  return Object.keys(themeCounts)
    .sort((a, b) => themeCounts[b] - themeCounts[a])
    .slice(0, 3);
}

/**
 * Extract recent emotions from entries
 */
function extractRecentEmotions(entries) {
  const emotionCounts = {};
  entries.forEach(entry => {
    if (entry.emotions) {
      entry.emotions.forEach(emotion => {
        emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
      });
    }
  });
  
  return Object.keys(emotionCounts)
    .sort((a, b) => emotionCounts[b] - emotionCounts[a])
    .slice(0, 3);
}

/**
 * Generate contextual prompts based on sentiment, themes, and emotions
 */
function generateContextualPrompts(sentiment, themes, emotions) {
  const prompts = [];
  
  // Sentiment-based prompts
  if (sentiment === 'very_positive' || sentiment === 'positive') {
    prompts.push(
      "🌟 What's making you feel so good lately?",
      "💪 How can you maintain this positive energy?",
      "🎉 What would you tell someone who's having a tough day?",
      "✨ What's one way you can spread positivity today?"
    );
  } else if (sentiment === 'negative' || sentiment === 'very_negative') {
    prompts.push(
      "🤗 What's one small thing that went well today?",
      "💙 How are you taking care of yourself right now?",
      "🌱 What's one thing you're looking forward to?",
      "❤️ What would you tell a friend in your situation?"
    );
  } else {
    prompts.push(
      "🤔 What's been on your mind lately?",
      "💭 How are you feeling about your current situation?",
      "🎯 What's one thing you'd like to focus on?",
      "🌅 What does a good day look like for you?"
    );
  }
  
  // Theme-based prompts
  if (themes.includes('work')) {
    prompts.push("💼 How do you want to feel about work tomorrow?");
  }
  if (themes.includes('relationships')) {
    prompts.push("👥 What's one way you can nurture your relationships?");
  }
  if (themes.includes('stress')) {
    prompts.push("🧘 What helps you feel calm and centered?");
  }
  if (themes.includes('growth')) {
    prompts.push("🌱 What's one way you've grown recently?");
  }
  
  // Emotion-based prompts
  if (emotions.includes('gratitude')) {
    prompts.push("🙏 What are you most grateful for today?");
  }
  if (emotions.includes('anxiety')) {
    prompts.push("💚 What's one thing that helps you feel safe?");
  }
  if (emotions.includes('joy')) {
    prompts.push("😊 What brought you the most joy today?");
  }
  
  // Always include some general prompts
  const generalPrompts = [
    "📝 What's one thing you learned about yourself today?",
    "🎨 If today had a color, what would it be and why?",
    "🔄 What's one habit you'd like to start or change?",
    "🌟 What's your biggest win this week?",
    "💭 What would your future self thank you for?"
  ];
  
  // Mix and return 5 unique prompts
  const allPrompts = [...new Set([...prompts, ...generalPrompts])];
  return allPrompts.slice(0, 5);
}

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 AI Journaling Companion with Claude API running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🤖 AI Provider: Claude API`);
  console.log(`🔒 Privacy: Cloud-based AI processing enabled`);
});
