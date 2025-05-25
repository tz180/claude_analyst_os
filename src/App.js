import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, TrendingUp, Target, BookOpen, CheckCircle, AlertTriangle, Plus, Edit3, Clock, Award } from 'lucide-react';
import './App.css';

// Move components OUTSIDE to prevent recreation on every render
const Navigation = ({ currentView, setCurrentView }) => (
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

const DisciplineEngine = ({ 
  dailyGoals, 
  setDailyGoals, 
  checkoutReflection, 
  setCheckoutReflection, 
  disciplineRating, 
  setDisciplineRating, 
  streak, 
  weeklyWins,
  completeDailyCheckin,
  completeDailyCheckout 
}) => (
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
              onChange={(e) => setDailyGoals(e.target.value)}
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
            <span>Avg. Discipline Rating</span>
            <span className="text-2xl font-bold text-purple-600">4.2/5</span>
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
            onChange={(e) => setCheckoutReflection(e.target.value)}
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
                onClick={() => setDisciplineRating(rating)}
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
);

const AnalystOS = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [dailyGoals, setDailyGoals] = useState('');
  const [checkoutReflection, setCheckoutReflection] = useState('');
  const [disciplineRating, setDisciplineRating] = useState(5);
  const [streak, setStreak] = useState(7);
  const [weeklyWins, setWeeklyWins] = useState(3);

  // Sample data - will be loaded from localStorage
  const [companies, setCompanies] = useState([
    { id: 1, name: 'Apple Inc.', ticker: 'AAPL', lastModel: '2025-05-15', lastMemo: '2025-05-10', status: 'Active', sector: 'Tech' },
    { id: 2, name: 'Microsoft Corp.', ticker: 'MSFT', lastModel: '2025-05-12', lastMemo: '2025-05-08', status: 'Active', sector: 'Tech' },
    { id: 3, name: 'Nvidia Corp.', ticker: 'NVDA', lastModel: '2025-05-18', lastMemo: '2025-05-16', status: 'Active', sector: 'Tech' },
    { id: 4, name: 'Tesla Inc.', ticker: 'TSLA', lastModel: '2025-04-28', lastMemo: '2025-04-25', status: 'Pipeline', sector: 'Auto' },
    { id: 5, name: 'Meta Platforms', ticker: 'META', lastModel: '2025-05-01', lastMemo: '2025-04-30', status: 'Active', sector: 'Tech' },
  ]);

  const [pipelineIdeas, setPipelineIdeas] = useState([
    { id: 1, company: 'Palantir Technologies', dateAdded: '2025-05-01', status: 'Pipeline', daysInPipeline: 21 },
    { id: 2, company: 'Snowflake Inc.', dateAdded: '2025-05-10', status: 'Pipeline', daysInPipeline: 12 },
    { id: 3, company: 'CrowdStrike Holdings', dateAdded: '2025-04-15', status: 'Pipeline', daysInPipeline: 37 },
  ]);

  const [memos, setMemos] = useState([
    { id: 1, title: 'NVDA Q1 Earnings Deep Dive', type: 'Memo', stage: 'In Draft', priority: 'High', daysWorking: 3 },
    { id: 2, title: 'Apple Services Revenue Model', type: 'Model', stage: 'Started', priority: 'Medium', daysWorking: 1 },
    { id: 3, title: 'Big Tech Capex Comparison', type: 'Memo', stage: 'Sent', priority: 'High', daysWorking: 7 },
  ]);

  // Modal states
  const [showAddIdeaModal, setShowAddIdeaModal] = useState(false);
  const [showAddMemoModal, setShowAddMemoModal] = useState(false);
  const [newIdeaCompany, setNewIdeaCompany] = useState('');
  const [newMemoTitle, setNewMemoTitle] = useState('');
  const [newMemoType, setNewMemoType] = useState('Memo');
  const [newMemoPriority, setNewMemoPriority] = useState('Medium');

  // Load data from localStorage on component mount
  useEffect(() => {
    const savedData = localStorage.getItem('analystOSData');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setCompanies(parsed.companies || companies);
        setPipelineIdeas(parsed.pipelineIdeas || pipelineIdeas);
        setMemos(parsed.memos || memos);
        setStreak(parsed.streak || streak);
        setWeeklyWins(parsed.weeklyWins || weeklyWins);
      } catch (error) {
        console.error('Error loading saved data:', error);
      }
    }
  }, []);

  // Save data to localStorage with debounce to prevent excessive re-renders
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const dataToSave = {
        companies,
        pipelineIdeas,
        memos,
        streak,
        weeklyWins,
        lastSaved: new Date().toISOString()
      };
      localStorage.setItem('analystOSData', JSON.stringify(dataToSave));
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [companies, pipelineIdeas, memos, streak, weeklyWins]);

  // Update pipeline days in pipeline automatically (less frequent updates)
  useEffect(() => {
    const interval = setInterval(() => {
      setPipelineIdeas(prevIdeas => 
        prevIdeas.map(idea => {
          const daysSinceAdded = Math.floor((new Date() - new Date(idea.dateAdded)) / (1000 * 60 * 60 * 24));
          // Only update if the days actually changed to prevent unnecessary re-renders
          if (daysSinceAdded !== idea.daysInPipeline) {
            return { ...idea, daysInPipeline: daysSinceAdded };
          }
          return idea;
        })
      );
    }, 300000); // Update every 5 minutes instead of every minute

    return () => clearInterval(interval);
  }, []); // Empty dependency array

  // Load data from localStorage on component mount
  useEffect(() => {
    const savedData = localStorage.getItem('analystOSData');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setCompanies(parsed.companies || companies);
        setPipelineIdeas(parsed.pipelineIdeas || pipelineIdeas);
        setMemos(parsed.memos || memos);
        setStreak(parsed.streak || streak);
        setWeeklyWins(parsed.weeklyWins || weeklyWins);
      } catch (error) {
        console.error('Error loading saved data:', error);
      }
    }
  }, []);

  // Save data to localStorage with debounce to prevent excessive re-renders
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const dataToSave = {
        companies,
        pipelineIdeas,
        memos,
        streak,
        weeklyWins,
        lastSaved: new Date().toISOString()
      };
      localStorage.setItem('analystOSData', JSON.stringify(dataToSave));
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [companies, pipelineIdeas, memos, streak, weeklyWins]);

  // Update pipeline days in pipeline automatically (less frequent updates)
  useEffect(() => {
    const interval = setInterval(() => {
      setPipelineIdeas(prevIdeas => 
        prevIdeas.map(idea => {
          const daysSinceAdded = Math.floor((new Date() - new Date(idea.dateAdded)) / (1000 * 60 * 60 * 24));
          // Only update if the days actually changed to prevent unnecessary re-renders
          if (daysSinceAdded !== idea.daysInPipeline) {
            return { ...idea, daysInPipeline: daysSinceAdded };
          }
          return idea;
        })
      );
    }, 300000); // Update every 5 minutes instead of every minute

    return () => clearInterval(interval);
  }, []); // Empty dependency array

  // Functions to add new items (simplified)
  const addPipelineIdea = useCallback(() => {
    if (newIdeaCompany.trim()) {
      const newIdea = {
        id: Math.max(...pipelineIdeas.map(p => p.id), 0) + 1,
        company: newIdeaCompany.trim(),
        dateAdded: new Date().toISOString().split('T')[0],
        status: 'Pipeline',
        daysInPipeline: 0
      };
      setPipelineIdeas(prev => [...prev, newIdea]);
      setNewIdeaCompany('');
      setShowAddIdeaModal(false);
    }
  }, [newIdeaCompany, pipelineIdeas]);

  const movePipelineToActive = useCallback((ideaId) => {
    const idea = pipelineIdeas.find(p => p.id === ideaId);
    if (idea) {
      const newCompany = {
        id: Math.max(...companies.map(c => c.id), 0) + 1,
        name: idea.company,
        ticker: 'TBD',
        lastModel: 'Never',
        lastMemo: 'Never',
        status: 'Active',
        sector: 'TBD'
      };
      setCompanies(prev => [...prev, newCompany]);
      setPipelineIdeas(prev => prev.filter(p => p.id !== ideaId));
    }
  }, [pipelineIdeas, companies]);

  const archivePipelineIdea = useCallback((ideaId) => {
    setPipelineIdeas(prev => prev.filter(p => p.id !== ideaId));
  }, []);

  const completeDailyCheckin = useCallback(() => {
    if (dailyGoals.trim()) {
      localStorage.setItem('dailyGoals', JSON.stringify({
        goals: dailyGoals,
        date: new Date().toISOString().split('T')[0]
      }));
      alert('Daily goals set! Stay focused and crush your deliverables.');
    }
  }, [dailyGoals]);

  const completeDailyCheckout = useCallback(() => {
    if (checkoutReflection.trim()) {
      if (disciplineRating >= 3) {
        setStreak(prev => prev + 1);
        setWeeklyWins(prev => prev + 1);
      } else {
        setStreak(0);
      }
      
      const checkoutData = {
        reflection: checkoutReflection,
        rating: disciplineRating,
        date: new Date().toISOString().split('T')[0]
      };
      
      const existingCheckouts = JSON.parse(localStorage.getItem('checkoutHistory') || '[]');
      existingCheckouts.push(checkoutData);
      localStorage.setItem('checkoutHistory', JSON.stringify(existingCheckouts));
      
      setCheckoutReflection('');
      setDisciplineRating(5);
      
      alert(`Day completed! ${disciplineRating >= 3 ? 'Streak continues!' : 'Focus better tomorrow.'}`);
    }
  }, [checkoutReflection, disciplineRating]);

  // Utility functions
  const getDaysAgo = (dateString) => {
    if (dateString === 'Never') return Infinity;
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = Math.abs(today - date);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Pipeline': return 'bg-yellow-100 text-yellow-800';
      case 'Dropped': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Simple Dashboard component inline (doesn't need inputs)
  const Dashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Calendar className="mr-2" size={20} />
            Today's Plan
          </h3>
          <div className="space-y-3">
            <div className="bg-blue-50 p-3 rounded">
              <p className="font-medium text-blue-900">Deep Work: 9-11 AM</p>
              <p className="text-blue-700 text-sm">NVDA earnings model update</p>
            </div>
            <div className="bg-green-50 p-3 rounded">
              <p className="font-medium text-green-900">Priority Deliverable</p>
              <p className="text-green-700 text-sm">Finish Big Tech Capex memo</p>
            </div>
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
          <h3 className="text-lg font-semibold mb-4">Overdue Items</h3>
          <div className="space-y-2">
            {companies.filter(c => getDaysAgo(c.lastModel) > 30).map(company => (
              <div key={company.id} className="flex items-center justify-between p-2 bg-red-50 rounded">
                <span className="font-medium">{company.name}</span>
                <span className="text-red-600 text-sm">{getDaysAgo(company.lastModel)} days</span>
              </div>
            ))}
            {pipelineIdeas.filter(p => p.daysInPipeline > 30).map(idea => (
              <div key={idea.id} className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                <span className="font-medium">{idea.company}</span>
                <span className="text-yellow-600 text-sm">{idea.daysInPipeline} days in pipeline</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <button 
              onClick={() => setCurrentView('discipline')}
              className="w-full p-3 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
              Start Daily Check-in
            </button>
            <button 
              onClick={() => setShowAddIdeaModal(true)}
              className="w-full p-3 bg-green-500 text-white rounded hover:bg-green-600 transition-colors">
              Add New Pipeline Idea
            </button>
            <button 
              onClick={() => setShowAddMemoModal(true)}
              className="w-full p-3 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors">
              Create New Memo/Model
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Simple render function for current view
  const renderCurrentView = () => {
    switch(currentView) {
      case 'dashboard': 
        return <Dashboard />;
      case 'pipeline': 
        return (
          <PipelineManager 
            pipelineIdeas={pipelineIdeas}
            showAddIdeaModal={showAddIdeaModal}
            setShowAddIdeaModal={setShowAddIdeaModal}
            newIdeaCompany={newIdeaCompany}
            setNewIdeaCompany={setNewIdeaCompany}
            addPipelineIdea={addPipelineIdea}
            movePipelineToActive={movePipelineToActive}
            archivePipelineIdea={archivePipelineIdea}
          />
        );
      case 'discipline': 
        return (
          <DisciplineEngine 
            dailyGoals={dailyGoals}
            setDailyGoals={setDailyGoals}
            checkoutReflection={checkoutReflection}
            setCheckoutReflection={setCheckoutReflection}
            disciplineRating={disciplineRating}
            setDisciplineRating={setDisciplineRating}
            streak={streak}
            weeklyWins={weeklyWins}
            completeDailyCheckin={completeDailyCheckin}
            completeDailyCheckout={completeDailyCheckout}
          />
        );
      default: 
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation currentView={currentView} setCurrentView={setCurrentView} />
      <main className="container mx-auto px-4 py-8">
        {renderCurrentView()}
      </main>
    </div>
  );
};

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation currentView={currentView} setCurrentView={setCurrentView} />
      <main className="container mx-auto px-4 py-8">
        {renderCurrentView()}
      </main>
    </div>
  );
};

export default AnalystOS;