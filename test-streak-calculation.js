// Test file for streak calculation logic
// This can be run in the browser console to test the streak calculation

const calculateUserStats = (checkoutHistory) => {
  try {
    if (!checkoutHistory || !Array.isArray(checkoutHistory) || checkoutHistory.length === 0) {
      return { streak: 0, weeklyWins: 0 };
    }
    
    // Sort checkout history by date (newest first) for proper streak calculation
    const sortedHistory = [...checkoutHistory].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    let currentStreak = 0;
    const today = new Date().toISOString().split('T')[0];
    
    // Check if there's a checkout for today
    const hasToday = sortedHistory.some(entry => entry.date === today);
    
    if (hasToday) {
      currentStreak = 1;
      
      // Count consecutive days backwards from today
      let checkDate = new Date();
      checkDate.setDate(checkDate.getDate() - 1); // Start with yesterday
      
      for (let i = 1; i <= 30; i++) { // Limit to 30 days to prevent infinite loop
        const checkDateStr = checkDate.toISOString().split('T')[0];
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
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      const hasYesterday = sortedHistory.some(entry => entry.date === yesterdayStr);
      if (hasYesterday) {
        currentStreak = 1;
        
        // Count consecutive days backwards from yesterday
        let checkDate = new Date();
        checkDate.setDate(checkDate.getDate() - 2); // Start with day before yesterday
        
        for (let i = 2; i <= 30; i++) {
          const checkDateStr = checkDate.toISOString().split('T')[0];
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

// Test cases
const testCases = [
  {
    name: "Empty history",
    data: [],
    expected: { streak: 0, weeklyWins: 0 }
  },
  {
    name: "Single entry today",
    data: [
      { date: new Date().toISOString().split('T')[0], reflection: "Test", rating: 4 }
    ],
    expected: { streak: 1, weeklyWins: 1 }
  },
  {
    name: "Consecutive days streak",
    data: [
      { date: new Date().toISOString().split('T')[0], reflection: "Today", rating: 4 },
      { date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0], reflection: "Yesterday", rating: 3 },
      { date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], reflection: "Day before", rating: 5 }
    ],
    expected: { streak: 3, weeklyWins: 3 }
  },
  {
    name: "Broken streak",
    data: [
      { date: new Date().toISOString().split('T')[0], reflection: "Today", rating: 4 },
      { date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], reflection: "Day before", rating: 5 }
    ],
    expected: { streak: 1, weeklyWins: 2 }
  }
];

// Run tests
console.log("Running streak calculation tests...");
testCases.forEach((testCase, index) => {
  const result = calculateUserStats(testCase.data);
  const passed = result.streak === testCase.expected.streak && result.weeklyWins === testCase.expected.weeklyWins;
  console.log(`Test ${index + 1}: ${testCase.name} - ${passed ? 'PASSED' : 'FAILED'}`);
  console.log(`  Expected: ${JSON.stringify(testCase.expected)}`);
  console.log(`  Got: ${JSON.stringify(result)}`);
  console.log('');
});

console.log("Tests completed!"); 