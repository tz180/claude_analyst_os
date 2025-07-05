import { supabase } from './supabase';

// Get current user ID from Supabase auth
const getCurrentUserId = async () => {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      console.error('Error getting user:', error);
      return null;
    }
    return data?.user?.id || null;
  } catch (error) {
    console.error('Error in getCurrentUserId:', error);
    return null;
  }
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
    console.log('getCheckoutHistory raw data:', data);
    return data.map(item => ({
      date: item.date,
      reflection: item.reflection,
      rating: item.rating || 3 // Use actual rating from database, default to 3 if null
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

    // Ensure rating is included in the data
    const checkinWithRating = {
      ...checkinData,
      user_id: userId,
      rating: typeof checkinData.rating === 'number' ? checkinData.rating : 3 // Use actual rating if provided
    };

    console.log('Upserting checkin with data:', checkinWithRating);

    const { data, error } = await supabase
      .from('daily_checkins')
      .upsert(checkinWithRating, {
        onConflict: 'user_id,date'
      });
    
    if (error) {
      console.error('Error upserting checkin:', error);
      return { success: false, error };
    }
    
    console.log('Checkin upserted successfully:', data);
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
    try {
      console.log('Adding company to coverage:', companyData);
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
        })
        .select();
      
      console.log('Coverage insert result:', { data, error });
      
      if (error) throw error;
      return { success: true, data: data[0] };
    } catch (error) {
      console.error('Error adding company:', error);
      return { success: false, error };
    }
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
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const { data, error } = await supabase
      .from('deliverables')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching deliverables:', error);
      return [];
    }
    
    return data.map(item => ({
      id: item.id,
      title: item.title,
      type: item.type || 'memo',
      stage: item.stage || 'started',
      priority: item.priority || 'Medium',
      ticker: item.ticker,
      company: item.company_name,
      notes: item.notes,
      dueDate: item.due_date,
      completedDate: item.completed_date,
      daysWorking: item.created_at ? Math.ceil((new Date() - new Date(item.created_at)) / (1000 * 60 * 60 * 24)) : 0
    }));
  },

  // Add new deliverable
  async addDeliverable(deliverableData) {
    try {
      console.log('Adding deliverable:', deliverableData);
      const userId = await getCurrentUserId();
      if (!userId) return { success: false, error: 'User not authenticated' };

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
          user_id: userId,
          title: deliverableData.title,
          type: deliverableData.type,
          stage: deliverableData.stage || 'started',
          priority: priority,
          ticker: deliverableData.ticker,
          company_name: deliverableData.company,
          notes: deliverableData.notes
        })
        .select();
      
      console.log('Deliverable insert result:', { data, error });
      
      if (error) throw error;
      return { success: true, data: data[0] };
    } catch (error) {
      console.error('Error adding deliverable:', error);
      return { success: false, error };
    }
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
  // Get pipeline ideas
  async getPipelineIdeas() {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const { data, error } = await supabase
      .from('pipeline_ideas')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching pipeline ideas:', error);
      return [];
    }
    
    return data.map(item => ({
      id: item.id,
      company: item.company_name,
      ticker: item.ticker,
      status: item.status || 'On Deck',
      dateAdded: item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Unknown',
      daysInPipeline: item.created_at ? Math.ceil((new Date() - new Date(item.created_at)) / (1000 * 60 * 60 * 24)) : 0,
      passReason: item.pass_reason,
      passDate: item.pass_date,
      inCoverage: false // This will be calculated separately
    }));
  },

  // Add new pipeline idea
  async addPipelineIdea(ideaData) {
    try {
      console.log('Adding pipeline idea:', ideaData);
      const userId = await getCurrentUserId();
      if (!userId) return { success: false, error: 'User not authenticated' };

      const { data, error } = await supabase
        .from('pipeline_ideas')
        .insert({
          user_id: userId,
          company_name: ideaData.company,
          ticker: ideaData.ticker,
          idea_type: ideaData.type || 'general',
          thesis: ideaData.thesis,
          catalyst: ideaData.catalyst,
          target_price: ideaData.targetPrice,
          status: ideaData.status || 'active',
          priority: ideaData.priority || 3
        })
        .select();
      
      console.log('Pipeline idea insert result:', { data, error });
      
      if (error) throw error;
      return { success: true, data: data[0] };
    } catch (error) {
      console.error('Error adding pipeline idea:', error);
      return { success: false, error };
    }
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

// Analytics Services
export const analyticsServices = {
  // Calculate pipeline velocity metrics
  async getPipelineVelocity() {
    const userId = await getCurrentUserId();
    if (!userId) return {};

    const { data, error } = await supabase
      .from('pipeline_ideas')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching pipeline data for analytics:', error);
      return {};
    }

    const now = new Date();
    const pipelineData = data || [];
    
    // Calculate velocity by status
    const velocityByStatus = {
      'On Deck': { count: 0, avgDays: 0, items: [] },
      'Core': { count: 0, avgDays: 0, items: [] },
      'Active': { count: 0, avgDays: 0, items: [] },
      'Passed': { count: 0, avgDays: 0, items: [] }
    };

    pipelineData.forEach(item => {
      const status = item.status || 'On Deck';
      const daysInPipeline = item.created_at ? 
        Math.ceil((now - new Date(item.created_at)) / (1000 * 60 * 60 * 24)) : 0;
      
      if (velocityByStatus[status]) {
        velocityByStatus[status].count++;
        velocityByStatus[status].items.push({
          company: item.company_name,
          ticker: item.ticker,
          days: daysInPipeline,
          dateAdded: item.created_at
        });
      }
    });

    // Calculate averages
    Object.keys(velocityByStatus).forEach(status => {
      const items = velocityByStatus[status].items;
      if (items.length > 0) {
        velocityByStatus[status].avgDays = Math.round(
          items.reduce((sum, item) => sum + item.days, 0) / items.length
        );
      }
    });

    // Calculate overall pipeline health
    const totalItems = pipelineData.length;
    const activeItems = velocityByStatus['Active'].count + velocityByStatus['Core'].count;
    const passedItems = velocityByStatus['Passed'].count;
    const conversionRate = totalItems > 0 ? Math.round((activeItems / totalItems) * 100) : 0;

    return {
      velocityByStatus,
      totalItems,
      activeItems,
      passedItems,
      conversionRate,
      pipelineHealth: conversionRate >= 30 ? 'Good' : conversionRate >= 15 ? 'Fair' : 'Needs Attention'
    };
  },

  // Calculate coverage activity metrics
  async getCoverageActivity() {
    const userId = await getCurrentUserId();
    if (!userId) return {};

    const { data, error } = await supabase
      .from('coverage_universe')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('last_model_date', { ascending: false });
    
    if (error) {
      console.error('Error fetching coverage data for analytics:', error);
      return {};
    }

    const now = new Date();
    const coverageData = data || [];
    
    const activityMetrics = {
      totalCompanies: coverageData.length,
      recentlyActive: 0, // Last 30 days
      needsAttention: 0, // No activity in 90+ days
      avgDaysSinceModel: 0,
      avgDaysSinceMemo: 0,
      companiesByActivity: {
        'Very Active': 0, // Last 7 days
        'Active': 0,      // Last 30 days
        'Needs Attention': 0, // 30-90 days
        'Inactive': 0     // 90+ days
      }
    };

    let totalDaysSinceModel = 0;
    let totalDaysSinceMemo = 0;
    let modelCount = 0;
    let memoCount = 0;

    coverageData.forEach(company => {
      const daysSinceModel = company.last_model_date ? 
        Math.ceil((now - new Date(company.last_model_date)) / (1000 * 60 * 60 * 24)) : 999;
      const daysSinceMemo = company.last_memo_date ? 
        Math.ceil((now - new Date(company.last_memo_date)) / (1000 * 60 * 60 * 24)) : 999;

      if (daysSinceModel < 999) {
        totalDaysSinceModel += daysSinceModel;
        modelCount++;
      }
      if (daysSinceMemo < 999) {
        totalDaysSinceMemo += daysSinceMemo;
        memoCount++;
      }

      // Categorize by activity level
      const mostRecent = Math.min(daysSinceModel, daysSinceMemo);
      if (mostRecent <= 7) {
        activityMetrics.companiesByActivity['Very Active']++;
      } else if (mostRecent <= 30) {
        activityMetrics.companiesByActivity['Active']++;
        activityMetrics.recentlyActive++;
      } else if (mostRecent <= 90) {
        activityMetrics.companiesByActivity['Needs Attention']++;
      } else {
        activityMetrics.companiesByActivity['Inactive']++;
        activityMetrics.needsAttention++;
      }
    });

    activityMetrics.avgDaysSinceModel = modelCount > 0 ? Math.round(totalDaysSinceModel / modelCount) : 0;
    activityMetrics.avgDaysSinceMemo = memoCount > 0 ? Math.round(totalDaysSinceMemo / memoCount) : 0;

    return activityMetrics;
  },

  // Calculate productivity metrics
  async getProductivityMetrics() {
    const userId = await getCurrentUserId();
    if (!userId) return {};

    const { data, error } = await supabase
      .from('deliverables')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching deliverables data for analytics:', error);
      return {};
    }

    const now = new Date();
    const deliverablesData = data || [];
    
    const productivityMetrics = {
      totalDeliverables: deliverablesData.length,
      completed: 0,
      inProgress: 0,
      stalled: 0,
      completionRate: 0,
      avgDaysToComplete: 0,
      byType: { memo: 0, model: 0 },
      byPriority: { High: 0, Medium: 0, Low: 0 },
      recentActivity: 0, // Last 7 days
      weeklyTrend: [] // Last 4 weeks
    };

    let totalDaysToComplete = 0;
    let completedCount = 0;

    deliverablesData.forEach(item => {
      // Count by status
      if (item.stage === 'completed') {
        productivityMetrics.completed++;
        if (item.completed_date && item.created_at) {
          const daysToComplete = Math.ceil(
            (new Date(item.completed_date) - new Date(item.created_at)) / (1000 * 60 * 60 * 24)
          );
          totalDaysToComplete += daysToComplete;
          completedCount++;
        }
      } else if (item.stage === 'stalled') {
        productivityMetrics.stalled++;
      } else {
        productivityMetrics.inProgress++;
      }

      // Count by type
      if (item.type === 'memo') {
        productivityMetrics.byType.memo++;
      } else if (item.type === 'model') {
        productivityMetrics.byType.model++;
      }

      // Count by priority
      const priority = item.priority || 'Medium';
      if (productivityMetrics.byPriority[priority]) {
        productivityMetrics.byPriority[priority]++;
      }

      // Check recent activity
      if (item.created_at) {
        const daysSinceCreated = Math.ceil((now - new Date(item.created_at)) / (1000 * 60 * 60 * 24));
        if (daysSinceCreated <= 7) {
          productivityMetrics.recentActivity++;
        }
      }
    });

    productivityMetrics.completionRate = productivityMetrics.totalDeliverables > 0 ? 
      Math.round((productivityMetrics.completed / productivityMetrics.totalDeliverables) * 100) : 0;
    productivityMetrics.avgDaysToComplete = completedCount > 0 ? 
      Math.round(totalDaysToComplete / completedCount) : 0;

    return productivityMetrics;
  },

  // Get comprehensive dashboard analytics
  async getDashboardAnalytics() {
    try {
      const [pipelineVelocity, coverageActivity, productivityMetrics] = await Promise.all([
        this.getPipelineVelocity(),
        this.getCoverageActivity(),
        this.getProductivityMetrics()
      ]);

      return {
        pipelineVelocity: pipelineVelocity || {},
        coverageActivity: coverageActivity || {},
        productivityMetrics: productivityMetrics || {},
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting dashboard analytics:', error);
      return {
        pipelineVelocity: {},
        coverageActivity: {},
        productivityMetrics: {},
        timestamp: new Date().toISOString()
      };
    }
  },

  // Get connected data for a specific ticker
  async getConnectedData(ticker) {
    const userId = await getCurrentUserId();
    if (!userId) return null;

    try {
      // Get pipeline data for this ticker
      const { data: pipelineData, error: pipelineError } = await supabase
        .from('pipeline_ideas')
        .select('*')
        .eq('user_id', userId)
        .ilike('ticker', `%${ticker}%`)
        .single();

      // Get coverage data for this ticker
      const { data: coverageData, error: coverageError } = await supabase
        .from('coverage_universe')
        .select('*')
        .eq('user_id', userId)
        .ilike('ticker', `%${ticker}%`)
        .single();

      // Get deliverables (memos/models) for this ticker
      const { data: deliverablesData, error: deliverablesError } = await supabase
        .from('deliverables')
        .select('*')
        .eq('user_id', userId)
        .ilike('company', `%${ticker}%`)
        .order('created_at', { ascending: false });

      return {
        pipeline: pipelineError ? null : pipelineData,
        coverage: coverageError ? null : coverageData,
        deliverables: deliverablesError ? [] : deliverablesData
      };
    } catch (error) {
      console.error('Error fetching connected data:', error);
      return null;
    }
  }
};

// Stock Notes Services
export const stockNotesServices = {
  // Get notes for a specific ticker
  async getNotes(ticker) {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const { data, error } = await supabase
      .from('stock_notes')
      .select('*')
      .eq('user_id', userId)
      .eq('ticker', ticker)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching notes:', error);
      return [];
    }
    return data || [];
  },

  // Add a new note
  async addNote(noteData) {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false, error: 'User not authenticated' };

    const { data, error } = await supabase
      .from('stock_notes')
      .insert({
        user_id: userId,
        ticker: noteData.ticker,
        title: noteData.title,
        content: noteData.content,
        price_when_written: noteData.priceWhenWritten,
        created_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('Error adding note:', error);
      return { success: false, error };
    }
    return { success: true, data };
  }
}; 