import React from 'react';
import { TrendingUp, Calendar, Target, Award, Flame, Star, CheckCircle } from 'lucide-react';

const EnhancedStats = ({ checkoutHistory, goalsHistory, streak, weeklyWins }) => {
  // Normalize date format to YYYY-MM-DD, handling timezone issues
  const normalizeDate = (dateString) => {
    if (!dateString) return null;
    
    // If it's already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    
    // Handle timezone issues by creating date in local timezone
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    
    // Use local timezone to avoid offset issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Calculate check-in streak (consecutive days with goals set)
  const calculateCheckinStreak = () => {
    if (!goalsHistory || goalsHistory.length === 0) return 0;
    
    const sortedHistory = [...goalsHistory].sort((a, b) => new Date(b.date) - new Date(a.date));
    let currentStreak = 0;
    const today = new Date().toLocaleDateString('en-CA');
    
    // Check if there's a check-in for today
    const hasToday = sortedHistory.some(entry => normalizeDate(entry.date) === today);
    
    if (hasToday) {
      currentStreak = 1;
      
      // Count consecutive days backwards from today
      let checkDate = new Date();
      checkDate.setDate(checkDate.getDate() - 1);
      
      for (let i = 1; i <= 30; i++) {
        const checkDateStr = checkDate.toLocaleDateString('en-CA');
        const hasEntry = sortedHistory.some(entry => normalizeDate(entry.date) === checkDateStr);
        
        if (hasEntry) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    } else {
      // If no check-in today, check if there was one yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toLocaleDateString('en-CA');
      
      const hasYesterday = sortedHistory.some(entry => normalizeDate(entry.date) === yesterdayStr);
      if (hasYesterday) {
        currentStreak = 1;
        
        // Count consecutive days backwards from yesterday
        let checkDate = new Date();
        checkDate.setDate(checkDate.getDate() - 2);
        
        for (let i = 2; i <= 30; i++) {
          const checkDateStr = checkDate.toLocaleDateString('en-CA');
          const hasEntry = sortedHistory.some(entry => normalizeDate(entry.date) === checkDateStr);
          
          if (hasEntry) {
            currentStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            break;
          }
        }
      }
    }
    
    return currentStreak;
  };

  // Calculate check-out streak (consecutive days with check-outs)
  const calculateCheckoutStreak = () => {
    if (!checkoutHistory || checkoutHistory.length === 0) return 0;
    
    const sortedHistory = [...checkoutHistory].sort((a, b) => new Date(b.date) - new Date(a.date));
    let currentStreak = 0;
    const today = new Date().toLocaleDateString('en-CA');
    
    // Check if there's a check-out for today
    const hasToday = sortedHistory.some(entry => normalizeDate(entry.date) === today);
    
    if (hasToday) {
      currentStreak = 1;
      
      // Count consecutive days backwards from today
      let checkDate = new Date();
      checkDate.setDate(checkDate.getDate() - 1);
      
      for (let i = 1; i <= 30; i++) {
        const checkDateStr = checkDate.toLocaleDateString('en-CA');
        const hasEntry = sortedHistory.some(entry => normalizeDate(entry.date) === checkDateStr);
        
        if (hasEntry) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    } else {
      // If no check-out today, check if there was one yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toLocaleDateString('en-CA');
      
      const hasYesterday = sortedHistory.some(entry => normalizeDate(entry.date) === yesterdayStr);
      if (hasYesterday) {
        currentStreak = 1;
        
        // Count consecutive days backwards from yesterday
        let checkDate = new Date();
        checkDate.setDate(checkDate.getDate() - 2);
        
        for (let i = 2; i <= 30; i++) {
          const checkDateStr = checkDate.toLocaleDateString('en-CA');
          const hasEntry = sortedHistory.some(entry => normalizeDate(entry.date) === checkDateStr);
          
          if (hasEntry) {
            currentStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            break;
          }
        }
      }
    }
    
    return currentStreak;
  };

  // Calculate average rating for the last 7 days
  const calculateAverageRating = () => {
    if (!checkoutHistory || checkoutHistory.length === 0) return 0;
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const lastWeek = checkoutHistory.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= weekAgo;
    });
    
    if (lastWeek.length === 0) return 0;
    
    const totalRating = lastWeek.reduce((sum, entry) => sum + entry.rating, 0);
    return (totalRating / lastWeek.length).toFixed(1);
  };

  // Calculate completion rate for goals
  const calculateCompletionRate = () => {
    if (!goalsHistory || goalsHistory.length === 0) return 0;
    
    const completed = goalsHistory.filter(entry => entry.completed).length;
    return Math.round((completed / goalsHistory.length) * 100);
  };

  // Calculate total days with activity
  const calculateTotalActiveDays = () => {
    const checkinDays = goalsHistory ? goalsHistory.length : 0;
    const checkoutDays = checkoutHistory ? checkoutHistory.length : 0;
    return Math.max(checkinDays, checkoutDays);
  };

  const checkinStreak = calculateCheckinStreak();
  const checkoutStreak = calculateCheckoutStreak();
  const avgRating = calculateAverageRating();
  const completionRate = calculateCompletionRate();
  const totalActiveDays = calculateTotalActiveDays();

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Check-in Streak</p>
              <p className="text-2xl font-bold text-green-600">{checkinStreak}</p>
            </div>
            <Target className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Check-out Streak</p>
              <p className="text-2xl font-bold text-blue-600">{checkoutStreak}</p>
            </div>
            <Award className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Overall Streak</p>
              <p className="text-2xl font-bold text-purple-600">{streak}</p>
            </div>
            <Flame className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Weekly Wins</p>
              <p className="text-2xl font-bold text-orange-600">{weeklyWins}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Rating (7d)</p>
              <p className="text-2xl font-bold text-yellow-600">{avgRating}/5</p>
            </div>
            <Star className="w-8 h-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Goal Completion</p>
              <p className="text-2xl font-bold text-green-600">{completionRate}%</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Days</p>
              <p className="text-2xl font-bold text-indigo-600">{totalActiveDays}</p>
            </div>
            <Calendar className="w-8 h-8 text-indigo-500" />
          </div>
        </div>
      </div>


    </div>
  );
};

export default EnhancedStats; 