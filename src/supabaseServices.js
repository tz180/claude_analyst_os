import { supabase } from './supabase';

// Get current user ID from Supabase auth
const getCurrentUserId = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
};

// Temporary: Remove user_id requirement for development
// This will be restored when we implement proper authentication

// Daily Check-ins Services
export const dailyCheckinServices = {
  // Get today's check-in
  async getTodayCheckin() {
    const userId = await getCurrentUserId();
    if (!userId) return null;

    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('daily_checkins')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching today checkin:', error);
      return null;
    }
    return data;
  },

  // Get checkout history
  async getCheckoutHistory() {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const { data, error } = await supabase
      .from('daily_checkins')
      .select('*')
      .eq('user_id', userId)
      .not('reflection', 'is', null)
      .order('date', { ascending: false })
      .limit(50);
    
    if (error) {
      console.error('Error fetching checkout history:', error);
      return [];
    }
    return data.map(item => ({
      date: item.date,
      reflection: item.reflection,
      rating: 3 // Default rating for now
    }));
  },

  // Get goals history
  async getGoalsHistory() {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const { data, error } = await supabase
      .from('daily_checkins')
      .select('*')
      .eq('user_id', userId)
      .not('goals', 'is', null)
      .order('date', { ascending: false })
      .limit(50);
    
    if (error) {
      console.error('Error fetching goals history:', error);
      return [];
    }
    return data.map(item => ({
      date: item.date,
      goals: Array.isArray(item.goals) ? item.goals.join('\n') : item.goals,
      completed: item.completed
    }));
  },

  // Create or update daily check-in
  async upsertCheckin(checkinData) {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false, error: 'User not authenticated' };

    const { data, error } = await supabase
      .from('daily_checkins')
      .upsert({
        ...checkinData,
        user_id: userId
      });
    
    if (error) {
      console.error('Error upserting checkin:', error);
      return { success: false, error };
    }
    return { success: true, data };
  },

  // Mark goals as completed
  async markGoalsCompleted(date) {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false, error: 'User not authenticated' };

    const { error } = await supabase
      .from('daily_checkins')
      .update({ completed: true })
      .eq('user_id', userId)
      .eq('date', date);
    
    if (error) {
      console.error('Error marking goals completed:', error);
      return { success: false, error };
    }
    return { success: true };
  }
};

// Coverage Universe Services
export const coverageServices = {
  // Get active coverage
  async getActiveCoverage() {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const { data, error } = await supabase
      .from('coverage_universe')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('company_name');
    
    if (error) {
      console.error('Error fetching active coverage:', error);
      return [];
    }
    return data.map(item => ({
      id: item.id,
      ticker: item.ticker,
      company: item.company_name,
      sector: item.sector,
      lastModelDate: item.last_model_date,
      lastMemoDate: item.last_memo_date,
      notes: item.notes
    }));
  },

  // Get former coverage
  async getFormerCoverage() {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const { data, error } = await supabase
      .from('coverage_universe')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'former')
      .order('removal_date', { ascending: false });
    
    if (error) {
      console.error('Error fetching former coverage:', error);
      return [];
    }
    return data.map(item => ({
      id: item.id,
      ticker: item.ticker,
      company: item.company_name,
      sector: item.sector,
      lastModelDate: item.last_model_date,
      lastMemoDate: item.last_memo_date,
      removalDate: item.removal_date,
      removalReason: item.removal_reason,
      notes: item.notes
    }));
  },

  // Add new company to coverage
  async addCompany(companyData) {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false, error: 'User not authenticated' };

    const { data, error } = await supabase
      .from('coverage_universe')
      .insert({
        user_id: userId,
        ticker: companyData.ticker,
        company_name: companyData.company,
        sector: companyData.sector,
        status: 'active'
      });
    
    if (error) {
      console.error('Error adding company:', error);
      return { success: false, error };
    }
    return { success: true, data };
  },

  // Update last model date
  async updateLastModel(companyId) {
    const today = new Date().toISOString().split('T')[0];
    const { error } = await supabase
      .from('coverage_universe')
      .update({ last_model_date: today })
      .eq('id', companyId);
    
    if (error) {
      console.error('Error updating last model:', error);
      return { success: false, error };
    }
    return { success: true };
  },

  // Update last memo date
  async updateLastMemo(companyId) {
    const today = new Date().toISOString().split('T')[0];
    const { error } = await supabase
      .from('coverage_universe')
      .update({ last_memo_date: today })
      .eq('id', companyId);
    
    if (error) {
      console.error('Error updating last memo:', error);
      return { success: false, error };
    }
    return { success: true };
  },

  // Move to former coverage
  async moveToFormerCoverage(companyId, reason) {
    const today = new Date().toISOString().split('T')[0];
    const { error } = await supabase
      .from('coverage_universe')
      .update({
        status: 'former',
        removal_reason: reason,
        removal_date: today
      })
      .eq('id', companyId);
    
    if (error) {
      console.error('Error moving to former coverage:', error);
      return { success: false, error };
    }
    return { success: true };
  }
};

