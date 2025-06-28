import React, { useState, useEffect } from 'react';
import { Calendar, TrendingUp, Target, BookOpen, CheckCircle, Plus, Clock, Award } from 'lucide-react';
import './App.css';
import { 
  dailyCheckinServices, 
  coverageServices, 
  deliverablesServices, 
  pipelineServices 
} from './supabaseServices';

// ✅ MOVE TEXT INPUT COMPONENTS OUTSIDE - This prevents recreation
const DisciplineEngine = ({ 
  dailyGoals, 
  onDailyGoalsChange, 
  checkoutReflection, 
  onCheckoutReflectionChange, 
  disciplineRating, 
  onDisciplineRatingChange, 
  streak, 
  weeklyWins, 
  onDailyCheckin, 
  onDailyCheckout,
  checkoutHistory,
  onMarkGoalsCompleted,
  goalsHistory
}) => {
  // Calculate average rating from recent history
  const recentHistory = checkoutHistory.slice(-7); // Last 7 days
  const avgRating = recentHistory.length > 0 
    ? (recentHistory.reduce((sum, item) => sum + item.rating, 0) / recentHistory.length).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-6">
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
                onChange={onDailyGoalsChange}
                className="w-full p-3 border rounded-lg resize-none"
                rows="3"
                placeholder="e.g., Finish NVDA model update, Send Big Tech memo draft..."
              />
            </div>
            <button 
              onClick={onDailyCheckin}
              className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition-colors">
              Set Daily Goals
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Award className="mr-2" size={20} />
            Performance Stats
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Current Streak</span>
              <span className="text-2xl font-bold text-green-600">{streak}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Weekly Wins</span>
              <span className="text-2xl font-bold text-blue-600">{weeklyWins}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Avg. Discipline Rating (7d)</span>
              <span className="text-2xl font-bold text-purple-600">{avgRating}/5</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold mb-4">End-of-Day Check-out</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Did you hit your goals? What did you accomplish?
            </label>
            <textarea
              value={checkoutReflection}
              onChange={onCheckoutReflectionChange}
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
                  onClick={() => onDisciplineRatingChange(rating)}
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
            onClick={onDailyCheckout}
            className="w-full bg-green-500 text-white py-3 rounded hover:bg-green-600 transition-colors font-medium">
            Complete Daily Check-out
          </button>
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
          {(() => {
            return goalsHistory.length > 0 ? (
              goalsHistory.map((entry, index) => (
                <div key={index} className={`border rounded-lg p-4 ${entry.completed ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="font-medium text-gray-900">{entry.date}</span>
                        {entry.completed && (
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                            Completed
                          </span>
                        )}
                      </div>
                      <p className={`text-sm leading-relaxed ${entry.completed ? 'text-green-700 line-through' : 'text-gray-700'}`}>
                        {entry.goals}
                      </p>
                    </div>
                    {!entry.completed && (
                      <button
                        onClick={() => onMarkGoalsCompleted(entry.date)}
                        className="ml-4 bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 transition-colors flex items-center">
                        <CheckCircle size={14} className="mr-1" />
                        Mark Complete
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No daily goals history yet.</p>
                <p className="text-sm mt-1">Set your first daily goals to start tracking!</p>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

const AnalystOS = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [dailyGoals, setDailyGoals] = useState('');
  const [checkoutReflection, setCheckoutReflection] = useState('');
  const [disciplineRating, setDisciplineRating] = useState(5);
  const [streak, setStreak] = useState(7);
  const [weeklyWins, setWeeklyWins] = useState(3);

  // Data states - will be loaded from Supabase
  const [coverage, setCoverage] = useState([]);
  const [formerCompanies, setFormerCompanies] = useState([]);
  const [pipelineIdeas, setPipelineIdeas] = useState([]);
  const [memos, setMemos] = useState([]);
  const [completedMemos, setCompletedMemos] = useState([]);
  const [checkoutHistory, setCheckoutHistory] = useState([]);
  const [goalsHistory, setGoalsHistory] = useState([]);

  // Load data from Supabase on component mount
  useEffect(() => {
    loadDataFromSupabase();
  }, []);

  const loadDataFromSupabase = async () => {
    try {
      // Load coverage data
      const activeCoverage = await coverageServices.getActiveCoverage();
      const formerCoverage = await coverageServices.getFormerCoverage();
      setCoverage(activeCoverage);
      setFormerCompanies(formerCoverage);

      // Load pipeline ideas
      const pipelineData = await pipelineServices.getPipelineIdeas();
      setPipelineIdeas(pipelineData);

      // Load deliverables
      const deliverablesData = await deliverablesServices.getDeliverables();
      const activeDeliverables = deliverablesData.filter(d => d.stage !== 'completed');
      const completedDeliverables = deliverablesData.filter(d => d.stage === 'completed');
      setMemos(activeDeliverables);
      setCompletedMemos(completedDeliverables);

      // Load daily check-in data
      const checkoutData = await dailyCheckinServices.getCheckoutHistory();
      const goalsData = await dailyCheckinServices.getGoalsHistory();
      setCheckoutHistory(checkoutData);
      setGoalsHistory(goalsData);

      // Load today's goals
      const todayCheckin = await dailyCheckinServices.getTodayCheckin();
      if (todayCheckin && todayCheckin.goals) {
        setDailyGoals(Array.isArray(todayCheckin.goals) ? todayCheckin.goals.join('\n') : todayCheckin.goals);
      }
    } catch (error) {
      console.error('Error loading data from Supabase:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Modal states
  const [showAddIdeaModal, setShowAddIdeaModal] = useState(false);
  const [showAddMemoModal, setShowAddMemoModal] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [newIdeaCompany, setNewIdeaCompany] = useState('');
  const [newIdeaTicker, setNewIdeaTicker] = useState('');
  const [newMemoTitle, setNewMemoTitle] = useState('');
  const [newMemoType, setNewMemoType] = useState('Memo');
  const [newMemoPriority, setNewMemoPriority] = useState('Medium');
  const [passingIdeaId, setPassingIdeaId] = useState(null);
  const [passReason, setPassReason] = useState('Not a Fit');
  const [removingCompanyId, setRemovingCompanyId] = useState(null);
  const [removeReason, setRemoveReason] = useState('Not a fit');
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [goalsRefresh, setGoalsRefresh] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [coverageSearch, setCoverageSearch] = useState('');
  const [coverageFilter, setCoverageFilter] = useState('all'); // all, active, former
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [newCompanyTicker, setNewCompanyTicker] = useState('');
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanySector, setNewCompanySector] = useState('');
  const [isLoading, setIsLoading] = useState(true);

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

  const handleNewIdeaTickerChange = (e) => {
    setNewIdeaTicker(e.target.value);
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
      const result = await pipelineServices.updatePipelineStatus(passingIdeaId, 'Passed');
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
    setShowAddIdeaModal(false);
    setNewIdeaCompany('');
    setNewIdeaTicker('');
  };

  // Quick action handlers for dashboard
  const handleQuickAddPipelineIdea = () => {
    setCurrentView('pipeline');
    setShowAddIdeaModal(true);
  };

  const handleQuickCreateMemo = () => {
    setCurrentView('memos');
    setShowAddMemoModal(true);
  };

  const cancelAddMemo = () => {
    setShowAddMemoModal(false);
    setNewMemoTitle('');
  };

  // Get checkout history from localStorage
  const getCheckoutHistory = () => {
    return checkoutHistory;
  };

  // Get today's daily goals from localStorage
  const getTodayGoals = () => {
    return dailyGoals;
  };

  // Get daily goals history from localStorage
  const getGoalsHistory = () => {
    return goalsHistory;
  };

  const completeDailyCheckin = async () => {
    if (dailyGoals.trim()) {
      const today = new Date().toISOString().split('T')[0];
      const result = await dailyCheckinServices.upsertCheckin({
        date: today,
        goals: [dailyGoals.trim()],
        completed: false
      });
      
      if (result.success) {
        setDailyGoals('');
        setGoalsRefresh(prev => prev + 1);
        await loadDataFromSupabase(); // Refresh data
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
      setGoalsRefresh(prev => prev + 1);
      await loadDataFromSupabase(); // Refresh data
    } else {
      console.error('Error marking goals as completed:', result.error);
    }
  };

  const completeDailyCheckout = async () => {
    if (checkoutReflection.trim()) {
      const today = new Date().toISOString().split('T')[0];
      const result = await dailyCheckinServices.upsertCheckin({
        date: today,
        reflection: checkoutReflection.trim(),
        completed: true
      });
      
      if (result.success) {
        // Update streak and weekly wins
        if (disciplineRating >= 3) {
          setStreak(prev => prev + 1);
          setWeeklyWins(prev => prev + 1);
        } else {
          setStreak(0);
        }
        
        // Clear form
        setCheckoutReflection('');
        setDisciplineRating(5);
        
        // Force re-render of history
        setHistoryRefresh(prev => prev + 1);
        await loadDataFromSupabase(); // Refresh data
        
        alert(`Day completed! ${disciplineRating >= 3 ? 'Streak continues!' : 'Focus better tomorrow.'}`);
      } else {
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

  const getStatusColor = (status) => {
    switch(status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Pipeline': return 'bg-yellow-100 text-yellow-800';
      case 'Dropped': return 'bg-red-100 text-red-800';
      case 'Former': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
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
  const Navigation = () => (
    <nav className="bg-slate-900 text-white p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Analyst OS</h1>
        <div className="flex space-x-4">
          {[
            { key: 'dashboard', label: 'Dashboard', icon: TrendingUp },
            { key: 'coverage', label: 'Coverage', icon: Target },
            { key: 'pipeline', label: 'Pipeline', icon: Clock },
            { key: 'memos', label: 'Memos/Models', icon: BookOpen },
            { key: 'discipline', label: 'Discipline', icon: Award }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setCurrentView(key)}
              className={`flex items-center space-x-2 px-3 py-2 rounded transition-colors ${
                currentView === key ? 'bg-slate-700' : 'hover:bg-slate-800'
              }`}
            >
              <Icon size={16} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  );

  // ✅ Simple Dashboard - no text inputs so can stay internal
  const Dashboard = () => {
    const todayGoals = getTodayGoals();
    
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Calendar className="mr-2" size={20} />
              Today's Plan
            </h3>
            <div className="space-y-3">
              {todayGoals ? (
                <div className="bg-blue-50 p-3 rounded">
                  <p className="font-medium text-blue-900">Today's Goals</p>
                  <p className="text-blue-700 text-sm whitespace-pre-wrap">{todayGoals}</p>
                </div>
              ) : (
                <div className="bg-gray-50 p-3 rounded">
                  <p className="font-medium text-gray-900">No goals set yet</p>
                  <p className="text-gray-700 text-sm">Complete your morning check-in to set today's goals</p>
                  <button 
                    onClick={() => setCurrentView('discipline')}
                    className="mt-2 bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 transition-colors">
                    Set Goals Now
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Target className="mr-2" size={20} />
              Week Goals
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span>Models Updated</span>
                <span className="font-bold text-green-600">3/4</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Memos Sent</span>
                <span className="font-bold text-blue-600">2/3</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{width: '75%'}}></div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Award className="mr-2" size={20} />
              Momentum Tracker
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span>Current Streak</span>
                <span className="font-bold text-orange-600">{streak} days</span>
              </div>
              <div className="flex justify-between items-center">
                <span>This Week's Wins</span>
                <span className="font-bold text-green-600">{weeklyWins}</span>
              </div>
              <div className="text-sm text-gray-600">
                Last shipped: AAPL Q1 analysis (yesterday)
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button 
                onClick={() => setCurrentView('discipline')}
                className="w-full p-3 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
                Start Daily Check-in
              </button>
              <button 
                onClick={handleQuickAddPipelineIdea}
                className="w-full p-3 bg-green-500 text-white rounded hover:bg-green-600 transition-colors">
                Add New Pipeline Idea
              </button>
              <button 
                onClick={handleQuickCreateMemo}
                className="w-full p-3 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors">
                Create New Memo/Model
              </button>
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
      </div>
    );
  };

  // Render current view with external components for text inputs
  const renderCurrentView = () => {
    switch(currentView) {
      case 'dashboard': 
        return <Dashboard key={goalsRefresh} />;
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
                    <p className="text-gray-500 text-center py-8">No ideas on deck</p>
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
                    <p className="text-gray-500 text-center py-8">No core ideas</p>
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
                            <div className="text-red-600 font-medium">Passed: {idea.passReason}</div>
                            <div>Pass Date: {idea.passDate}</div>
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
                    <p className="text-gray-500 text-center py-8">No passed ideas</p>
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
                        Company Name
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
          <DisciplineEngine 
            dailyGoals={dailyGoals}
            onDailyGoalsChange={handleDailyGoalsChange}
            checkoutReflection={checkoutReflection}
            onCheckoutReflectionChange={handleCheckoutReflectionChange}
            disciplineRating={disciplineRating}
            onDisciplineRatingChange={handleDisciplineRatingChange}
            streak={streak}
            weeklyWins={weeklyWins}
            onDailyCheckin={completeDailyCheckin}
            onDailyCheckout={completeDailyCheckout}
            checkoutHistory={getCheckoutHistory()}
            onMarkGoalsCompleted={markGoalsCompleted}
            goalsHistory={getGoalsHistory()}
            key={historyRefresh}
          />
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
                  onClick={() => setShowAddCompanyModal(true)}
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
                        company.ticker.toLowerCase().includes(coverageSearch.toLowerCase());
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
                      company.ticker.toLowerCase().includes(coverageSearch.toLowerCase());
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
                    <p className="text-gray-500 text-center py-8">No companies match the search criteria</p>
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
                          company.ticker.toLowerCase().includes(coverageSearch.toLowerCase());
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
                            Next →
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
      default: 
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
      {isLoading ? (
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

export default AnalystOS;
