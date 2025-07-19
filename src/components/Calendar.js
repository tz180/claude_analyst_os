import React, { useState } from 'react';
import { Calendar as CalendarIcon, CheckCircle, Star } from 'lucide-react';

const Calendar = ({ checkoutHistory, goalsHistory, onDayClick }) => {
  const [selectedDate, setSelectedDate] = useState(null);

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



  // Get days with activity (last 5 days)
  const getDaysWithActivity = () => {
    const days = [];
    const today = new Date();
    
    // Show last 5 days
    for (let i = 4; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      // Use the same date format as normalizeDate function
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      days.push(dateStr);
    }
    
    return days;
  };

  // Get activity level for a specific date
  const getActivityLevel = (date) => {
    const normalizedDate = normalizeDate(date);
    if (!normalizedDate) return 0;
    
    const checkin = goalsHistory.find(g => normalizeDate(g.date) === normalizedDate);
    const checkout = checkoutHistory.find(c => normalizeDate(c.date) === normalizedDate);
    
    if (checkin && checkout) return 4; // High activity - both checkin and checkout
    if (checkin || checkout) return 2; // Medium activity - one of them
    return 0; // No activity
  };



  // Get detailed day info
  const getDayInfo = (date) => {
    const normalizedDate = normalizeDate(date);
    if (!normalizedDate) return { date, checkin: null, checkout: null };
    
    const checkin = goalsHistory.find(g => normalizeDate(g.date) === normalizedDate);
    const checkout = checkoutHistory.find(c => normalizeDate(c.date) === normalizedDate);
    
    return {
      date,
      checkin: checkin ? {
        goals: checkin.goals,
        completed: checkin.completed
      } : null,
      checkout: checkout ? {
        reflection: checkout.reflection,
        rating: checkout.rating
      } : null
    };
  };



  // Render days with activity
  const renderDaysWithActivity = () => {
    const days = getDaysWithActivity();
    
    return (
      <div className="space-y-2">
        {days.map((date) => {
          const dayInfo = getDayInfo(date);
          const hasActivity = dayInfo.checkin || dayInfo.checkout;
          
          return (
            <div
              key={date}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                hasActivity ? 'bg-blue-50 border-blue-200 hover:bg-blue-100' : 'bg-gray-50 border-gray-200'
              }`}
              onClick={() => setSelectedDate(date)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="font-medium">
                    {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </span>
                  {dayInfo.checkin && (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  )}
                  {dayInfo.checkout && (
                    <Star className="w-4 h-4 text-blue-600" />
                  )}
                </div>
                <div className="flex items-center space-x-1">
                  {dayInfo.checkout && (
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      dayInfo.checkout.rating >= 4 ? 'bg-green-100 text-green-800' :
                      dayInfo.checkout.rating >= 3 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {dayInfo.checkout.rating}/5
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render detailed day view
  const renderDayDetail = () => {
    if (!selectedDate) return null;
    
    const dayInfo = getDayInfo(selectedDate);
    const hasActivity = dayInfo.checkin || dayInfo.checkout;
    
    if (!hasActivity) {
      return (
        <div className="text-center py-8 text-gray-500">
          <CalendarIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No activity on {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </h3>
          <button
            onClick={() => setSelectedDate(null)}
            className="text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        </div>

        {dayInfo.checkin && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h4 className="font-semibold text-green-800">Morning Check-in</h4>
              {dayInfo.checkin.completed && (
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                  Completed
                </span>
              )}
            </div>
            <div className="space-y-2">
              {dayInfo.checkin.goals.split('\n').map((goal, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${
                    dayInfo.checkin.completed ? 'bg-green-500' : 'border-2 border-gray-300'
                  }`} />
                  <span className={dayInfo.checkin.completed ? 'line-through text-gray-600' : ''}>
                    {goal}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {dayInfo.checkout && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Star className="w-5 h-5 text-blue-600" />
                <h4 className="font-semibold text-blue-800">End-of-Day Check-out</h4>
              </div>
              <span className={`px-3 py-1 rounded text-sm font-medium ${
                dayInfo.checkout.rating >= 4 ? 'bg-green-100 text-green-800' :
                dayInfo.checkout.rating >= 3 ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                Rating: {dayInfo.checkout.rating}/5
              </span>
            </div>
            <p className="text-blue-700 leading-relaxed">{dayInfo.checkout.reflection}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Recent Days */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <CalendarIcon className="mr-2" size={20} />
          Recent Days
        </h3>
        {renderDaysWithActivity()}
      </div>

      {/* Day Detail */}
      {selectedDate && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          {renderDayDetail()}
        </div>
      )}
    </div>
  );
};

export default Calendar; 