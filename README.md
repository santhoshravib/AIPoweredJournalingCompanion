# AI-Powered Journaling Companion

A privacy-first, empathetic journaling application that helps users maintain consistent self-reflection practices while discovering meaningful patterns in their emotional journey.

## 🎯 Problem Statement

While the mental health benefits of journaling are well-documented, many people struggle to maintain a consistent practice. They face:
- **Blank page anxiety** - don't know what to write about
- **Lack of guidance** - no personalized prompts or encouragement
- **Pattern blindness** - difficulty identifying meaningful trends in thoughts and emotions
- **Privacy concerns** - hesitation to share personal thoughts with cloud services

## ✨ Solution

An AI-powered journaling companion that provides:
- **Dynamic, empathetic prompts** based on your emotional state and history
- **Advanced sentiment & emotion analysis** using NLP techniques
- **Privacy-first design** with on-device processing options
- **Beautiful visualizations** of your emotional trends
- **Weekly insights** that reveal patterns you might miss

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd AIPoweredJournalingCompanion
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Set up Claude API**
   - Create a `.env` file in the root directory
   - Add your Claude API key: `ANTHROPIC_API_KEY=your_api_key_here`
   - Get your API key from [Anthropic Console](https://console.anthropic.com/)

4. **Start the backend server**
   ```bash
   npm start
   ```

5. **Start the frontend (in a new terminal)**
   ```bash
   npm run client
   ```

6. **Open your browser**
   Navigate to `http://localhost:3000`

## 🏗️ Architecture

### Frontend (React)
- **Framework**: React 18 with modern hooks
- **Styling**: Custom CSS with responsive design
- **Animations**: Framer Motion for smooth transitions
- **Charts**: Recharts for data visualization
- **Icons**: Lucide React for consistent iconography

### Backend (Node.js/Express)
- **Runtime**: Node.js with Express.js
- **AI Integration**: Claude API for advanced language processing
- **NLP**: sentiment, natural, compromise libraries
- **Security**: Helmet.js, rate limiting, CORS
- **Scheduling**: node-cron for automated cleanup

## 🔧 Key Features

### 1. Dynamic, Empathetic Prompts
- Context-aware questions based on your recent entries
- Personalized follow-ups that feel like a conversation
- Emotional state consideration for appropriate responses

### 2. Advanced AI Analysis
- **Sentiment Analysis**: 5-point scale (very_negative to very_positive)
- **Emotion Detection**: joy, sadness, anger, fear, surprise, disgust
- **Theme Extraction**: work, relationships, health, creativity, etc.
- **Pattern Recognition**: Historical trend analysis

### 3. Privacy-First Design
- **Cloud-based AI processing** with Claude API integration
- **Configurable data retention** (default: 30 days)
- **Secure API communication** with rate limiting
- **Transparent privacy controls**

### 4. Beautiful Visualizations
- Sentiment trend charts
- Theme frequency analysis
- Emotional journey timeline
- Weekly insight summaries

### 5. Responsive Design
- Mobile-optimized interface
- Dark mode support
- Accessibility features
- Smooth animations

## 📊 API Endpoints

### Core Endpoints
- `POST /api/sentiment` - Analyze journal entry sentiment and emotions
- `GET /api/entries` - Retrieve all journal entries
- `POST /api/prompt` - Generate empathetic follow-up prompt
- `GET /api/summary` - Generate weekly reflection summary
- `GET /api/trends` - Get emotional trend data for visualization
- `GET /api/insights` - Get user insights dashboard data

### Privacy Endpoints
- `GET /api/privacy` - Get current privacy settings
- `POST /api/privacy` - Update privacy settings
- `GET /api/health` - Health check with privacy status

## 🎨 User Experience

### Design Principles
1. **Empathy First** - Every interaction feels supportive
2. **Privacy Transparency** - Clear data handling indicators
3. **Minimal Cognitive Load** - Simple, intuitive interface
4. **Progressive Disclosure** - Advanced features available but not overwhelming

### User Journey
1. **Onboarding** - Privacy settings, first prompt
2. **Daily Use** - Quick entry, immediate feedback, empathetic prompts
3. **Reflection** - Weekly summaries, trend visualization
4. **Insights** - Pattern discovery, personal growth tracking

## 🔒 Privacy & Security

### Data Protection
- All data encrypted at rest and in transit
- No user authentication required (local-first approach)
- Data minimization - only essential data collected
- Automatic cleanup of old data

### Privacy Controls
- On-device processing options
- Configurable retention periods
- Full data export and deletion capabilities
- Transparent privacy dashboard

### Security Measures
- Rate limiting protection
- Input validation and sanitization
- Secure CORS configuration
- Comprehensive security headers

## 🚀 Deployment

### Development
```bash
# Backend
npm run dev

# Frontend
npm run client
```

### Production
```bash
# Build frontend
npm run build

# Start production server
NODE_ENV=production npm start
```

### Environment Variables
```bash
NODE_ENV=production
PORT=5000
```

## 📈 Success Metrics

### User Engagement
- Daily active users: Target 70%+
- Session duration: 5-10 minutes average
- Retention rate: 80%+ weekly
- Entry frequency: 5+ entries per week

### AI Performance
- Sentiment accuracy: 85%+
- Emotion detection: 80%+
- Prompt relevance: User-rated helpfulness
- Response time: <2 seconds

### Privacy & Trust
- Privacy score: 100% on audits
- Zero data breaches
- High user confidence in data handling
- Transparent privacy policies

## 🔮 Future Enhancements

### Short-term (3 months)
- Mobile app (React Native)
- Voice input capabilities
- Export features (PDF, JSON)
- Advanced analytics

### Medium-term (3-6 months)
- Custom ML model training
- Optional social features
- Health app integrations
- Therapy integration tools

### Long-term (6+ months)
- AI coaching capabilities
- Predictive mental health analytics
- Research platform features
- Enterprise wellness tools

## 🛠️ Development

### Project Structure
```
AIPoweredJournalingCompanion/
├── client/                 # React frontend
│   ├── src/
│   │   ├── App.js         # Main application component
│   │   ├── App.css        # Styling
│   │   └── index.js       # Entry point
│   └── public/
├── server.js              # Express backend
├── package.json           # Dependencies
└── README.md
```

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Code Style
- ESLint configuration included
- Prettier formatting
- Consistent naming conventions
- Comprehensive comments

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Support

For questions, issues, or contributions:
- Create an issue on GitHub
- Check the documentation
- Review the design documentation

---

**Built with ❤️ for mental wellness and privacy**