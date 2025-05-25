import React, { useState, useCallback } from 'react';
import { Calendar, TrendingUp, Target, BookOpen, CheckCircle, AlertTriangle, Plus, Edit3, Clock, Award } from 'lucide-react';
import './App.css';

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
  onDailyCheckout 
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
  </div>
);

const PipelineManager = ({ 
  pipelineIdeas, 
  showAddIdeaModal, 
  onShowAddIdeaModal, 
  newIdeaCompany, 
  onNewIdeaCompanyChange, 
  onAddPipelineIdea, 
  onMovePipelineToActive, 
  onArchivePipelineIdea,
  onCancelAddIdea
}) => (
  <div className="space-y-6">
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold">Pipeline Ideas</h2>
          <p className="text-gray-600">Track new investment ideas and their progression</p>
        </div>
        <button 
          onClick={() => onShowAddIdeaModal(true)}
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
                  onClick={() => onMovePipelineToActive(idea.id)}
                  className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600">
                  Move to Active
                </button>
                <button className="bg-yellow-500 text-white px-3 py-1 rounded text-sm hover:bg-yellow-600">
                  Follow-Up
                </button>
                <button 
                  onClick={() => onArchivePipelineIdea(idea.id)}
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
                onChange={onNewIdeaCompanyChange}
                className="w-full p-3 border rounded-lg"
                placeholder="e.g., Palantir Technologies"
                onKeyPress={(e) => e.key === 'Enter' && onAddPipelineIdea()}
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onAddPipelineIdea}
                className="flex-1 bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition-colors"
              >
                Add to Pipeline
              </button>
              <button
                onClick={() => onShowAddIdeaModal(false)}
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
    { id: 1, company: 'Palantir Technologies', dateAdded: '2025-05-01', status: 'On Deck', daysInPipeline: 21 },
    { id: 2, company: 'Snowflake Inc.', dateAdded: '2025-05-10', status: 'Core', daysInPipeline: 12 },
    { id: 3, company: 'CrowdStrike Holdings', dateAdded: '2025-04-15', status: 'Core', daysInPipeline: 37 },
    { id: 4, company: 'MongoDB Inc.', dateAdded: '2025-04-20', status: 'Passed', daysInPipeline: 32, passReason: 'Valuation', passDate: '2025-05-15' },
    { id: 5, company: 'Okta Inc.', dateAdded: '2025-04-10', status: 'Passed', daysInPipeline: 42, passReason: 'Management', passDate: '2025-05-10' },
  ]);

  const [memos, setMemos] = useState([
    { id: 1, title: 'NVDA Q1 Earnings Deep Dive', type: 'Memo', stage: 'In Draft', priority: 'High', daysWorking: 3 },
    { id: 2, title: 'Apple Services Revenue Model', type: 'Model', stage: 'Started', priority: 'Medium', daysWorking: 1 },
    { id: 3, title: 'Big Tech Capex Comparison', type: 'Memo', stage: 'Sent', priority: 'High', daysWorking: 7 },
  ]);

  // Modal states
  const [showAddIdeaModal, setShowAddIdeaModal] = useState(false);
  const [showAddMemoModal, setShowAddMemoModal] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);
  const [newIdeaCompany, setNewIdeaCompany] = useState('');
  const [newMemoTitle, setNewMemoTitle] = useState('');
  const [newMemoType, setNewMemoType] = useState('Memo');
  const [newMemoPriority, setNewMemoPriority] = useState('Medium');
  const [passingIdeaId, setPassingIdeaId] = useState(null);
  const [passReason, setPassReason] = useState('Not a Fit');

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

  const handleNewMemoTitleChange = (e) => {
    setNewMemoTitle(e.target.value);
  };

  const handleDisciplineRatingChange = (rating) => {
    setDisciplineRating(rating);
  };

  const handlePassReasonChange = (e) => {
    setPassReason(e.target.value);
  };

  // Other functions
  const addPipelineIdea = () => {
    if (newIdeaCompany.trim()) {
      const newIdea = {
        id: Math.max(...pipelineIdeas.map(p => p.id), 0) + 1,
        company: newIdeaCompany.trim(),
        dateAdded: new Date().toISOString().split('T')[0],
        status: 'On Deck',
        daysInPipeline: 0
      };
      setPipelineIdeas(prev => [...prev, newIdea]);
      setNewIdeaCompany('');
      setShowAddIdeaModal(false);
    }
  };

  const moveToCore = (ideaId) => {
    setPipelineIdeas(prev => prev.map(idea => 
      idea.id === ideaId ? { ...idea, status: 'Core' } : idea
    ));
  };

  const moveToOnDeck = (ideaId) => {
    setPipelineIdeas(prev => prev.map(idea => 
      idea.id === ideaId ? { ...idea, status: 'On Deck' } : idea
    ));
  };

  const initiatePass = (ideaId) => {
    setPassingIdeaId(ideaId);
    setShowPassModal(true);
  };

  const confirmPass = () => {
    if (passingIdeaId) {
      setPipelineIdeas(prev => prev.map(idea => 
        idea.id === passingIdeaId ? { 
          ...idea, 
          status: 'Passed',
          passReason: passReason,
          passDate: new Date().toISOString().split('T')[0]
        } : idea
      ));
      setShowPassModal(false);
      setPassingIdeaId(null);
      setPassReason('Not a Fit');
    }
  };

  const cancelPass = () => {
    setShowPassModal(false);
    setPassingIdeaId(null);
    setPassReason('Not a Fit');
  };

  const movePipelineToActive = (ideaId) => {
    const idea = pipelineIdeas.find(p => p.id === ideaId);
    if (idea && idea.status === 'Core') {
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
  };

  const archivePipelineIdea = (ideaId) => {
    setPipelineIdeas(prev => prev.filter(p => p.id !== ideaId));
  };

  const cancelAddIdea = () => {
    setShowAddIdeaModal(false);
    setNewIdeaCompany('');
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

  const completeDailyCheckin = () => {
    if (dailyGoals.trim()) {
      alert('Daily goals set! Stay focused and crush your deliverables.');
    }
  };

  const completeDailyCheckout = () => {
    if (checkoutReflection.trim()) {
      if (disciplineRating >= 3) {
        setStreak(prev => prev + 1);
        setWeeklyWins(prev => prev + 1);
      } else {
        setStreak(0);
      }
      
      setCheckoutReflection('');
      setDisciplineRating(5);
      
      alert(`Day completed! ${disciplineRating >= 3 ? 'Streak continues!' : 'Focus better tomorrow.'}`);
    }
  };

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
          </div>
        </div>
      </div>
    </div>
  );

  // Render current view with external components for text inputs
  const renderCurrentView = () => {
    switch(currentView) {
      case 'dashboard': 
        return <Dashboard />;
      case 'pipeline': 
        return (
          <PipelineManager 
            pipelineIdeas={pipelineIdeas}
            showAddIdeaModal={showAddIdeaModal}
            onShowAddIdeaModal={setShowAddIdeaModal}
            newIdeaCompany={newIdeaCompany}
            onNewIdeaCompanyChange={handleNewIdeaCompanyChange}
            onAddPipelineIdea={addPipelineIdea}
            onMovePipelineToActive={movePipelineToActive}
            onArchivePipelineIdea={archivePipelineIdea}
            onCancelAddIdea={cancelAddIdea}
            onMoveToCore={moveToCore}
            onMoveToOnDeck={moveToOnDeck}
            onInitiatePass={initiatePass}
            showPassModal={showPassModal}
            passReason={passReason}
            onPassReasonChange={handlePassReasonChange}
            onConfirmPass={confirmPass}
            onCancelPass={cancelPass}
          />
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
          />
        );
      case 'coverage':
        return (
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
                        onClick={() => {
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
