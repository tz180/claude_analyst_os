import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, TrendingUp, Target, BookOpen, CheckCircle, AlertTriangle, Plus, Edit3, Clock, Award } from 'lucide-react';
import './App.css';

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

  // Functions to add new items (memoized to prevent re-renders)
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

  const addMemo = useCallback(() => {
    if (newMemoTitle.trim()) {
      const newMemo = {
        id: Math.max(...memos.map(m => m.id), 0) + 1,
        title: newMemoTitle.trim(),
        type: newMemoType,
        stage: 'Started',
        priority: newMemoPriority,
        daysWorking: 0
      };
      setMemos(prev => [...prev, newMemo]);
      setNewMemoTitle('');
      setShowAddMemoModal(false);
    }
  }, [newMemoTitle, newMemoType, newMemoPriority, memos]);

  const movePipelineToActive = useCallback((ideaId) => {
    const idea = pipelineIdeas.find(p => p.id === ideaId);
    if (idea) {
      // Add to companies as Active
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
      
      // Remove from pipeline
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
      // Update streak based on discipline rating
      if (disciplineRating >= 3) {
        setStreak(prev => prev + 1);
        setWeeklyWins(prev => prev + 1);
      } else {
        setStreak(0); // Reset streak if poor performance
      }
      
      // Save checkout data
      const checkoutData = {
        reflection: checkoutReflection,
        rating: disciplineRating,
        date: new Date().toISOString().split('T')[0]
      };
      
      const existingCheckouts = JSON.parse(localStorage.getItem('checkoutHistory') || '[]');
      existingCheckouts.push(checkoutData);
      localStorage.setItem('checkoutHistory', JSON.stringify(existingCheckouts));
      
      // Clear form
      setCheckoutReflection('');
      setDisciplineRating(5);
      
      alert(`Day completed! ${disciplineRating >= 3 ? 'Streak continues!' : 'Focus better tomorrow.'}`);
    }
  }, [checkoutReflection, disciplineRating]);

  // Memoized onChange handlers to prevent re-renders
  const handleDailyGoalsChange = useCallback((e) => {
    setDailyGoals(e.target.value);
  }, []);

  const handleCheckoutReflectionChange = useCallback((e) => {
    setCheckoutReflection(e.target.value);
  }, []);

  const handleDisciplineRatingChange = useCallback((rating) => {
    setDisciplineRating(rating);
  }, []);

  // Modal input handlers
  const handleNewIdeaCompanyChange = useCallback((e) => {
    setNewIdeaCompany(e.target.value);
  }, []);

  const handleNewMemoTitleChange = useCallback((e) => {
    setNewMemoTitle(e.target.value);
  }, []);

  const handleNewMemoTypeChange = useCallback((e) => {
    setNewMemoType(e.target.value);
  }, []);

  const handleNewMemoPriorityChange = useCallback((e) => {
    setNewMemoPriority(e.target.value);
  }, []);

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

  const getStageColor = (stage) => {
    switch(stage) {
      case 'Started': return 'bg-blue-100 text-blue-800';
      case 'In Draft': return 'bg-yellow-100 text-yellow-800';
      case 'Sent': return 'bg-green-100 text-green-800';
      case 'Stalled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

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

  const CoverageTracker = () => (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-6 border-b">
        <h2 className="text-xl font-semibold">Coverage Universe</h2>
        <p className="text-gray-600">Track model updates and memo status across your coverage</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Model</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Memo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Next Update</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {companies.map((company) => (
              <tr key={company.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{company.name}</div>
                    <div className="text-sm text-gray-500">{company.ticker}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(company.status)}`}>
                    {company.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div>{company.lastModel}</div>
                  <div className="text-gray-500">
                    {company.lastModel === 'Never' ? 'Never updated' : `${getDaysAgo(company.lastModel)} days ago`}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div>{company.lastMemo}</div>
                  <div className="text-gray-500">
                    {company.lastMemo === 'Never' ? 'Never written' : `${getDaysAgo(company.lastMemo)} days ago`}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getDaysAgo(company.lastModel) > 30 ? (
                    <span className="text-red-600 font-medium">Overdue</span>
                  ) : (
                    <span className="text-green-600">On Track</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button className="text-blue-600 hover:text-blue-900 mr-3">Update</button>
                  <button className="text-green-600 hover:text-green-900">Memo</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const PipelineManager = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold">Pipeline Ideas</h2>
            <p className="text-gray-600">Track new investment ideas and their progression</p>
          </div>
          <button 
            onClick={() => setShowAddIdeaModal(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors flex items-center">
            <Plus size={16} className="mr-2" />
            Add Idea
          </button>
        </div>
        
        <div className="space-y-4">
          {pipelineIdeas.map((idea) => (
            <div key={idea.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{idea.company}</h3>
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                    <span>Added: {idea.dateAdded}</span>
                    <span className={`font-medium ${idea.daysInPipeline > 30 ? 'text-red-600' : 'text-gray-600'}`}>
                      {idea.daysInPipeline} days in pipeline
                    </span>
                    {idea.daysInPipeline > 30 && (
                      <span className="flex items-center text-red-600">
                        <AlertTriangle size={16} className="mr-1" />
                        Red Flag
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => movePipelineToActive(idea.id)}
                    className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600">
                    Move to Active
                  </button>
                  <button className="bg-yellow-500 text-white px-3 py-1 rounded text-sm hover:bg-yellow-600">
                    Follow-Up
                  </button>
                  <button 
                    onClick={() => archivePipelineIdea(idea.id)}
                    className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600">
                    Archive
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Idea Modal */}
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
              <div className="flex space-x-3">
                <button
                  onClick={addPipelineIdea}
                  className="flex-1 bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition-colors"
                >
                  Add to Pipeline
                </button>
                <button
                  onClick={() => {
                    setShowAddIdeaModal(false);
                    setNewIdeaCompany('');
                  }}
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

  const MemoModelTracker = () => (
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
                  <div className="flex items-center space-x-3">
                    <h3 className="font-semibold text-lg">{memo.title}</h3>
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                      {memo.type}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStageColor(memo.stage)}`}>
                      {memo.stage}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                    <span>Priority: {memo.priority}</span>
                    <span>Working for {memo.daysWorking} days</span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 flex items-center">
                    <Edit3 size={14} className="mr-1" />
                    Edit
                  </button>
                  <button 
                    onClick={() => {
                      const updatedMemos = memos.map(m => {
                        if (m.id === memo.id) {
                          const stages = ['Started', 'In Draft', 'Sent', 'Stalled'];
                          const currentIndex = stages.indexOf(m.stage);
                          const nextStage = currentIndex < 2 ? stages[currentIndex + 1] : m.stage;
                          return { ...m, stage: nextStage };
                        }
                        return m;
                      });
                      setMemos(updatedMemos);
                    }}
                    className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600">
                    Advance Stage
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

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
                  onChange={handleNewMemoTypeChange}
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
                  onChange={handleNewMemoPriorityChange}
                  className="w-full p-3 border rounded-lg"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={addMemo}
                  className="flex-1 bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition-colors"
                >
                  Create Deliverable
                </button>
                <button
                  onClick={() => {
                    setShowAddMemoModal(false);
                    setNewMemoTitle('');
                  }}
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

  const DisciplineEngine = () => (
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
  );

  const renderCurrentView = () => {
    switch(currentView) {
      case 'dashboard': return <Dashboard />;
      case 'coverage': return <CoverageTracker />;
      case 'pipeline': return <PipelineManager />;
      case 'memos': return <MemoModelTracker />;
      case 'discipline': return <DisciplineEngine />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        {renderCurrentView()}
      </main>
    </div>
  );
};

export default AnalystOS;