import { supabase } from './supabase';

// Migration utility to move data from localStorage to Supabase
export const migrateDataToSupabase = async () => {
  try {
    console.log('Starting data migration...');
    
    // Get current user (for now, we'll use a placeholder user_id)
    // In a real app, you'd get this from authentication
    const userId = '00000000-0000-0000-0000-000000000000'; // Placeholder
    
    // Migrate Daily Check-ins
    await migrateDailyCheckins(userId);
    
    // Migrate Coverage Universe
    await migrateCoverageUniverse(userId);
    
    // Migrate Deliverables (Memos/Models)
    await migrateDeliverables(userId);
    
    // Migrate Pipeline Ideas
    await migratePipelineIdeas(userId);
    
    console.log('Data migration completed successfully!');
    return { success: true };
  } catch (error) {
    console.error('Migration failed:', error);
    return { success: false, error: error.message };
  }
};

const migrateDailyCheckins = async (userId) => {
  const checkoutHistory = JSON.parse(localStorage.getItem('checkoutHistory') || '[]');
  const goalsHistory = JSON.parse(localStorage.getItem('goalsHistory') || '[]');
  
  // Migrate checkout history
  for (const entry of checkoutHistory) {
    const { error } = await supabase
      .from('daily_checkins')
      .upsert({
        user_id: userId,
        date: entry.date,
        reflection: entry.reflection,
        completed: true,
        goals: [] // We'll handle goals separately
      });
    
    if (error) console.error('Error migrating checkout:', error);
  }
  
  // Migrate goals history
  for (const entry of goalsHistory) {
    const { error } = await supabase
      .from('daily_checkins')
      .upsert({
        user_id: userId,
        date: entry.date,
        goals: [entry.goals], // Convert to array format
        completed: entry.completed,
        reflection: null
      });
    
    if (error) console.error('Error migrating goals:', error);
  }
};

const migrateCoverageUniverse = async (userId) => {
  const coverage = JSON.parse(localStorage.getItem('coverage') || '[]');
  const formerCoverage = JSON.parse(localStorage.getItem('formerCoverage') || '[]');
  
  // Migrate active coverage
  for (const company of coverage) {
    const { error } = await supabase
      .from('coverage_universe')
      .upsert({
        user_id: userId,
        ticker: company.ticker,
        company_name: company.company,
        sector: company.sector || null,
        last_model_date: company.lastModelDate || null,
        last_memo_date: company.lastMemoDate || null,
        status: 'active',
        notes: company.notes || null
      });
    
    if (error) console.error('Error migrating coverage:', error);
  }
  
  // Migrate former coverage
  for (const company of formerCoverage) {
    const { error } = await supabase
      .from('coverage_universe')
      .upsert({
        user_id: userId,
        ticker: company.ticker,
        company_name: company.company,
        sector: company.sector || null,
        last_model_date: company.lastModelDate || null,
        last_memo_date: company.lastMemoDate || null,
        status: 'former',
        removal_reason: company.removalReason || null,
        removal_date: company.removalDate || null,
        notes: company.notes || null
      });
    
    if (error) console.error('Error migrating former coverage:', error);
  }
};

const migrateDeliverables = async (userId) => {
  const deliverables = JSON.parse(localStorage.getItem('deliverables') || '[]');
  
  for (const item of deliverables) {
    const { error } = await supabase
      .from('deliverables')
      .upsert({
        user_id: userId,
        title: item.title,
        type: item.type || 'memo',
        stage: item.stage || 'started',
        priority: item.priority || 3,
        ticker: item.ticker || null,
        company_name: item.company || null,
        notes: item.notes || null,
        due_date: item.dueDate || null,
        completed_date: item.completedDate || null
      });
    
    if (error) console.error('Error migrating deliverable:', error);
  }
};

const migratePipelineIdeas = async (userId) => {
  const pipelineIdeas = JSON.parse(localStorage.getItem('pipelineIdeas') || '[]');
  
  for (const idea of pipelineIdeas) {
    const { error } = await supabase
      .from('pipeline_ideas')
      .upsert({
        user_id: userId,
        ticker: idea.ticker || null,
        company_name: idea.company,
        idea_type: idea.type || 'general',
        thesis: idea.thesis || null,
        catalyst: idea.catalyst || null,
        target_price: idea.targetPrice || null,
        status: idea.status || 'active',
        priority: idea.priority || 3
      });
    
    if (error) console.error('Error migrating pipeline idea:', error);
  }
};

// Function to clear localStorage after successful migration
export const clearLocalStorage = () => {
  const keysToRemove = [
    'checkoutHistory',
    'goalsHistory', 
    'coverage',
    'formerCoverage',
    'deliverables',
    'pipelineIdeas',
    'streak',
    'weeklyWins'
  ];
  
  keysToRemove.forEach(key => localStorage.removeItem(key));
  console.log('localStorage cleared');
}; 