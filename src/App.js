import React, { useState, useEffect, useCallback } from 'react';
import { Target, CheckCircle, Plus, Award, LogOut, User, BarChart3, Trash2 } from 'lucide-react';
import './App.css';
import { supabase } from './supabase';
import { 
  dailyCheckinServices, 
  coverageServices, 
  deliverablesServices, 
  pipelineServices, 
  analyticsServices,
  portfolioServices
} from './supabaseServices';
import { stockServices } from './stockServices';
import { AuthProvider, useAuth } from './AuthContext';
import Login from './components/Login';
import { 
  PipelineVelocityCard, 
  CoverageActivityCard, 
  QuickStatsCard 
} from './components/Analytics';
import StockCRM from './components/StockCRM';
import Portfolio from './components/Portfolio';
import Calendar from './components/Calendar';
import EnhancedStats from './components/EnhancedStats';



// Helper function to get local date in YYYY-MM-DD format
const getLocalDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const AnalystOS = () => {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [dailyGoals, setDailyGoals] = useState('');
  const [checkoutReflection, setCheckoutReflection] = useState('');
  const [disciplineRating, setDisciplineRating] = useState(0);
  const [streak, setStreak] = useState(0);
  const [weeklyWins, setWeeklyWins] = useState(0);
  const [checkoutHistory, setCheckoutHistory] = useState([]);
  const [coverage, setCoverage] = useState([]);
  const [formerCompanies, setFormerCompanies] = useState([]);
  const [memos, setMemos] = useState([]);
  const [completedMemos, setCompletedMemos] = useState([]);
  const [pipelineIdeas, setPipelineIdeas] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [stockSearchTicker, setStockSearchTicker] = useState('');
  const [goalsHistory, setGoalsHistory] = useState([]);

  // Pipeline states
  const [newIdeaCompany, setNewIdeaCompany] = useState('');
  const [newIdeaTicker, setNewIdeaTicker] = useState('');
  const [showAddIdeaModal, setShowAddIdeaModal] = useState(false);
  const [passingIdeaId, setPassingIdeaId] = useState(null);
  const [passReason, setPassReason] = useState('');
  const [showPassModal, setShowPassModal] = useState(false);
  const [tickerLookupLoading, setTickerLookupLoading] = useState(false);

  // Memo/Model states
  const [newMemoTitle, setNewMemoTitle] = useState('');
  const [newMemoType, setNewMemoType] = useState('memo');
  const [newMemoPriority, setNewMemoPriority] = useState('Medium');
  const [showAddMemoModal, setShowAddMemoModal] = useState(false);

  // Coverage states
  const [removingCompanyId, setRemovingCompanyId] = useState(null);
  const [removeReason, setRemoveReason] = useState('');
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyTicker, setNewCompanyTicker] = useState('');
  const [newCompanySector, setNewCompanySector] = useState('');
  const [coverageSearch, setCoverageSearch] = useState('');
  const [coverageFilter, setCoverageFilter] = useState('all'); // all, active, former
  const [coverageTickerLookupLoading, setCoverageTickerLookupLoading] = useState(false);

  // Add company error state
  const [addCompanyError, setAddCompanyError] = useState('');
  
  // Portfolio state
  const [portfolio, setPortfolio] = useState(null);
  const [positions, setPositions] = useState([]);
  const [transactions, setTransactions] = useState([]);

  // Calculate streak and weekly wins from actual data
  const calculateUserStats = (checkoutHistory) => {
    try {
      if (!checkoutHistory || !Array.isArray(checkoutHistory) || checkoutHistory.length === 0) {
        return { streak: 0, weeklyWins: 0 };
      }
      
      // Sort checkout history by date (newest first) for proper streak calculation
      const sortedHistory = [...checkoutHistory].sort((a, b) => new Date(b.date) - new Date(a.date));
      
      let currentStreak = 0;
      const today = getLocalDate();
      
      // Check if there's a checkout for today
      const hasToday = sortedHistory.some(entry => entry.date === today);
      
      if (hasToday) {
        currentStreak = 1;
        
        // Count consecutive days backwards from today
        let checkDate = new Date();
        checkDate.setDate(checkDate.getDate() - 1); // Start with yesterday
        
        for (let i = 1; i <= 30; i++) { // Limit to 30 days to prevent infinite loop
          const checkDateStr = checkDate.toLocaleDateString('en-CA'); // YYYY-MM-DD format
          const hasEntry = sortedHistory.some(entry => entry.date === checkDateStr);
          
          if (hasEntry) {
            currentStreak++;
            checkDate.setDate(checkDate.getDate() - 1); // Move to previous day
          } else {
            break; // Streak broken
          }
        }
      } else {
        // If no checkout today, check if there was one yesterday to start counting backwards
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toLocaleDateString('en-CA'); // YYYY-MM-DD format
        
        const hasYesterday = sortedHistory.some(entry => entry.date === yesterdayStr);
        if (hasYesterday) {
          currentStreak = 1;
          
          // Count consecutive days backwards from yesterday
          let checkDate = new Date();
          checkDate.setDate(checkDate.getDate() - 2); // Start with day before yesterday
          
          for (let i = 2; i <= 30; i++) {
            const checkDateStr = checkDate.toLocaleDateString('en-CA'); // YYYY-MM-DD format
            const hasEntry = sortedHistory.some(entry => entry.date === checkDateStr);
            
            if (hasEntry) {
              currentStreak++;
              checkDate.setDate(checkDate.getDate() - 1);
            } else {
              break;
            }
          }
        }
      }
      
      // Calculate weekly wins (last 7 days with rating >= 3)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const lastWeek = sortedHistory.filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= weekAgo && entry.rating >= 3;
      });
      
      const weeklyWinsCount = lastWeek.length;
      
      return { streak: currentStreak, weeklyWins: weeklyWinsCount };
    } catch (error) {
      console.error('calculateUserStats: Error during calculation:', error);
      return { streak: 0, weeklyWins: 0 };
    }
  };

  const loadDataFromSupabase = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Starting loadDataFromSupabase...');
      const [
        checkoutHistoryData,
        goalsHistoryData,
        activeCoverageData,
        formerCoverageData,
        deliverablesData,
        pipelineIdeasData,
        portfolioData
      ] = await Promise.allSettled([
        dailyCheckinServices.getCheckoutHistory(),
        dailyCheckinServices.getGoalsHistory(),
        coverageServices.getActiveCoverage(),
        coverageServices.getFormerCoverage(),
        deliverablesServices.getDeliverables(),
        pipelineServices.getPipelineIdeas(),
        portfolioServices.getPortfolio()
      ]);

      console.log('Promise.allSettled results:', {
        checkoutHistoryData,
        activeCoverageData,
        formerCoverageData,
        deliverablesData,
        pipelineIdeasData
      });

      // Handle results safely with detailed logging
      const checkoutHistoryResult = checkoutHistoryData.status === 'fulfilled' ? checkoutHistoryData.value : [];
      const goalsHistoryResult = goalsHistoryData.status === 'fulfilled' ? goalsHistoryData.value : [];
      const activeCoverageResult = activeCoverageData.status === 'fulfilled' ? activeCoverageData.value : [];
      const formerCoverageResult = formerCoverageData.status === 'fulfilled' ? formerCoverageData.value : [];
      const deliverablesResult = deliverablesData.status === 'fulfilled' ? deliverablesData.value : [];
      const pipelineIdeasResult = pipelineIdeasData.status === 'fulfilled' ? pipelineIdeasData.value : [];
      const portfolioResult = portfolioData.status === 'fulfilled' ? portfolioData.value : null;

      // Simple logging for debugging
      if (checkoutHistoryData.status === 'rejected') {
        console.error('Checkout history failed:', checkoutHistoryData.reason);
      }

      console.log('Processed results:', {
        checkoutHistoryResult,
        activeCoverageResult,
        formerCoverageResult,
        deliverablesResult,
        pipelineIdeasResult
      });

      setCheckoutHistory(checkoutHistoryResult);
      setGoalsHistory(goalsHistoryResult);
      setCoverage(activeCoverageResult);
      setFormerCompanies(formerCoverageResult);
      setMemos(deliverablesResult.filter(d => d.stage !== 'completed'));
      setCompletedMemos(deliverablesResult.filter(d => d.stage === 'completed'));
      setPipelineIdeas(pipelineIdeasResult);
      
      // Handle portfolio data - only create if we don't have one
      if (portfolioResult) {
        console.log('Found existing portfolio:', portfolioResult);
        setPortfolio(portfolioResult);
        // Load positions and transactions for the portfolio
        const [positionsData, transactionsData] = await Promise.allSettled([
          portfolioServices.getPositions(portfolioResult.id),
          portfolioServices.getTransactions(portfolioResult.id)
        ]);
        
        setPositions(positionsData.status === 'fulfilled' ? positionsData.value : []);
        setTransactions(transactionsData.status === 'fulfilled' ? transactionsData.value : []);
      } else {
        console.log('No portfolio found, creating new one...');
        // Create portfolio if it doesn't exist
        const createResult = await portfolioServices.createPortfolio();
        if (createResult.success) {
          console.log('Created new portfolio:', createResult.data);
          setPortfolio(createResult.data);
          setPositions([]);
          setTransactions([]);
        } else {
          console.error('Failed to create portfolio:', createResult.error);
        }
      }

      // Calculate user stats from checkout history
      console.log('Calculating user stats with checkout history:', checkoutHistoryResult);
      const userStats = calculateUserStats(checkoutHistoryResult);
      console.log('Calculated user stats:', userStats);
      if (userStats) {
        setStreak(userStats.streak || 0);
        setWeeklyWins(userStats.weeklyWins || 0);
      } else {
        setStreak(0);
        setWeeklyWins(0);
      }

      // Get today's goals only if dailyGoals is empty (don't override user input)
      if (!dailyGoals.trim()) {
        const todayGoals = getTodayGoals();
        setDailyGoals(todayGoals);
      }

      // Refresh analytics after data loads
      await loadAnalyticsData();

    } catch (error) {
      console.error('Error loading data:', error);
      addNotification('Failed to load data: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadAnalyticsData = async () => {
    try {
      const analyticsData = await analyticsServices.getDashboardAnalytics();
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error loading analytics:', error);
      addNotification('Failed to load analytics: ' + error.message, 'error');
    }
  };

  // Load data from Supabase on component mount
  useEffect(() => {
    if (user) {
      loadDataFromSupabase();
    }
  }, [user, loadDataFromSupabase]);

  // ✅ SIMPLE onChange handlers - no useCallback to avoid complexity
  const handleDailyGoalsChange = (e) => {
    setDailyGoals(e.target.value);
  };

  const handleCheckoutReflectionChange = (e) => {
    setCheckoutReflection(e.target.value);
  };

  const handleNewIdeaCompanyChange = (e) => {
    setNewIdeaCompany(e.target.value);
  };

  const handleNewIdeaTickerChange = async (e) => {
    const ticker = e.target.value.toUpperCase();
    setNewIdeaTicker(ticker);
    
    // If ticker is at least 1 character, try to look up company name
    if (ticker.length >= 1) {
      setTickerLookupLoading(true);
      try {
        const result = await stockServices.getCompanyOverview(ticker);
        if (result.success && result.data.name) {
          setNewIdeaCompany(result.data.name);
        }
      } catch (error) {
        console.error('Error looking up ticker:', error);
      } finally {
        setTickerLookupLoading(false);
      }
    }
  };

  const handleNewMemoTitleChange = (e) => {
    setNewMemoTitle(e.target.value);
  };

  const handleDisciplineRatingChange = (rating) => {
    setDisciplineRating(rating);
  };

  const handlePassReasonChange = (e) => {
    setPassReason(e.target.value);
  };

  const handleRemoveReasonChange = (e) => {
    setRemoveReason(e.target.value);
  };

  const handleNewCompanyNameChange = (e) => {
    setNewCompanyName(e.target.value);
  };

  const handleNewCompanyTickerChange = async (e) => {
    const ticker = e.target.value.toUpperCase();
    setNewCompanyTicker(ticker);
    
    // If ticker is at least 1 character, try to look up company info
    if (ticker.length >= 1) {
      setCoverageTickerLookupLoading(true);
      try {
        const result = await stockServices.getCompanyOverview(ticker);
        if (result.success && result.data) {
          if (result.data.name) {
            setNewCompanyName(result.data.name);
          }
          if (result.data.sector) {
            setNewCompanySector(result.data.sector);
          }
        }
      } catch (error) {
        console.error('Error looking up ticker:', error);
      } finally {
        setCoverageTickerLookupLoading(false);
      }
    }
  };

  const handleNewCompanySectorChange = (e) => {
    setNewCompanySector(e.target.value);
  };

  // Other functions
  const addPipelineIdea = async () => {
    if (newIdeaCompany.trim()) {
      const result = await pipelineServices.addPipelineIdea({
        company: newIdeaCompany.trim(),
        ticker: newIdeaTicker.trim(),
        status: 'On Deck'
      });
      
      if (result.success) {
      setNewIdeaCompany('');
        setNewIdeaTicker('');
      setShowAddIdeaModal(false);
        await loadDataFromSupabase(); // Refresh data
      } else {
        alert('Error adding pipeline idea: ' + result.error.message);
      }
    }
  };

  const moveToCore = async (ideaId) => {
    const result = await pipelineServices.updatePipelineStatus(ideaId, 'Core');
    if (result.success) {
      await loadDataFromSupabase(); // Refresh data
    } else {
      console.error('Error moving to core:', result.error);
    }
  };

  const moveToOnDeck = async (ideaId) => {
    const result = await pipelineServices.updatePipelineStatus(ideaId, 'On Deck');
    if (result.success) {
      await loadDataFromSupabase(); // Refresh data
    } else {
      console.error('Error moving to on deck:', result.error);
    }
  };

  const initiatePass = (ideaId) => {
    setPassingIdeaId(ideaId);
    setShowPassModal(true);
  };

  const confirmPass = async () => {
    if (passingIdeaId) {
      const result = await pipelineServices.updatePipelineStatus(passingIdeaId, 'Passed', passReason);
      if (result.success) {
        setShowPassModal(false);
        setPassingIdeaId(null);
        setPassReason('Not a Fit');
        await loadDataFromSupabase(); // Refresh data
      } else {
        console.error('Error passing idea:', result.error);
      }
    }
  };

  const cancelPass = () => {
    setShowPassModal(false);
    setPassingIdeaId(null);
    setPassReason('Not a Fit');
  };

  const movePipelineToActive = async (ideaId) => {
    const idea = pipelineIdeas.find(p => p.id === ideaId);
    if (idea && idea.status === 'Core') {
      // Check if already in coverage universe
      const existsInCoverage = coverage.some(c => c.company === idea.company);
      if (!existsInCoverage) {
        const result = await coverageServices.addCompany({
          company: idea.company,
          ticker: idea.ticker || 'TBD',
          sector: 'TBD'
        });
        
        if (result.success) {
          await loadDataFromSupabase(); // Refresh data
          alert(`${idea.company} (${idea.ticker || 'TBD'}) added to Coverage Universe and remains in Core pipeline for continued tracking.`);
        } else {
          alert('Error adding to coverage: ' + result.error.message);
        }
      } else {
        alert(`${idea.company} is already in Coverage Universe.`);
      }
    }
  };

  const archivePipelineIdea = async (ideaId) => {
    const result = await pipelineServices.updatePipelineStatus(ideaId, 'Archived');
    if (result.success) {
      await loadDataFromSupabase(); // Refresh data
    } else {
      console.error('Error archiving idea:', result.error);
    }
  };

  const cancelAddIdea = () => {
    setNewIdeaCompany('');
    setNewIdeaTicker('');
    setShowAddIdeaModal(false);
  };

  const cancelAddMemo = () => {
    setNewMemoTitle('');
    setShowAddMemoModal(false);
  };

  // Delete deliverable
  const deleteDeliverable = async (deliverableId) => {
    if (window.confirm('Are you sure you want to delete this deliverable? This action cannot be undone.')) {
      const result = await deliverablesServices.deleteDeliverable(deliverableId);
      if (result.success) {
        await loadDataFromSupabase(); // Refresh data
        addNotification('Deliverable deleted successfully', 'success');
      } else {
        console.error('Error deleting deliverable:', result.error);
        addNotification('Error deleting deliverable: ' + result.error, 'error');
      }
    }
  };

  const addCompany = async () => {
    console.log('addCompany called');
    if (newCompanyName.trim()) {
      const result = await coverageServices.addCompany({
        company: newCompanyName.trim(),
        ticker: newCompanyTicker.trim(),
        sector: newCompanySector.trim() || 'TBD'
      });
      
      if (result.success) {
        setNewCompanyName('');
        setNewCompanyTicker('');
        setNewCompanySector('');
        setShowAddCompanyModal(false);
        setAddCompanyError('');
        await loadDataFromSupabase(); // Refresh data
      } else {
        setAddCompanyError(result.error.message || 'Unknown error');
        alert('Error adding company: ' + result.error.message);
      }
    }
  };

  const cancelAddCompany = () => {
    setNewCompanyName('');
    setNewCompanyTicker('');
    setNewCompanySector('');
    setShowAddCompanyModal(false);
  };

  // Get checkout history from localStorage
  const getCheckoutHistory = () => {
    return checkoutHistory;
  };

  // Get today's daily goals from goalsHistory
  const getTodayGoals = () => {
    console.log('getTodayGoals called with goalsHistory:', goalsHistory);
    
    if (!goalsHistory || !Array.isArray(goalsHistory)) {
      console.log('goalsHistory is not an array in getTodayGoals, returning empty string');
      return '';
    }
    
    const today = getLocalDate();
    const todayEntry = goalsHistory.find(entry => entry.date === today);
    return todayEntry ? todayEntry.goals : '';
  };

  // Get daily goals history from state
  const getGoalsHistory = () => {
    return goalsHistory;
  };

  const completeDailyCheckin = async () => {
    if (dailyGoals.trim()) {
      const today = getLocalDate();
      const result = await dailyCheckinServices.upsertCheckin({
        date: today,
        goals: [dailyGoals.trim()],
        completed: false
      });
      
      if (result.success) {
        setDailyGoals(''); // Clear the input
        await loadDataFromSupabase(); // Refresh data but don't reload goals into input
        alert('Daily goals set! Stay focused and crush your deliverables.');
      } else {
        alert('Error saving goals: ' + result.error.message);
      }
    }
  };

  // Mark daily goals as completed
  const markGoalsCompleted = async (date) => {
    const result = await dailyCheckinServices.markGoalsCompleted(date);
    if (result.success) {
      await loadDataFromSupabase(); // Refresh data
      } else {
      console.error('Error marking goals as completed:', result.error);
    }
  };

  const completeDailyCheckout = async () => {
    if (checkoutReflection.trim()) {
      const today = getLocalDate();
      console.log('Saving daily checkout with rating:', disciplineRating);
      
      const result = await dailyCheckinServices.upsertCheckin({
        date: today,
        reflection: checkoutReflection.trim(),
        rating: disciplineRating, // Include the discipline rating
        completed: true
      });
      
      if (result.success) {
        console.log('Daily checkout saved successfully with rating:', disciplineRating);
        // Clear form
      setCheckoutReflection('');
      setDisciplineRating(5);
      
        // Force re-render of history and recalculate stats
        await loadDataFromSupabase(); // This will recalculate streak and weekly wins
        
        alert(`Day completed! ${disciplineRating >= 3 ? 'Great job!' : 'Focus better tomorrow.'}`);
      } else {
        console.error('Error saving checkout:', result.error);
        alert('Error saving checkout: ' + result.error.message);
      }
    }
  };

  // Utility functions
  const getDaysAgo = (dateString) => {
    if (!dateString || dateString === 'Never' || dateString === 'TBD') return Infinity;
    
    try {
    const date = new Date(dateString);
      if (isNaN(date.getTime())) return Infinity; // Invalid date
      
    const today = new Date();
    const diffTime = Math.abs(today - date);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } catch (error) {
      console.error('Error calculating days ago for:', dateString, error);
      return Infinity;
    }
  };

  const getStageColor = (stage) => {
    switch(stage) {
      case 'Started': return 'bg-blue-100 text-blue-800';
      case 'In Draft': return 'bg-yellow-100 text-yellow-800';
      case 'Sent': return 'bg-green-100 text-green-800';
      case 'Stalled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // ✅ Simple Navigation - no text inputs so can stay internal
  const Navigation = () => {
    const { user, signOut } = useAuth();
    const [showUserMenu, setShowUserMenu] = useState(false);

    return (
      <nav className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-semibold text-gray-900">Analyst OS</h1>
              <div className="flex space-x-1">
            <button
                  onClick={() => setCurrentView('dashboard')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentView === 'dashboard'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  Dashboard
            </button>
                <button
                  onClick={() => setCurrentView('coverage')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentView === 'coverage'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  Coverage
                </button>
                <button
                  onClick={() => setCurrentView('memos')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentView === 'memos'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  Memos/Models
                </button>
                <button
                  onClick={() => setCurrentView('pipeline')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentView === 'pipeline'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  Pipeline
                </button>
                <button
                  onClick={() => setCurrentView('discipline')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentView === 'discipline'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  Daily Check-in
                </button>

                <button
                  onClick={() => setCurrentView('stock-crm')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentView === 'stock-crm'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  Stock CRM
                </button>
                <button
                  onClick={() => setCurrentView('portfolio')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentView === 'portfolio'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  Portfolio
                </button>
        </div>
      </div>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 focus:outline-none"
              >
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
            </div>
                <span className="text-sm font-medium">
                  {user?.email?.split('@')[0] || 'User'}
                </span>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border">
                  <div className="px-4 py-2 text-sm text-gray-700 border-b">
                    <div className="font-medium">{user?.email}</div>
                    <div className="text-gray-500">Signed in</div>
            </div>
                  <button
                    onClick={async () => {
                      await signOut();
                      setShowUserMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign out</span>
                  </button>
            </div>
              )}
            </div>
          </div>
        </div>
      </nav>
    );
  };

  // ✅ Simple Dashboard - no text inputs so can stay internal
  const Dashboard = () => {
    return (
      <div className="space-y-6">
        {/* Today's Plan Section */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Target className="mr-2" size={20} />
            Today's Plan
          </h3>
          {dailyGoals ? (
            <div className="space-y-2">
              {dailyGoals.split('\n').map((goal, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-4 h-4 border-2 border-gray-300 rounded-full"></div>
                  <span className="text-gray-700">{goal}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No daily goals set yet.</p>
              <p className="text-sm mt-1">Set your goals in the Daily Check-in section!</p>
              <button 
                onClick={() => setCurrentView('discipline')}
                className="mt-3 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors">
                Start Daily Check-in
              </button>
            </div>
          )}
        </div>

        {/* Analytics Grid - Testing components one by one */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <QuickStatsCard analytics={analytics} />
          <PipelineVelocityCard pipelineVelocity={analytics?.pipelineVelocity} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CoverageActivityCard coverageActivity={analytics?.coverageActivity} />
          {/* <ProductivityMetricsCard productivityMetrics={analytics?.productivityMetrics} /> */}
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button 
              onClick={() => setCurrentView('discipline')}
              className="p-3 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
              Start Daily Check-in
            </button>
            <button 
              onClick={() => setCurrentView('pipeline')}
              className="p-3 bg-green-500 text-white rounded hover:bg-green-600 transition-colors">
              Add Pipeline Idea
            </button>
            <button 
              onClick={() => setCurrentView('memos')}
              className="p-3 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors">
              Create Memo/Model
            </button>
          </div>
        </div>

        {/* Data Management */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">Data Management</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button 
              onClick={async () => {
                try {
                  const data = {
                    dailyCheckins: await dailyCheckinServices.getCheckoutHistory(),
                    coverage: await coverageServices.getActiveCoverage(),
                    formerCoverage: await coverageServices.getFormerCoverage(),
                    deliverables: await deliverablesServices.getDeliverables(),
                    pipelineIdeas: await pipelineServices.getPipelineIdeas(),
                    exportDate: new Date().toISOString()
                  };
                  
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `analyst-os-backup-${new Date().toISOString().split('T')[0]}.json`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                  
                  addNotification('Data exported successfully!', 'success');
                } catch (error) {
                  addNotification('Export failed: ' + error.message, 'error');
                }
              }}
              className="w-full p-3 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors">
              Export Data
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render current view with external components for text inputs
  const renderCurrentView = () => {
    switch(currentView) {
      case 'dashboard': 
        return <Dashboard />;
      case 'pipeline': 
        return (
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold">Investment Pipeline</h2>
                  <p className="text-gray-600">Track ideas through On Deck → Core → Active Coverage</p>
                </div>
                <button 
                  onClick={() => setShowAddIdeaModal(true)}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors flex items-center">
                  <Plus size={16} className="mr-2" />
                  Add New Idea
                </button>
              </div>
            </div>

            {/* Pipeline Stages */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* On Deck Column */}
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-4 border-b bg-blue-50">
                  <h3 className="font-semibold text-lg text-blue-900">
                    On Deck ({pipelineIdeas.filter(idea => idea.status === 'On Deck').length})
                  </h3>
                  <p className="text-sm text-blue-700">Initial ideas for evaluation</p>
                </div>
                <div className="p-4 space-y-4">
                  {pipelineIdeas.filter(idea => idea.status === 'On Deck').map((idea) => (
                    <div key={idea.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-semibold">{idea.company}</h4>
                            {idea.ticker && (
                              <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium">
                                {idea.ticker}
                              </span>
                            )}
                            {idea.inCoverage && (
                              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                                In Coverage
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            <div>Added: {idea.dateAdded}</div>
                            <div>{idea.daysInPipeline} days in pipeline</div>
                          </div>
                        </div>
                        <div className="flex flex-col space-y-1">
                          <button 
                            onClick={() => moveToCore(idea.id)}
                            className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600">
                            → Core
                          </button>
                          <button 
                            onClick={() => initiatePass(idea.id)}
                            className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600">
                            Pass
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {pipelineIdeas.filter(idea => idea.status === 'On Deck').length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-gray-500 mb-2">No ideas on deck</p>
                      <p className="text-sm text-gray-400">Add new investment ideas to start building your pipeline</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Core Column */}
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-4 border-b bg-green-50">
                  <h3 className="font-semibold text-lg text-green-900">
                    Core ({pipelineIdeas.filter(idea => idea.status === 'Core').length})
                  </h3>
                  <p className="text-sm text-green-700">Active research and analysis</p>
                </div>
                <div className="p-4 space-y-4">
                  {pipelineIdeas.filter(idea => idea.status === 'Core').map((idea) => (
                    <div key={idea.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                          <h4 className="font-semibold">{idea.company}</h4>
                            {idea.ticker && (
                              <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium">
                                {idea.ticker}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            <div>Added: {idea.dateAdded}</div>
                            <div>{idea.daysInPipeline} days in pipeline</div>
                          </div>
                        </div>
                        <div className="flex flex-col space-y-1">
                          <button 
                            onClick={() => movePipelineToActive(idea.id)}
                            disabled={idea.inCoverage}
                            className={`px-2 py-1 rounded text-xs ${
                              idea.inCoverage 
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                                : 'bg-green-500 text-white hover:bg-green-600'
                            }`}>
                            {idea.inCoverage ? 'In Coverage' : 'Add to Coverage'}
                          </button>
                          <button 
                            onClick={() => moveToOnDeck(idea.id)}
                            className="bg-yellow-500 text-white px-2 py-1 rounded text-xs hover:bg-yellow-600">
                            ← On Deck
                          </button>
                          <button 
                            onClick={() => initiatePass(idea.id)}
                            className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600">
                            Pass
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {pipelineIdeas.filter(idea => idea.status === 'Core').length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-gray-500 mb-2">No core ideas</p>
                      <p className="text-sm text-gray-400">Move ideas from On Deck to Core for active research</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Passed Column */}
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-4 border-b bg-red-50">
                  <h3 className="font-semibold text-lg text-red-900">
                    Passed ({pipelineIdeas.filter(idea => idea.status === 'Passed').length})
                  </h3>
                  <p className="text-sm text-red-700">Ideas we decided to pass on</p>
                </div>
                <div className="p-4 space-y-4">
                  {pipelineIdeas.filter(idea => idea.status === 'Passed').map((idea) => (
                    <div key={idea.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                          <h4 className="font-semibold">{idea.company}</h4>
                            {idea.ticker && (
                              <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium">
                                {idea.ticker}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            <div>Added: {idea.dateAdded}</div>
                            <div className="text-red-600 font-medium">Passed: {idea.passReason || 'No reason specified'}</div>
                            <div>Pass Date: {idea.passDate || 'Date not set'}</div>
                          </div>
                        </div>
                        <div className="flex flex-col space-y-1">
                          <button 
                            onClick={() => archivePipelineIdea(idea.id)}
                            className="bg-gray-500 text-white px-2 py-1 rounded text-xs hover:bg-gray-600">
                            Archive
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {pipelineIdeas.filter(idea => idea.status === 'Passed').length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-gray-500 mb-2">No passed ideas</p>
                      <p className="text-sm text-gray-400">Ideas you decide to pass on will appear here</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Add Pipeline Idea Modal */}
            {showAddIdeaModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-96">
                  <h3 className="text-lg font-semibold mb-4">Add New Pipeline Idea</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ticker
                      </label>
                      <input
                        type="text"
                        value={newIdeaTicker}
                        onChange={handleNewIdeaTickerChange}
                        className="w-full p-3 border rounded-lg"
                        placeholder="e.g., PLTR"
                        onKeyPress={(e) => e.key === 'Enter' && addPipelineIdea()}
                      />
                      {tickerLookupLoading && (
                        <p className="text-xs text-blue-600 mt-1">
                          Looking up company info...
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Company Name
                        {tickerLookupLoading && (
                          <span className="ml-2 text-xs text-gray-500">(auto-filled)</span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={newIdeaCompany}
                        onChange={handleNewIdeaCompanyChange}
                        className="w-full p-3 border rounded-lg"
                        placeholder="e.g., Palantir Technologies"
                        onKeyPress={(e) => e.key === 'Enter' && addPipelineIdea()}
                      />
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={addPipelineIdea}
                        className="flex-1 bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition-colors"
                      >
                        Add to Pipeline
                      </button>
                      <button
                        onClick={cancelAddIdea}
                        className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Pass Modal */}
            {showPassModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-96">
                  <h3 className="text-lg font-semibold mb-4">Pass on Idea</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Reason for Passing
                      </label>
                      <select
                        value={passReason}
                        onChange={handlePassReasonChange}
                        className="w-full p-3 border rounded-lg"
                      >
                        <option value="Management">Management</option>
                        <option value="Outlook">Outlook</option>
                        <option value="Not a Fit">Not a Fit</option>
                        <option value="Valuation">Valuation</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={confirmPass}
                        className="flex-1 bg-red-500 text-white py-2 rounded hover:bg-red-600 transition-colors"
                      >
                        Confirm Pass
                      </button>
                      <button
                        onClick={cancelPass}
                        className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      case 'discipline': 
        return (
          <div className="space-y-6">
            {/* Morning Check-in and End-of-Day Check-out at the top */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <CheckCircle className="mr-2" size={20} />
                  Morning Check-in
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      What are your top 1-2 outputs today?
                    </label>
                    <textarea
                      value={dailyGoals}
                      onChange={handleDailyGoalsChange}
                      className="w-full p-3 border rounded-lg resize-none"
                      rows="3"
                      placeholder="e.g., Finish NVDA model update, Send Big Tech memo draft..."
                    />
                  </div>
                  <button 
                    onClick={completeDailyCheckin}
                    className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition-colors">
                    Set Daily Goals
                  </button>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Award className="mr-2" size={20} />
                  End-of-Day Check-out
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Did you hit your goals? What did you accomplish?
                    </label>
                    <textarea
                      value={checkoutReflection}
                      onChange={handleCheckoutReflectionChange}
                      className="w-full p-3 border rounded-lg resize-none"
                      rows="3"
                      placeholder="Reflect on your day's progress..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Discipline Rating (1-5)
                    </label>
                    <div className="flex space-x-2">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          key={rating}
                          onClick={() => handleDisciplineRatingChange(rating)}
                          className={`w-12 h-12 rounded-full font-bold transition-colors ${
                            rating <= disciplineRating
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                          }`}
                        >
                          {rating}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button 
                    onClick={completeDailyCheckout}
                    className="w-full bg-green-500 text-white py-3 rounded hover:bg-green-600 transition-colors font-medium">
                    Complete Daily Check-out
                  </button>
                </div>
              </div>
            </div>

            {/* Enhanced Stats */}
            <EnhancedStats 
              checkoutHistory={checkoutHistory}
              goalsHistory={goalsHistory}
              streak={streak}
              weeklyWins={weeklyWins}
            />

            {/* Calendar */}
            <Calendar 
              checkoutHistory={checkoutHistory}
              goalsHistory={goalsHistory}
            />

            {/* Performance Stats */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold mb-4">Performance Stats</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{streak}</div>
                  <div className="text-sm text-gray-600">Current Streak</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{weeklyWins}</div>
                  <div className="text-sm text-gray-600">Weekly Wins</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {checkoutHistory.length > 0 
                      ? (checkoutHistory.slice(-7).reduce((sum, item) => sum + item.rating, 0) / Math.min(checkoutHistory.length, 7)).toFixed(1)
                      : '0.0'
                    }/5
                  </div>
                  <div className="text-sm text-gray-600">Avg. Discipline Rating (7d)</div>
                </div>
              </div>
            </div>

            {/* Checkout History */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Recent Check-out History</h3>
                {checkoutHistory.length > 1 && (
                  <div className="text-sm text-gray-600">
                    {(() => {
                      const recent = checkoutHistory.slice(-3);
                      const older = checkoutHistory.slice(-6, -3);
                      const recentAvg = recent.reduce((sum, item) => sum + item.rating, 0) / recent.length;
                      const olderAvg = older.length > 0 ? older.reduce((sum, item) => sum + item.rating, 0) / older.length : recentAvg;
                      const trend = recentAvg > olderAvg ? '📈 Improving' : recentAvg < olderAvg ? '📉 Declining' : '➡️ Stable';
                      return <span className="font-medium">{trend}</span>;
                    })()}
                  </div>
                )}
              </div>
              {checkoutHistory.length > 0 ? (
                <div className="space-y-4">
                  {checkoutHistory.slice(-10).reverse().map((entry, index) => (
                    <div key={index} className="border-l-4 border-blue-500 pl-4 py-3 bg-gray-50 rounded">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium text-gray-900">{entry.date}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">Rating:</span>
                          <span className={`px-2 py-1 rounded text-sm font-medium ${
                            entry.rating >= 4 ? 'bg-green-100 text-green-800' :
                            entry.rating >= 3 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {entry.rating}/5
                          </span>
                        </div>
                      </div>
                      <p className="text-gray-700 text-sm leading-relaxed">{entry.reflection}</p>
                    </div>
                  ))}
                  {checkoutHistory.length > 10 && (
                    <div className="text-center pt-4">
                      <span className="text-sm text-gray-500">Showing 10 most recent entries</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No check-out history yet.</p>
                  <p className="text-sm mt-1">Complete your first daily check-out to start tracking your progress!</p>
                </div>
              )}
            </div>

            {/* Daily Goals History */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold mb-4">Daily Goals History</h3>
              <div className="space-y-4">
                {goalsHistory.length > 0 ? (
                  goalsHistory.map((entry, index) => (
                    <div key={index} className="border-l-4 border-green-500 pl-4 py-3 bg-gray-50 rounded">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium text-gray-900">{entry.date}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">Status:</span>
                          <span className={`px-2 py-1 rounded text-sm font-medium ${
                            entry.completed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {entry.completed ? 'Completed' : 'In Progress'}
                          </span>
                        </div>
                      </div>
                      <p className="text-gray-700 text-sm leading-relaxed">{entry.goals}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No goals history yet.</p>
                    <p className="text-sm mt-1">Set your first daily goals to start tracking!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      case 'coverage':
        return (
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex justify-between items-center mb-4">
                <div>
              <h2 className="text-xl font-semibold">Coverage Universe</h2>
                  <p className="text-gray-600">Manage your active and former coverage</p>
            </div>
                <button 
                  onClick={() => {
                    console.log('Add Company button clicked');
                    console.log('Current view:', currentView);
                    setShowAddCompanyModal(true);
                  }}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors flex items-center">
                  <Plus size={16} className="mr-2" />
                  Add Company
                </button>
              </div>
              
              {/* Search and Filter */}
              <div className="flex space-x-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search companies..."
                    value={coverageSearch}
                    onChange={(e) => setCoverageSearch(e.target.value)}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
                <select
                  value={coverageFilter}
                  onChange={(e) => setCoverageFilter(e.target.value)}
                  className="p-2 border rounded-lg"
                >
                  <option value="all">All Companies</option>
                  <option value="active">Active Coverage</option>
                  <option value="former">Former Coverage</option>
                </select>
              </div>
            </div>

            {/* Active Coverage */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-4 border-b bg-green-50">
                <h3 className="font-semibold text-lg text-green-900">
                  Active Coverage ({(() => {
                    const filtered = coverage.filter(company => {
                      const matchesSearch = !coverageSearch || 
                        company.company.toLowerCase().includes(coverageSearch.toLowerCase()) ||
                        company.ticker.toLowerCase().includes(coverageSearch.toLowerCase()) ||
                        (company.sector && company.sector.toLowerCase().includes(coverageSearch.toLowerCase()));
                      const matchesFilter = coverageFilter === 'all' || coverageFilter === 'active';
                      return matchesSearch && matchesFilter;
                    });
                    return filtered.length;
                  })()})
                </h3>
                <p className="text-sm text-green-700">Companies currently in your coverage universe</p>
              </div>
              <div className="p-4 space-y-4">
                {(() => {
                                      const filtered = coverage.filter(company => {
                      const matchesSearch = !coverageSearch || 
                        company.company.toLowerCase().includes(coverageSearch.toLowerCase()) ||
                        company.ticker.toLowerCase().includes(coverageSearch.toLowerCase()) ||
                        (company.sector && company.sector.toLowerCase().includes(coverageSearch.toLowerCase()));
                      const matchesFilter = coverageFilter === 'all' || coverageFilter === 'active';
                      return matchesSearch && matchesFilter;
                    });
                  
                  return filtered.length > 0 ? (
                    filtered.map((company) => (
                      <div key={company.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h4 className="font-semibold">{company.company}</h4>
                              {company.ticker && (
                                <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium">
                                  {company.ticker}
                                </span>
                              )}
                              {company.sector && (
                                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                                  {company.sector}
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                        <div>
                                <span className="font-medium">Last Model:</span> {company.lastModelDate || 'Never'}
                                {company.lastModelDate && (
                                  <span className="text-gray-500 ml-1">({getDaysAgo(company.lastModelDate)} days ago)</span>
                                )}
                        </div>
                              <div>
                                <span className="font-medium">Last Memo:</span> {company.lastMemoDate || 'Never'}
                                {company.lastMemoDate && (
                                  <span className="text-gray-500 ml-1">({getDaysAgo(company.lastMemoDate)} days ago)</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => updateLastModel(company.id)}
                              className="bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600">
                              Update
                            </button>
                            <button 
                              onClick={() => updateLastMemo(company.id)}
                              className="bg-green-500 text-white px-3 py-1 rounded text-xs hover:bg-green-600">
                              Memo
                            </button>
                            <button 
                              onClick={() => initiateRemove(company.id)}
                              className="bg-red-500 text-white px-3 py-1 rounded text-xs hover:bg-red-600">
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500 mb-2">No companies in coverage yet</p>
                      <p className="text-sm text-gray-400">Add companies from your pipeline or directly to start tracking coverage</p>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Former Coverage */}
            {formerCompanies.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-4 border-b bg-red-50">
                  <h3 className="font-semibold text-lg text-red-900">
                    Former Coverage ({(() => {
                      const filtered = formerCompanies.filter(company => {
                        const matchesSearch = !coverageSearch || 
                          company.company.toLowerCase().includes(coverageSearch.toLowerCase()) ||
                          company.ticker.toLowerCase().includes(coverageSearch.toLowerCase()) ||
                          (company.sector && company.sector.toLowerCase().includes(coverageSearch.toLowerCase()));
                        const matchesFilter = coverageFilter === 'all' || coverageFilter === 'former';
                        return matchesSearch && matchesFilter;
                      });
                      return filtered.length;
                    })()})
                  </h3>
                  <p className="text-sm text-red-700">Companies removed from coverage with reasons</p>
                </div>
                <div className="p-4 space-y-4">
                  {(() => {
                    const filtered = formerCompanies.filter(company => {
                      const matchesSearch = !coverageSearch || 
                        company.company.toLowerCase().includes(coverageSearch.toLowerCase()) ||
                        company.ticker.toLowerCase().includes(coverageSearch.toLowerCase());
                      const matchesFilter = coverageFilter === 'all' || coverageFilter === 'former';
                      return matchesSearch && matchesFilter;
                    });
                    
                    return filtered.length > 0 ? (
                      filtered.map((company) => (
                        <div key={company.id} className="border rounded-lg p-4 bg-red-50 border-red-200">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <h4 className="font-semibold">{company.company}</h4>
                                {company.ticker && (
                                  <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium">
                                    {company.ticker}
                        </span>
                                )}
                                {company.sector && (
                                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                                    {company.sector}
                                  </span>
                                )}
                                <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-medium">
                                  {company.removalReason}
                                </span>
                        </div>
                              <div className="text-sm text-gray-600">
                                <div>Removed: {company.removalDate}</div>
                                <div>Last Model: {company.lastModelDate || 'Never'}</div>
                                <div>Last Memo: {company.lastMemoDate || 'Never'}</div>
                        </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-8">No former companies match the search criteria</p>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Remove Modal */}
            {showRemoveModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-96">
                  <h3 className="text-lg font-semibold mb-4">Remove from Coverage</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Reason for Removal
                      </label>
                      <select
                        value={removeReason}
                        onChange={handleRemoveReasonChange}
                        className="w-full p-3 border rounded-lg"
                      >
                        <option value="Bad business right now">Bad business right now</option>
                        <option value="PM doesn't like it">PM doesn't like it</option>
                        <option value="Valuation">Valuation</option>
                        <option value="Market">Market</option>
                        <option value="Not a fit">Not a fit</option>
                      </select>
            </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => moveToFormerCoverage(removingCompanyId)}
                        className="flex-1 bg-red-500 text-white py-2 rounded hover:bg-red-600 transition-colors"
                      >
                        Remove from Coverage
                      </button>
                      <button
                        onClick={cancelRemove}
                        className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Add Company Modal */}
            {showAddCompanyModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-96">
                  <h3 className="text-lg font-semibold mb-4">Add New Company to Coverage</h3>
                  <div className="space-y-4">
                    {addCompanyError && (
                      <div className="text-red-600 text-sm mb-2">{addCompanyError}</div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ticker
                      </label>
                      <input
                        type="text"
                        value={newCompanyTicker}
                        onChange={handleNewCompanyTickerChange}
                        className="w-full p-3 border rounded-lg"
                        placeholder="e.g., AAPL"
                        onKeyPress={(e) => e.key === 'Enter' && addCompany()}
                      />
                      {coverageTickerLookupLoading && (
                        <p className="text-xs text-blue-600 mt-1">
                          Looking up company info...
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Company Name
                        {coverageTickerLookupLoading && (
                          <span className="ml-2 text-xs text-gray-500">(auto-filled)</span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={newCompanyName}
                        onChange={handleNewCompanyNameChange}
                        className="w-full p-3 border rounded-lg"
                        placeholder="e.g., Apple Inc."
                        onKeyPress={(e) => e.key === 'Enter' && addCompany()}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sector
                        {coverageTickerLookupLoading && (
                          <span className="ml-2 text-xs text-gray-500">(auto-filled)</span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={newCompanySector}
                        onChange={handleNewCompanySectorChange}
                        className="w-full p-3 border rounded-lg"
                        placeholder="e.g., Technology"
                        onKeyPress={(e) => e.key === 'Enter' && addCompany()}
                      />
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={addCompany}
                        className="flex-1 bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition-colors"
                      >
                        Add to Coverage
                      </button>
                      <button
                        onClick={cancelAddCompany}
                        className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      case 'memos':
        return (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-semibold">Memos & Models</h2>
                  <p className="text-gray-600">Track your research deliverables and their progress</p>
                </div>
                <button 
                  onClick={() => setShowAddMemoModal(true)}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors flex items-center">
                  <Plus size={16} className="mr-2" />
                  New Deliverable
                </button>
              </div>

              <div className="space-y-4">
                {memos.map((memo) => (
                  <div key={memo.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-semibold text-lg">{memo.title}</h3>
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                            {memo.type}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span>Working for {memo.daysWorking} days</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col space-y-2 w-64">
                        {/* Priority Toggle */}
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-medium text-gray-600 w-12">Priority:</span>
                          <div className="flex space-x-1">
                            {['Low', 'Medium', 'High'].map((priority) => (
                              <button
                                key={priority}
                                onClick={() => {
                                  const updatedMemos = memos.map(m => 
                                    m.id === memo.id ? { ...m, priority } : m
                                  );
                                  setMemos(updatedMemos);
                                }}
                                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                  memo.priority === priority
                                    ? priority === 'High' ? 'bg-red-100 text-red-800' :
                                      priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                              >
                                {priority}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Stage Progress Bar */}
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-medium text-gray-600 w-12">Stage:</span>
                          <div className="flex space-x-1 flex-1">
                            {['Started', 'In Draft', 'Sent'].map((stage, index) => (
                              <div
                                key={stage}
                                className={`flex-1 h-2 rounded-full ${
                                  index <= ['Started', 'In Draft', 'Sent'].indexOf(memo.stage)
                                    ? 'bg-blue-500'
                                    : 'bg-gray-200'
                                }`}
                              />
                            ))}
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStageColor(memo.stage)}`}>
                            {memo.stage}
                          </span>
                        </div>

                        {/* Stage Navigation */}
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-medium text-gray-600 w-12">Stage:</span>
                          <button
                            onClick={async () => {
                              const stages = ['Started', 'In Draft', 'Sent'];
                              const currentIndex = stages.indexOf(memo.stage);
                              const prevStage = currentIndex > 0 ? stages[currentIndex - 1] : memo.stage;
                              const result = await deliverablesServices.updateDeliverableStage(memo.id, prevStage);
                              if (result.success) {
                                await loadDataFromSupabase(); // Refresh data
                              } else {
                                console.error('Error updating stage:', result.error);
                              }
                            }}
                            disabled={memo.stage === 'Started'}
                            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                              memo.stage === 'Started'
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-blue-500 text-white hover:bg-blue-600'
                            }`}
                          >
                            Previous 
                          </button>
                          <button
                            onClick={async () => {
                              const stages = ['Started', 'In Draft', 'Sent'];
                              const currentIndex = stages.indexOf(memo.stage);
                              const nextStage = currentIndex < stages.length - 1 ? stages[currentIndex + 1] : memo.stage;
                              const result = await deliverablesServices.updateDeliverableStage(memo.id, nextStage);
                              if (result.success) {
                                await loadDataFromSupabase(); // Refresh data
                              } else {
                                console.error('Error updating stage:', result.error);
                              }
                            }}
                            disabled={memo.stage === 'Sent'}
                            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                              memo.stage === 'Sent'
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-blue-500 text-white hover:bg-blue-600'
                            }`}
                          >
                            Next 
                          </button>
                        </div>

                        {/* Complete and Stall Actions */}
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-medium text-gray-600 w-12">Actions:</span>
                          <button 
                            onClick={async () => {
                              const result = await deliverablesServices.updateDeliverableStage(memo.id, 'completed');
                              if (result.success) {
                                await loadDataFromSupabase(); // Refresh data
                              } else {
                                console.error('Error completing deliverable:', result.error);
                              }
                            }}
                            className="bg-green-500 text-white px-2 py-1 rounded text-xs font-medium hover:bg-green-600">
                            Complete
                        </button>
                        <button 
                            onClick={async () => {
                              const result = await deliverablesServices.updateDeliverableStage(memo.id, 'stalled');
                              if (result.success) {
                                await loadDataFromSupabase(); // Refresh data
                              } else {
                                console.error('Error stalling deliverable:', result.error);
                              }
                            }}
                            className="bg-red-500 text-white px-2 py-1 rounded text-xs font-medium hover:bg-red-600">
                            Stall
                        </button>
                        <button 
                            onClick={() => deleteDeliverable(memo.id)}
                            className="bg-gray-500 text-white px-2 py-1 rounded text-xs font-medium hover:bg-gray-600 flex items-center">
                            <Trash2 size={12} className="mr-1" />
                            Delete
                        </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Completed Deliverables */}
            {completedMemos.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-xl font-semibold">Completed Deliverables</h2>
                    <p className="text-gray-600">Recently completed research and analysis</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {completedMemos.map((memo) => (
                    <div key={memo.id} className="border rounded-lg p-4 bg-green-50 border-green-200">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="font-semibold text-lg">{memo.title}</h3>
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                              {memo.type}
                            </span>
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                              Completed
                            </span>
                          </div>
                          
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span>Priority: {memo.priority}</span>
                            <span>Completed: {memo.completedDate}</span>
                            <span>Worked for {memo.daysWorking} days</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center">
                          <button 
                            onClick={() => deleteDeliverable(memo.id)}
                            className="bg-gray-500 text-white px-2 py-1 rounded text-xs font-medium hover:bg-gray-600 flex items-center">
                            <Trash2 size={12} className="mr-1" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add Memo Modal */}
            {showAddMemoModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-96">
                  <h3 className="text-lg font-semibold mb-4">Add New Deliverable</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Title
                      </label>
                      <input
                        type="text"
                        value={newMemoTitle}
                        onChange={handleNewMemoTitleChange}
                        className="w-full p-3 border rounded-lg"
                        placeholder="e.g., TSLA Q2 Earnings Analysis"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Type
                      </label>
                      <select
                        value={newMemoType}
                        onChange={(e) => setNewMemoType(e.target.value)}
                        className="w-full p-3 border rounded-lg"
                      >
                        <option value="Memo">Memo</option>
                        <option value="Model">Model</option>
                        <option value="Report">Report</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Priority
                      </label>
                      <select
                        value={newMemoPriority}
                        onChange={(e) => setNewMemoPriority(e.target.value)}
                        className="w-full p-3 border rounded-lg"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                      </select>
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={async () => {
                          if (newMemoTitle.trim()) {
                            const result = await deliverablesServices.addDeliverable({
                              title: newMemoTitle.trim(),
                              type: newMemoType,
                              stage: 'Started',
                              priority: newMemoPriority
                            });
                            
                            if (result.success) {
                            setNewMemoTitle('');
                            setShowAddMemoModal(false);
                              await loadDataFromSupabase(); // Refresh data
                            } else {
                              alert('Error creating deliverable: ' + result.error.message);
                            }
                          }
                        }}
                        className="flex-1 bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition-colors"
                      >
                        Create Deliverable
                      </button>
                      <button
                        onClick={cancelAddMemo}
                        className="flex-1 bg-gray-300 text-gray-700 py-2 rounded hover:bg-gray-400 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      case 'stock-crm':
        return (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-semibold">Stock CRM</h2>
                  <p className="text-gray-600">Research and track individual stocks with live data</p>
                </div>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Enter ticker (e.g., AAPL)"
                    value={stockSearchTicker}
                    onChange={(e) => setStockSearchTicker(e.target.value)}
                    className="px-3 py-2 border rounded-lg"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleStockSearch();
                      }
                    }}
                  />
                  <button 
                    onClick={handleStockSearch}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  >
                    Search
                  </button>
                </div>
              </div>
              
              <div className="text-center py-12 text-gray-500">
                <BarChart3 size={64} className="mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">Search for a Stock</h3>
                <p className="text-sm">Enter a ticker symbol above to view detailed stock information, fundamentals, and add research notes.</p>
                <button 
                  onClick={async () => {
                    const { stockServices } = await import('./stockServices');
                    const status = await stockServices.checkAPIStatus();
                    console.log('API Status:', status);
                    alert(status.success ? 'API is working!' : `API Error: ${status.error}`);
                  }}
                  className="mt-4 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                  Test API Status
                </button>
              </div>
            </div>
          </div>
        );

      case 'portfolio':
        return (
          <Portfolio 
            portfolio={portfolio}
            positions={positions}
            transactions={transactions}
            onRefresh={loadDataFromSupabase}
          />
        );
      default:
        // Check if it's a stock CRM page (format: stock-crm-TICKER)
        if (currentView.startsWith('stock-crm-')) {
          const ticker = currentView.replace('stock-crm-', '');
          return <StockCRM ticker={ticker} onBack={() => setCurrentView('stock-crm')} />;
        }
        return <Dashboard />;
    }
  };

  // Update last model date for a company
  const updateLastModel = async (companyId) => {
    const result = await coverageServices.updateLastModel(companyId);
    if (result.success) {
      await loadDataFromSupabase(); // Refresh data
    } else {
      console.error('Error updating last model:', result.error);
    }
  };

  // Update last memo date for a company
  const updateLastMemo = async (companyId) => {
    const result = await coverageServices.updateLastMemo(companyId);
    if (result.success) {
      await loadDataFromSupabase(); // Refresh data
    } else {
      console.error('Error updating last memo:', result.error);
    }
  };

  // Move company to former coverage
  const moveToFormerCoverage = async (companyId) => {
    const result = await coverageServices.moveToFormerCoverage(companyId, removeReason);
    if (result.success) {
      await loadDataFromSupabase(); // Refresh data
      
      // Reset modal state
      setShowRemoveModal(false);
      setRemovingCompanyId(null);
      setRemoveReason('Not a fit');
    } else {
      console.error('Error moving to former coverage:', result.error);
    }
  };

  // Initiate removal process
  const initiateRemove = (companyId) => {
    setRemovingCompanyId(companyId);
    setShowRemoveModal(true);
  };

  // Cancel removal
  const cancelRemove = () => {
    setShowRemoveModal(false);
    setRemovingCompanyId(null);
    setRemoveReason('Not a fit');
  };

  // Handle stock search
  const handleStockSearch = () => {
    const ticker = stockSearchTicker.trim().toUpperCase();
    if (ticker) {
      setCurrentView(`stock-crm-${ticker}`);
      setStockSearchTicker(''); // Clear the input after search
    }
  };

  // Add notification function
  const addNotification = (message, type = 'info') => {
    const id = Date.now();
    const notification = { id, message, type, timestamp: new Date() };
    setNotifications(prev => [...prev, notification]);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {loading ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading Analyst OS...</p>
          </div>
        </div>
      ) : (
        <>
      <Navigation />
          
          {/* Notifications */}
          {notifications.length > 0 && (
            <div className="fixed top-4 right-4 z-50 space-y-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-lg shadow-lg max-w-sm ${
                    notification.type === 'success' ? 'bg-green-500 text-white' :
                    notification.type === 'error' ? 'bg-red-500 text-white' :
                    notification.type === 'warning' ? 'bg-yellow-500 text-white' :
                    'bg-blue-500 text-white'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <p className="text-sm font-medium">{notification.message}</p>
                    <button
                      onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
                      className="ml-2 text-white hover:text-gray-200"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
      <main className="container mx-auto px-4 py-8">
        {renderCurrentView()}
      </main>
        </>
      )}
    </div>
  );
};

// Main App Component with Authentication
const AppWithAuth = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Analyst OS...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return <AnalystOS />;
};

// Wrap the main app with AuthProvider
const App = () => {
  return (
    <AuthProvider>
      <AppWithAuth />
    </AuthProvider>
  );
};

export default App;