// Deliverables Services
export const deliverablesServices = {
  // Get all deliverables
  async getDeliverables() {
    const { data, error } = await supabase
      .from('deliverables')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching deliverables:', error);
      return [];
    }
    
    // Convert priority integers back to strings for display
    const priorityMap = {
      1: 'High',
      2: 'Medium',
      3: 'Low'
    };
    
    return data.map(item => ({
      id: item.id,
      title: item.title,
      type: item.type,
      stage: item.stage,
      priority: priorityMap[item.priority] || 'Medium',
      ticker: item.ticker,
      company: item.company_name,
      notes: item.notes,
      dueDate: item.due_date,
      completedDate: item.completed_date,
      daysWorking: 0 // Calculate this if needed
    }));
  },

  // Add new deliverable
  async addDeliverable(deliverableData) {
    // Convert priority string to integer
    const priorityMap = {
      'Low': 3,
      'Medium': 2,
      'High': 1
    };
    
    const priority = priorityMap[deliverableData.priority] || 3;
    
    const { data, error } = await supabase
      .from('deliverables')
      .insert({
        title: deliverableData.title,
        type: deliverableData.type,
        stage: deliverableData.stage || 'started',
        priority: priority,
        ticker: deliverableData.ticker,
        company_name: deliverableData.company,
        notes: deliverableData.notes
      });
    
    if (error) {
      console.error('Error adding deliverable:', error);
      return { success: false, error };
    }
    return { success: true, data };
  },

  // Update deliverable stage
  async updateDeliverableStage(deliverableId, stage) {
    const updateData = { stage };
    if (stage === 'completed') {
      updateData.completed_date = new Date().toISOString().split('T')[0];
    }
    
    const { error } = await supabase
      .from('deliverables')
      .update(updateData)
      .eq('id', deliverableId);
    
    if (error) {
      console.error('Error updating deliverable stage:', error);
      return { success: false, error };
    }
    return { success: true };
  },

  // Update deliverable priority
  async updateDeliverablePriority(deliverableId, priority) {
    const { error } = await supabase
      .from('deliverables')
      .update({ priority })
      .eq('id', deliverableId);
    
    if (error) {
      console.error('Error updating deliverable priority:', error);
      return { success: false, error };
    }
    return { success: true };
  }
};

// Pipeline Ideas Services
export const pipelineServices = {
  // Get all pipeline ideas
  async getPipelineIdeas() {
    const { data, error } = await supabase
      .from('pipeline_ideas')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching pipeline ideas:', error);
      return [];
    }
    return data.map(item => ({
      id: item.id,
      company: item.company_name,
      ticker: item.ticker,
      type: item.idea_type,
      thesis: item.thesis,
      catalyst: item.catalyst,
      targetPrice: item.target_price,
      status: item.status,
      priority: item.priority,
      dateAdded: item.created_at.split('T')[0],
      daysInPipeline: Math.floor((new Date() - new Date(item.created_at)) / (1000 * 60 * 60 * 24)),
      inCoverage: false // This would need to be calculated based on coverage
    }));
  },

  // Add new pipeline idea
  async addPipelineIdea(ideaData) {
    const { data, error } = await supabase
      .from('pipeline_ideas')
      .insert({
        company_name: ideaData.company,
        ticker: ideaData.ticker,
        idea_type: ideaData.type || 'general',
        thesis: ideaData.thesis,
        catalyst: ideaData.catalyst,
        target_price: ideaData.targetPrice,
        status: ideaData.status || 'active',
        priority: ideaData.priority || 3
      });
    
    if (error) {
      console.error('Error adding pipeline idea:', error);
      return { success: false, error };
    }
    return { success: true, data };
  },

  // Update pipeline idea status
  async updatePipelineStatus(ideaId, status) {
    const { error } = await supabase
      .from('pipeline_ideas')
      .update({ status })
      .eq('id', ideaId);
    
    if (error) {
      console.error('Error updating pipeline status:', error);
      return { success: false, error };
    }
    return { success: true };
  }
}; 