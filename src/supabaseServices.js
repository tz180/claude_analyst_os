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

// Helper function to get local date in YYYY-MM-DD format
const getLocalDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Normalize nullable numeric values before persisting to the database
const parseNullableNumber = (value) => {
  if (value === null || value === undefined) return null;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '' || trimmed === '-') return null;
    const parsed = parseFloat(trimmed.replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

// Temporary: Remove user_id requirement for development
// This will be restored when we implement proper authentication

// Daily Check-ins Services
export const dailyCheckinServices = {
  // Get today's check-in
  async getTodayCheckin() {
    const userId = await getCurrentUserId();
    if (!userId) return null;

    const today = getLocalDate();
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
    const today = getLocalDate();
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
    const today = getLocalDate();
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
    const today = getLocalDate();
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
      updateData.completed_date = getLocalDate();
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
  },

  // Delete deliverable
  async deleteDeliverable(deliverableId) {
    try {
      console.log('Deleting deliverable:', deliverableId);
      const userId = await getCurrentUserId();
      if (!userId) return { success: false, error: 'User not authenticated' };

      const { error } = await supabase
        .from('deliverables')
        .delete()
        .eq('id', deliverableId)
        .eq('user_id', userId); // Ensure user can only delete their own deliverables
      
      if (error) {
        console.error('Error deleting deliverable:', error);
        return { success: false, error };
      }
      
      console.log('Deliverable deleted successfully');
      return { success: true };
    } catch (error) {
      console.error('Exception deleting deliverable:', error);
      return { success: false, error };
    }
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
      passReason: item.pass_reason || '',
      passDate: item.pass_date ? new Date(item.pass_date).toLocaleDateString() : '',
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
  async updatePipelineStatus(ideaId, status, passReason = null) {
    const updateData = { status };
    
    // If passing an idea, set the pass date and reason
    if (status === 'Passed' && passReason) {
      updateData.pass_date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      updateData.pass_reason = passReason;
    }
    
    const { error } = await supabase
      .from('pipeline_ideas')
      .update(updateData)
      .eq('id', ideaId);
    
    if (error) {
      console.error('Error updating pipeline status:', error);
      return { success: false, error };
    }
    return { success: true };
  }
};

// Portfolio Services
export const portfolioServices = {
  // Get user's portfolio
  async getPortfolio() {
    try {
      const userId = await getCurrentUserId();
      
      console.log('getPortfolio called with userId:', userId);
      
      if (!userId) {
        console.error('No user ID available');
        return null;
      }
      
      // Get the user's most recent portfolio
      const { data, error } = await supabase
        .from('portfolios')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (error) {
        console.error('Error fetching portfolio:', error);
        return null;
      }
      
      console.log('getPortfolio result:', data);
      
      if (data && data.length > 0) {
        return data[0];
      }
      
      return null;
    } catch (error) {
      console.error('Error in getPortfolio:', error);
      return null;
    }
  },

  // Create portfolio for user
  async createPortfolio() {
    try {
      const userId = await getCurrentUserId();
      
      console.log('createPortfolio called with userId:', userId);
      
      if (!userId) {
        console.error('No user ID available');
        return { success: false, error: 'User not authenticated' };
      }
      
      // Check if a portfolio already exists before creating
      const existingPortfolio = await this.getPortfolio();
      if (existingPortfolio) {
        console.log('Portfolio already exists, returning existing one:', existingPortfolio);
        return { success: true, data: existingPortfolio };
      }
      
      // Create portfolio with user_id
      const portfolioData = {
        user_id: userId,
        name: 'My Portfolio',
        starting_cash: 50000000.00,
        current_cash: 50000000.00
      };

      console.log('Creating new portfolio with data:', portfolioData);

      const { data, error } = await supabase
        .from('portfolios')
        .insert(portfolioData)
        .select();
      
      if (error) {
        console.error('Error creating portfolio:', error);
        return { success: false, error };
      }
      
      console.log('Successfully created portfolio:', data);
      return { success: true, data: data && data.length > 0 ? data[0] : null };
    } catch (error) {
      console.error('Error in createPortfolio:', error);
      return { success: false, error };
    }
  },

  // Get positions for a portfolio
  async getPositions(portfolioId) {
    try {
      console.log('=== getPositions FUNCTION START ===');
      console.log('Portfolio ID:', portfolioId);
      
      const { data, error } = await supabase
        .from('portfolio_positions')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .order('ticker');
      
      console.log('Positions query result:', { data, error });
      
      if (error) {
        console.error('Error fetching positions:', error);
        return [];
      }
      
      console.log('=== getPositions FUNCTION SUCCESS ===');
      return data || [];
    } catch (error) {
      console.error('=== getPositions FUNCTION ERROR ===');
      console.error('Error in getPositions:', error);
      return [];
    }
  },

  // Get transactions for a portfolio
  async getTransactions(portfolioId) {
    try {
      console.log('=== getTransactions FUNCTION START ===');
      console.log('Portfolio ID:', portfolioId);
      
      const { data, error } = await supabase
        .from('portfolio_transactions')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .order('transaction_date', { ascending: false });
      
      console.log('Transactions query result:', { data, error });
      
      if (error) {
        console.error('Error fetching transactions:', error);
        return [];
      }
      
      console.log('=== getTransactions FUNCTION SUCCESS ===');
      return data || [];
    } catch (error) {
      console.error('=== getTransactions FUNCTION ERROR ===');
      console.error('Error in getTransactions:', error);
      return [];
    }
  },

  // Buy shares
  async buyShares(portfolioId, ticker, shares, pricePerShare, notes = '') {
    try {
      console.log('=== buyShares FUNCTION START ===');
      console.log('Parameters:', { portfolioId, ticker, shares, pricePerShare, notes });
      
      const totalAmount = shares * pricePerShare;
      console.log('Total amount calculated:', totalAmount);
      
      // Check if we have enough cash
      console.log('Checking portfolio cash...');
      const { data: portfolio, error: portfolioError } = await supabase
        .from('portfolios')
        .select('current_cash')
        .eq('id', portfolioId);
      
      console.log('Portfolio query result:', { portfolio, error: portfolioError });
      
      if (portfolioError) {
        console.error('Error fetching portfolio:', portfolioError);
        return { success: false, error: 'Error fetching portfolio: ' + portfolioError.message };
      }
      
      if (!portfolio || portfolio.length === 0) {
        console.error('Portfolio not found');
        return { success: false, error: 'Portfolio not found' };
      }
      
      const portfolioData = portfolio[0];
      console.log('Current cash:', portfolioData.current_cash);
      console.log('Required amount:', totalAmount);
      
      if (portfolioData.current_cash < totalAmount) {
        console.error('Insufficient cash');
        return { success: false, error: 'Insufficient cash to complete purchase' };
      }
      
      // Start transaction
      console.log('Inserting transaction record...');
      const { data: transaction, error: transactionError } = await supabase
        .from('portfolio_transactions')
        .insert({
          portfolio_id: portfolioId,
          ticker,
          transaction_type: 'buy',
          shares,
          price_per_share: pricePerShare,
          total_amount: totalAmount,
          notes
        })
        .select();
      
      console.log('Transaction insert result:', { transaction, error: transactionError });
      
      if (transactionError) {
        console.error('Transaction insert error:', transactionError);
        throw transactionError;
      }

      // Update or create position
      console.log('Checking existing position...');
      const { data: existingPosition, error: positionQueryError } = await supabase
        .from('portfolio_positions')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .eq('ticker', ticker);

      console.log('Position query result:', { existingPosition, error: positionQueryError });

      if (existingPosition && existingPosition.length > 0) {
        // Update existing position
        const positionData = existingPosition[0];
        console.log('Updating existing position...');
        const newShares = positionData.shares + shares;
        const newAveragePrice = ((positionData.shares * positionData.average_price) + totalAmount) / newShares;
        
        console.log('New position values:', { newShares, newAveragePrice });
        
        const { error: updateError } = await supabase
          .from('portfolio_positions')
          .update({
            shares: newShares,
            average_price: newAveragePrice
          })
          .eq('id', positionData.id);
        
        console.log('Position update result:', { error: updateError });
        
        if (updateError) {
          console.error('Position update error:', updateError);
          throw updateError;
        }
      } else {
        // Create new position
        console.log('Creating new position...');
        const { error: insertError } = await supabase
          .from('portfolio_positions')
          .insert({
            portfolio_id: portfolioId,
            ticker,
            shares,
            average_price: pricePerShare
          });
        
        console.log('Position insert result:', { error: insertError });
        
        if (insertError) {
          console.error('Position insert error:', insertError);
          throw insertError;
        }
      }

      // Update cash balance
      console.log('Updating cash balance...');
      const newCashBalance = portfolioData.current_cash - totalAmount;
      console.log('New cash balance:', newCashBalance);
      
      const { error: cashUpdateError } = await supabase
        .from('portfolios')
        .update({ current_cash: newCashBalance })
        .eq('id', portfolioId);
      
      console.log('Cash update result:', { error: cashUpdateError });
      
      if (cashUpdateError) {
        console.error('Cash update error:', cashUpdateError);
        throw cashUpdateError;
      }

      console.log('=== buyShares FUNCTION SUCCESS ===');
      
      // Trigger historical portfolio value recalculation (async, non-blocking)
      historicalPortfolioValueServices.calculateAndStoreHistoricalValues(portfolioId)
        .then(result => {
          if (result.success) {
            console.log('✅ Historical portfolio values updated after buy transaction');
          } else {
            console.warn('⚠ Failed to update historical portfolio values:', result.error);
          }
        })
        .catch(err => {
          console.error('Error updating historical portfolio values:', err);
        });
      
      return { success: true, data: transaction && transaction.length > 0 ? transaction[0] : null };
    } catch (error) {
      console.error('=== buyShares FUNCTION ERROR ===');
      console.error('Error buying shares:', error);
      return { success: false, error };
    }
  },

  // Sell shares
  async sellShares(portfolioId, ticker, shares, pricePerShare, notes = '') {
    try {
      console.log('Selling shares:', { portfolioId, ticker, shares, pricePerShare });
      
      const totalAmount = shares * pricePerShare;
      
      // Check if we have enough shares
      const { data: position } = await supabase
        .from('portfolio_positions')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .eq('ticker', ticker);
      
      if (!position || position.length === 0 || position[0].shares < shares) {
        return { success: false, error: 'Insufficient shares to sell' };
      }
      
      const positionData = position[0];

      // Record transaction
      const { data: transaction, error: transactionError } = await supabase
        .from('portfolio_transactions')
        .insert({
          portfolio_id: portfolioId,
          ticker,
          transaction_type: 'sell',
          shares,
          price_per_share: pricePerShare,
          total_amount: totalAmount,
          notes
        })
        .select();
      
      if (transactionError) throw transactionError;

      // Update position
      const remainingShares = positionData.shares - shares;
      
      if (remainingShares === 0) {
        // Delete position if no shares remaining
        const { error: deleteError } = await supabase
          .from('portfolio_positions')
          .delete()
          .eq('id', positionData.id);
        
        if (deleteError) throw deleteError;
      } else {
        // Update position with remaining shares
        const { error: updateError } = await supabase
          .from('portfolio_positions')
          .update({
            shares: remainingShares
          })
          .eq('id', positionData.id);
        
        if (updateError) throw updateError;
      }

      // Add cash back to portfolio
      const { data: portfolio } = await supabase
        .from('portfolios')
        .select('current_cash')
        .eq('id', portfolioId);
      
      if (portfolio && portfolio.length > 0) {
        const newCashBalance = portfolio[0].current_cash + totalAmount;
        const { error: cashUpdateError } = await supabase
          .from('portfolios')
          .update({ current_cash: newCashBalance })
          .eq('id', portfolioId);
        
        if (cashUpdateError) throw cashUpdateError;
      }

      console.log('Sell transaction completed successfully');
      
      // Trigger historical portfolio value recalculation (async, non-blocking)
      historicalPortfolioValueServices.calculateAndStoreHistoricalValues(portfolioId)
        .then(result => {
          if (result.success) {
            console.log('✅ Historical portfolio values updated after sell transaction');
          } else {
            console.warn('⚠ Failed to update historical portfolio values:', result.error);
          }
        })
        .catch(err => {
          console.error('Error updating historical portfolio values:', err);
        });
      
      return { success: true, data: transaction && transaction.length > 0 ? transaction[0] : null };
    } catch (error) {
      console.error('Error selling shares:', error);
      return { success: false, error };
    }
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

  // Get all notes for the current user
  async getAllNotes() {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const { data, error } = await supabase
      .from('stock_notes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching stock notes:', error);
      throw error;
    }

    return data || [];
  },

  // Add a new note
  async addNote(noteData) {
    console.log('stockNotesServices.addNote called with:', noteData);

    const userId = await getCurrentUserId();
    console.log('Current user ID:', userId);
    
    if (!userId) return { success: false, error: 'User not authenticated' };

    const insertData = {
      user_id: userId,
      ticker: noteData.ticker,
      title: noteData.title,
      content: noteData.content,
      price_when_written: noteData.priceWhenWritten,
      ev_to_ebitda_when_written: parseNullableNumber(noteData.evToEbitdaWhenWritten),
      ev_to_revenue_when_written: parseNullableNumber(noteData.evToRevenueWhenWritten),
      created_at: new Date().toISOString()
    };
    
    console.log('Inserting note with data:', insertData);

    const { data, error } = await supabase
      .from('stock_notes')
      .insert(insertData);
    
    console.log('Supabase insert result:', { data, error });
    
    if (error) {
      console.error('Error adding note:', error);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  }
}; 

// Test function to check portfolio access
export const testPortfolioAccess = async () => {
  try {
    console.log('=== TESTING PORTFOLIO ACCESS ===');
    
    // Test 1: Simple select without any filters
    console.log('Test 1: Simple select from portfolios');
    const { data: test1, error: error1 } = await supabase
      .from('portfolios')
      .select('*')
      .limit(1);
    
    console.log('Test 1 result:', { data: test1, error: error1 });
    
    // Test 2: Count total portfolios
    console.log('Test 2: Count portfolios');
    const { count: test2, error: error2 } = await supabase
      .from('portfolios')
      .select('*', { count: 'exact', head: true });
    
    console.log('Test 2 result:', { count: test2, error: error2 });
    
    // Test 3: Try to insert a test portfolio
    console.log('Test 3: Insert test portfolio');
    const { data: test3, error: error3 } = await supabase
      .from('portfolios')
      .insert({
        name: 'Test Portfolio',
        starting_cash: 1000000.00,
        current_cash: 1000000.00
      })
      .select()
      .single();
    
    console.log('Test 3 result:', { data: test3, error: error3 });
    
    return {
      test1: { data: test1, error: error1 },
      test2: { count: test2, error: error2 },
      test3: { data: test3, error: error3 }
    };
  } catch (error) {
    console.error('Test function error:', error);
    return { error: error.message };
  }
};

// Function to clean up multiple portfolios
export const cleanupPortfolios = async () => {
  try {
    console.log('=== CLEANING UP PORTFOLIOS ===');
    
    // Get all portfolios
    const { data: portfolios, error: portfoliosError } = await supabase
      .from('portfolios')
      .select('*');
    
    if (portfoliosError) {
      console.error('Error fetching portfolios:', portfoliosError);
      return { success: false, error: portfoliosError };
    }
    
    console.log('Found portfolios:', portfolios.length);
    
    if (portfolios.length <= 1) {
      console.log('No cleanup needed, only one portfolio exists');
      return { success: true, message: 'No cleanup needed' };
    }
    
    // Find the portfolio with the most transactions (main portfolio)
    const { data: transactionCounts, error: transactionError } = await supabase
      .from('portfolio_transactions')
      .select('portfolio_id, count')
      .select('portfolio_id')
      .select('*');
    
    if (transactionError) {
      console.error('Error fetching transaction counts:', transactionError);
      return { success: false, error: transactionError };
    }
    
    // Count transactions per portfolio
    const portfolioTransactionCounts = {};
    transactionCounts.forEach(transaction => {
      portfolioTransactionCounts[transaction.portfolio_id] = (portfolioTransactionCounts[transaction.portfolio_id] || 0) + 1;
    });
    
    // Find portfolio with most transactions
    const mainPortfolioId = Object.keys(portfolioTransactionCounts).reduce((a, b) => 
      portfolioTransactionCounts[a] > portfolioTransactionCounts[b] ? a : b
    );
    
    console.log('Main portfolio ID:', mainPortfolioId);
    console.log('Transaction counts:', portfolioTransactionCounts);
    
    // Delete other portfolios (this is destructive, so we'll just log for now)
    console.log('Would delete portfolios:', portfolios.filter(p => p.id !== mainPortfolioId).map(p => p.id));
    
    return { 
      success: true, 
      message: `Found ${portfolios.length} portfolios, main portfolio has ${portfolioTransactionCounts[mainPortfolioId] || 0} transactions`,
      mainPortfolioId,
      portfolioCounts: portfolioTransactionCounts
    };
  } catch (error) {
    console.error('Cleanup function error:', error);
    return { success: false, error: error.message };
  }
}; 

// Test function to verify Supabase connection and portfolio creation
export const testSupabaseConnection = async () => {
  try {
    console.log('=== TESTING SUPABASE CONNECTION ===');
    
    // Test 1: Check if we can connect to Supabase
    const { data: testData, error: testError } = await supabase
      .from('portfolios')
      .select('count')
      .limit(1);
    
    console.log('Supabase connection test:', { data: testData, error: testError });
    
    if (testError) {
      console.error('❌ Supabase connection failed:', testError);
      return { success: false, error: testError };
    }
    
    console.log('✅ Supabase connection successful');
    
    // Test 2: Try to create a test portfolio
    const testPortfolioData = {
      name: 'Test Portfolio',
      starting_cash: 1000000.00,
      current_cash: 1000000.00
    };
    
    console.log('Attempting to create test portfolio with data:', testPortfolioData);
    
    const { data: createData, error: createError } = await supabase
      .from('portfolios')
      .insert(testPortfolioData)
      .select();
    
    console.log('Portfolio creation test:', { data: createData, error: createError });
    
    if (createError) {
      console.error('❌ Portfolio creation failed:', createError);
      return { success: false, error: createError };
    }
    
    const createdPortfolio = createData && createData.length > 0 ? createData[0] : null;
    console.log('✅ Portfolio creation successful:', createdPortfolio);
    
    // Clean up: Delete the test portfolio
    const { error: deleteError } = await supabase
      .from('portfolios')
      .delete()
      .eq('id', createdPortfolio.id);
    
    if (deleteError) {
      console.warn('⚠️ Could not delete test portfolio:', deleteError);
    } else {
      console.log('✅ Test portfolio cleaned up');
    }
    
    console.log('=== SUPABASE CONNECTION TEST COMPLETE ===');
    return { success: true, data: createdPortfolio };
    
  } catch (error) {
    console.error('❌ Test failed with exception:', error);
    return { success: false, error };
  }
}; 
// Factor exposure helpers
export const factorExposureServices = {
  async getLatestExposures(tickers = []) {
    const today = new Date().toISOString().slice(0, 10);
    const query = supabase.from('factor_exposures').select('*').lte('date', today).order('date', { ascending: false });
    if (tickers.length > 0) {
      query.in('ticker', tickers.map((t) => t.toUpperCase()));
    }
    const { data, error } = await query.limit(100);
    if (error) {
      console.error('Error loading factor exposures', error);
      return [];
    }
    if (!data || data.length === 0) {
      return tickers.map((ticker) => ({
        date: today,
        ticker,
        betas: { mkt: 1.0, smb: 0.2, hml: -0.1 },
      }));
    }
    return data;
  },

  async upsertExposure(row) {
    const { error } = await supabase.from('factor_exposures').upsert(row, { onConflict: 'date,ticker' });
    if (error) {
      console.error('Failed to upsert factor exposure', error);
    }
    return { success: !error, error };
  },
};

// Regime detection data helpers
export const regimeServices = {
  async getRegimes(limit = 5) {
    const { data, error } = await supabase
      .from('regimes')
      .select('*')
      .order('as_of_date', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching regimes', error);
      return [];
    }

    if (!data || data.length === 0) {
      const today = new Date().toISOString().slice(0, 10);
      return [
        {
          id: 'simulated-regime',
          as_of_date: today,
          label: 'Calm Growth',
          probabilities: { calm: 0.55, stress: 0.25, growth: 0.2 },
          drivers: { vol: 12, spread: -0.1 },
        },
      ];
    }

    return data;
  },

  async upsertRegime(entry) {
    const { error } = await supabase.from('regimes').upsert(entry, { onConflict: 'as_of_date,label' });
    if (error) {
      console.error('Failed to upsert regime', error);
    }
    return { success: !error, error };
  },

  async getCurrentProbabilities() {
    const regimes = await this.getRegimes(1);
    const latest = regimes[0];
    const probabilities = latest?.probabilities || { calm: 0.5, stress: 0.3, growth: 0.2 };
    const normalizedTotal = Object.values(probabilities).reduce((sum, v) => sum + (Number(v) || 0), 0) || 1;
    const normalized = Object.fromEntries(
      Object.entries(probabilities).map(([k, v]) => [k, (Number(v) || 0) / normalizedTotal])
    );
    return { ...latest, probabilities: normalized };
  },
};

// Historical Stock Prices Services
export const historicalPriceServices = {
  // Get historical prices for a ticker from the database
  async getHistoricalPrices(ticker, startDate = null, endDate = null) {
    try {
      let query = supabase
        .from('historical_stock_prices')
        .select('*')
        .eq('ticker', ticker.toUpperCase())
        .order('date', { ascending: true });

      if (startDate) {
        query = query.gte('date', startDate);
      }
      if (endDate) {
        query = query.lte('date', endDate);
      }

      const { data, error } = await query;

      if (error) {
        console.error(`Error fetching historical prices for ${ticker}:`, error);
        return { success: false, error: error.message, data: [] };
      }

      return {
        success: true,
        data: (data || []).map(row => ({
          date: row.date,
          price: parseFloat(row.price),
          open: row.open ? parseFloat(row.open) : null,
          high: row.high ? parseFloat(row.high) : null,
          low: row.low ? parseFloat(row.low) : null,
          volume: row.volume ? parseInt(row.volume) : null
        }))
      };
    } catch (error) {
      console.error(`Error in getHistoricalPrices for ${ticker}:`, error);
      return { success: false, error: error.message, data: [] };
    }
  },

  // Store historical prices in the database
  async storeHistoricalPrices(ticker, prices) {
    try {
      if (!prices || prices.length === 0) {
        return { success: false, error: 'No prices to store' };
      }

      // Prepare data for upsert
      const records = prices.map(({ date, price, open, high, low, volume }) => ({
        ticker: ticker.toUpperCase(),
        date: date,
        price: price,
        open: open || null,
        high: high || null,
        low: low || null,
        volume: volume || null
      }));

      // Upsert in batches to avoid overwhelming the database
      const batchSize = 100;
      const errors = [];

      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const { error } = await supabase
          .from('historical_stock_prices')
          .upsert(batch, { onConflict: 'ticker,date' });

        if (error) {
          console.error(`Error storing batch ${i / batchSize + 1} for ${ticker}:`, error);
          errors.push(error);
        }
      }

      if (errors.length > 0) {
        return { success: false, error: errors[0].message };
      }

      return { success: true };
    } catch (error) {
      console.error(`Error storing historical prices for ${ticker}:`, error);
      return { success: false, error: error.message };
    }
  },

  // Check what date range we have in the database for a ticker
  async getDateRange(ticker) {
    try {
      const { data, error } = await supabase
        .from('historical_stock_prices')
        .select('date')
        .eq('ticker', ticker.toUpperCase())
        .order('date', { ascending: true })
        .limit(1);

      if (error || !data || data.length === 0) {
        return { success: false, earliestDate: null, latestDate: null };
      }

      const earliestDate = data[0].date;

      // Get latest date
      const { data: latestData, error: latestError } = await supabase
        .from('historical_stock_prices')
        .select('date')
        .eq('ticker', ticker.toUpperCase())
        .order('date', { ascending: false })
        .limit(1);

      const latestDate = latestData && latestData.length > 0 ? latestData[0].date : null;

      return { success: true, earliestDate, latestDate };
    } catch (error) {
      console.error(`Error getting date range for ${ticker}:`, error);
      return { success: false, earliestDate: null, latestDate: null };
    }
  }
};

// Stock Quotes Cache Services - Cache for current stock prices to reduce API calls
export const stockQuoteCacheServices = {
  // Cache TTL in minutes - how long cached quotes are considered fresh
  // During market hours: 15 minutes, After hours: 60 minutes
  getCacheTTL() {
    const now = new Date();

    // Use Intl.DateTimeFormat to reliably get NY timezone components
    const nyFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      weekday: 'short',
      hour: 'numeric',
      hour12: false
    });

    const parts = nyFormatter.formatToParts(now);
    const weekdayPart = parts.find(p => p.type === 'weekday');
    const hourPart = parts.find(p => p.type === 'hour');

    const weekday = weekdayPart ? weekdayPart.value : '';
    const nyHour = hourPart ? parseInt(hourPart.value, 10) : 12;

    // Weekend check using weekday name (locale-independent)
    if (weekday === 'Sat' || weekday === 'Sun') {
      return 120; // 2 hours on weekends
    }

    // Market hours: 9:30 AM - 4:00 PM ET (using 9-16 as approximation)
    if (nyHour >= 9 && nyHour < 16) {
      return 15; // 15 minutes during market hours
    }

    // After hours
    return 60; // 1 hour after market hours
  },

  // Get cached quote for a single ticker
  async getCachedQuote(ticker) {
    try {
      const { data, error } = await supabase
        .from('stock_quotes_cache')
        .select('*')
        .eq('ticker', ticker.toUpperCase())
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - cache miss
          return null;
        }
        console.error(`Error fetching cached quote for ${ticker}:`, error);
        return null;
      }

      // Check if cache is still fresh
      if (data && data.fetched_at) {
        const fetchedAt = new Date(data.fetched_at);
        const now = new Date();
        const ageMinutes = (now - fetchedAt) / (1000 * 60);
        const ttl = this.getCacheTTL();

        if (ageMinutes <= ttl) {
          // Cache is fresh
          return {
            ticker: data.ticker,
            price: parseFloat(data.price),
            change: data.change !== null && data.change !== undefined ? parseFloat(data.change) : null,
            changePercent: data.change_percent !== null && data.change_percent !== undefined ? parseFloat(data.change_percent) : null,
            volume: data.volume,
            previousClose: data.previous_close ? parseFloat(data.previous_close) : null,
            open: data.open_price ? parseFloat(data.open_price) : null,
            high: data.high_price ? parseFloat(data.high_price) : null,
            low: data.low_price ? parseFloat(data.low_price) : null,
            lastTradingDay: data.last_trading_day,
            fetchedAt: data.fetched_at,
            fromCache: true
          };
        }
      }

      // Cache is stale
      return null;
    } catch (error) {
      console.error(`Error in getCachedQuote for ${ticker}:`, error);
      return null;
    }
  },

  // Get cached quotes for multiple tickers at once
  async getCachedQuotes(tickers) {
    try {
      if (!tickers || tickers.length === 0) {
        return {};
      }

      const upperTickers = tickers.map(t => t.toUpperCase());

      const { data, error } = await supabase
        .from('stock_quotes_cache')
        .select('*')
        .in('ticker', upperTickers);

      if (error) {
        console.error('Error fetching cached quotes:', error);
        return {};
      }

      const ttl = this.getCacheTTL();
      const now = new Date();
      const result = {};

      (data || []).forEach(row => {
        const fetchedAt = new Date(row.fetched_at);
        const ageMinutes = (now - fetchedAt) / (1000 * 60);

        if (ageMinutes <= ttl) {
          result[row.ticker] = {
            ticker: row.ticker,
            price: parseFloat(row.price),
            change: row.change !== null && row.change !== undefined ? parseFloat(row.change) : null,
            changePercent: row.change_percent !== null && row.change_percent !== undefined ? parseFloat(row.change_percent) : null,
            volume: row.volume,
            previousClose: row.previous_close ? parseFloat(row.previous_close) : null,
            open: row.open_price ? parseFloat(row.open_price) : null,
            high: row.high_price ? parseFloat(row.high_price) : null,
            low: row.low_price ? parseFloat(row.low_price) : null,
            lastTradingDay: row.last_trading_day,
            fetchedAt: row.fetched_at,
            fromCache: true
          };
        }
      });

      return result;
    } catch (error) {
      console.error('Error in getCachedQuotes:', error);
      return {};
    }
  },

  // Helper to convert value to null only if truly missing (not zero)
  _toNullable(value) {
    if (value === undefined || value === null || (typeof value === 'number' && !Number.isFinite(value))) {
      return null;
    }
    return value;
  },

  // Store a quote in the cache
  async cacheQuote(quoteData) {
    try {
      if (!quoteData || !quoteData.ticker || !Number.isFinite(quoteData.price)) {
        return { success: false, error: 'Invalid quote data: missing ticker or invalid price' };
      }

      const record = {
        ticker: quoteData.ticker.toUpperCase(),
        price: quoteData.price,
        change: this._toNullable(quoteData.change),
        change_percent: this._toNullable(quoteData.changePercent),
        volume: this._toNullable(quoteData.volume),
        previous_close: this._toNullable(quoteData.previousClose),
        open_price: this._toNullable(quoteData.open),
        high_price: this._toNullable(quoteData.high),
        low_price: this._toNullable(quoteData.low),
        last_trading_day: quoteData.lastTradingDay || null,
        fetched_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('stock_quotes_cache')
        .upsert(record, { onConflict: 'ticker' });

      if (error) {
        console.error(`Error caching quote for ${quoteData.ticker}:`, error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in cacheQuote:', error);
      return { success: false, error: error.message };
    }
  },

  // Store multiple quotes in the cache
  async cacheQuotes(quotes) {
    try {
      if (!quotes || quotes.length === 0) {
        return { success: true };
      }

      // Filter out quotes with invalid prices to prevent batch insert failure
      const validQuotes = quotes.filter(q => q && q.ticker && Number.isFinite(q.price));

      if (validQuotes.length === 0) {
        console.warn('No valid quotes to cache after filtering');
        return { success: true };
      }

      if (validQuotes.length < quotes.length) {
        console.warn(`Filtered out ${quotes.length - validQuotes.length} invalid quotes before caching`);
      }

      const records = validQuotes.map(q => ({
        ticker: q.ticker.toUpperCase(),
        price: q.price,
        change: this._toNullable(q.change),
        change_percent: this._toNullable(q.changePercent),
        volume: this._toNullable(q.volume),
        previous_close: this._toNullable(q.previousClose),
        open_price: this._toNullable(q.open),
        high_price: this._toNullable(q.high),
        low_price: this._toNullable(q.low),
        last_trading_day: q.lastTradingDay || null,
        fetched_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('stock_quotes_cache')
        .upsert(records, { onConflict: 'ticker' });

      if (error) {
        console.error('Error caching quotes:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in cacheQuotes:', error);
      return { success: false, error: error.message };
    }
  },

  // Clear stale cache entries (older than 24 hours)
  async clearStaleCache() {
    try {
      const staleDate = new Date();
      staleDate.setHours(staleDate.getHours() - 24);

      const { error } = await supabase
        .from('stock_quotes_cache')
        .delete()
        .lt('fetched_at', staleDate.toISOString());

      if (error) {
        console.error('Error clearing stale cache:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in clearStaleCache:', error);
      return { success: false, error: error.message };
    }
  }
};

// Historical Portfolio Values Services
export const historicalPortfolioValueServices = {
  // Calculate and store historical portfolio values for a portfolio
  // This processes all transactions and calculates daily portfolio values
  async calculateAndStoreHistoricalValues(portfolioId) {
    try {
      console.log(`📊 Starting historical portfolio value calculation for portfolio ${portfolioId}`);
      
      // Get portfolio info
      const { data: portfolio, error: portfolioError } = await supabase
        .from('portfolios')
        .select('*')
        .eq('id', portfolioId)
        .single();
      
      if (portfolioError || !portfolio) {
        console.error('Error fetching portfolio:', portfolioError);
        return { success: false, error: 'Portfolio not found' };
      }

      // Get all transactions for this portfolio
      const { data: transactions, error: transactionsError } = await supabase
        .from('portfolio_transactions')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .order('transaction_date', { ascending: true });
      
      if (transactionsError) {
        console.error('Error fetching transactions:', transactionsError);
        return { success: false, error: transactionsError.message };
      }

      if (!transactions || transactions.length === 0) {
        console.log('No transactions found for portfolio');
        return { success: true, message: 'No transactions to process' };
      }

      // Get unique tickers from transactions
      const tickers = [...new Set(transactions.map(tx => tx.ticker.toUpperCase()))];
      console.log(`Found ${tickers.length} unique tickers:`, tickers);

      // Get date range
      const firstTransactionDate = new Date(transactions[0].transaction_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Calculate date range we need for historical prices
      const startDate = new Date(firstTransactionDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(today);
      
      // Fetch historical prices for all tickers
      const historicalPrices = {};
      for (const ticker of tickers) {
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];
        
        const result = await historicalPriceServices.getHistoricalPrices(ticker, startDateStr, endDateStr);
        if (result.success && result.data && result.data.length > 0) {
          // Create a map: date -> price
          const priceMap = {};
          result.data.forEach(({ date, price }) => {
            priceMap[date] = price;
          });
          historicalPrices[ticker] = priceMap;
          console.log(`✓ Loaded ${result.data.length} historical prices for ${ticker}`);
        } else {
          console.warn(`⚠ No historical prices found for ${ticker}`);
          historicalPrices[ticker] = {};
        }
      }

      // Helper function to get price for a date (handles weekends/holidays)
      const getPriceForDate = (ticker, dateStr) => {
        const prices = historicalPrices[ticker];
        if (!prices || Object.keys(prices).length === 0) {
          return null;
        }
        
        // Try exact match first
        if (prices[dateStr]) {
          return prices[dateStr];
        }
        
        // Find most recent trading day before or on this date
        const dates = Object.keys(prices).sort().reverse();
        for (const date of dates) {
          if (date <= dateStr) {
            return prices[date];
          }
        }
        
        return null;
      };

      // Process transactions and calculate daily values
      const CASH_INTEREST_RATE = 0.042; // 4.2% annual
      const dailyInterestRate = CASH_INTEREST_RATE / 365;
      
      // Cash balance includes accumulated interest (compounding)
      let cashBalance = parseFloat(portfolio.starting_cash || 50000000);
      const positionHistory = {}; // { ticker: { shares, totalCost } }
      let transactionIndex = 0;
      let totalInterestEarned = 0; // Track cumulative interest for display
      const portfolioStartDate = new Date(portfolio.created_at || firstTransactionDate);
      portfolioStartDate.setHours(0, 0, 0, 0);
      
      const valuesToStore = [];
      let currentDate = new Date(startDate);
      const todayStr = today.toISOString().split('T')[0];
      
      console.log(`Calculating values from ${startDate.toISOString().split('T')[0]} to ${todayStr}`);
      console.log(`Starting cash: $${cashBalance.toLocaleString()}, Daily interest rate: ${(dailyInterestRate * 100).toFixed(6)}%`);
      
      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const isToday = dateStr === todayStr;
        
        // Calculate daily interest on current cash balance (compounding)
        // Interest = (1/365) * interest_rate * cash_balance
        const dailyInterest = cashBalance * dailyInterestRate;
        cashBalance += dailyInterest; // Add interest to cash balance (compounding)
        totalInterestEarned += dailyInterest; // Track cumulative interest
        
        // Process transactions that occurred on this date
        while (transactionIndex < transactions.length) {
          const tx = transactions[transactionIndex];
          const txDate = new Date(tx.transaction_date);
          txDate.setHours(0, 0, 0, 0);
          const txDateStr = txDate.toISOString().split('T')[0];
          
          if (txDateStr > dateStr) {
            break; // Transaction is in the future
          }
          
          if (txDateStr === dateStr) {
            // Process transaction on this date (after interest calculation)
            if (tx.transaction_type === 'buy') {
              cashBalance -= parseFloat(tx.total_amount);
              if (!positionHistory[tx.ticker]) {
                positionHistory[tx.ticker] = { shares: 0, totalCost: 0 };
              }
              positionHistory[tx.ticker].shares += parseFloat(tx.shares);
              positionHistory[tx.ticker].totalCost += parseFloat(tx.total_amount);
            } else if (tx.transaction_type === 'sell') {
              cashBalance += parseFloat(tx.total_amount);
              if (positionHistory[tx.ticker]) {
                const avgCost = positionHistory[tx.ticker].totalCost / positionHistory[tx.ticker].shares;
                positionHistory[tx.ticker].shares -= parseFloat(tx.shares);
                positionHistory[tx.ticker].totalCost = positionHistory[tx.ticker].shares * avgCost;
                if (positionHistory[tx.ticker].shares <= 0) {
                  delete positionHistory[tx.ticker];
                }
              }
            }
          }
          
          transactionIndex++;
        }
        
        // Calculate positions value for this date
        let positionsValue = 0;
        Object.entries(positionHistory).forEach(([ticker, pos]) => {
          if (pos.shares > 0) {
            const price = getPriceForDate(ticker, dateStr);
            if (price !== null && price > 0) {
              positionsValue += pos.shares * price;
            } else {
              // Fallback to average cost if no historical price
              const avgCost = pos.totalCost / pos.shares;
              positionsValue += pos.shares * avgCost;
            }
          }
        });
        
        // For today, use portfolio.current_cash if available (but it should already include interest)
        let cashForDate = cashBalance;
        if (isToday && portfolio.current_cash !== null && portfolio.current_cash !== undefined && !Number.isNaN(portfolio.current_cash)) {
          // If current_cash is provided, use it but we still need to track interest
          // The current_cash might not include today's interest yet, so we'll use our calculated value
          // Or we can use current_cash if it's more accurate
          cashForDate = parseFloat(portfolio.current_cash);
        }
        
        // Total value = cash (which includes accumulated interest) + positions value
        const totalValue = cashForDate + positionsValue;
        
        valuesToStore.push({
          portfolio_id: portfolioId,
          date: dateStr,
          cash: cashForDate, // Cash balance includes accumulated interest
          positions_value: positionsValue,
          total_value: totalValue,
          interest_earned: totalInterestEarned // Cumulative interest earned
        });
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      console.log(`📊 Calculated ${valuesToStore.length} daily portfolio values`);
      
      // First, verify the table exists by trying a simple query
      console.log('Testing table access for historical_portfolio_values...');
      const { data: testData, error: testError } = await supabase
        .from('historical_portfolio_values')
        .select('id')
        .limit(1);
      
      if (testError) {
        console.error('Table access test failed:', testError);
        console.error('Error code:', testError.code);
        console.error('Error status:', testError.status);
        console.error('Error message:', testError.message);
        console.error('Full error object:', JSON.stringify(testError, null, 2));
        
        const errorMessage = testError.message || JSON.stringify(testError);
        if (testError.code === 'PGRST116' || 
            testError.code === '42P01' || 
            testError.status === 404 ||
            errorMessage.includes('404') || 
            errorMessage.includes('relation') || 
            errorMessage.includes('does not exist') ||
            errorMessage.includes('Could not find')) {
          return { 
            success: false, 
            error: `Table "historical_portfolio_values" does not exist or is not accessible (Error: ${testError.code || testError.status || 'unknown'}). Please verify: 1) The SQL migration was run successfully in Supabase SQL Editor, 2) RLS policies are set correctly, 3) You are authenticated. Check the browser console for more details.` 
          };
        }
        return { 
          success: false, 
          error: `Cannot access table: ${testError.message || JSON.stringify(testError)} (Code: ${testError.code}, Status: ${testError.status})` 
        };
      }
      
      console.log('✓ Table access test passed');
      
      // Store in database in batches
      const batchSize = 100;
      const errors = [];
      
      for (let i = 0; i < valuesToStore.length; i += batchSize) {
        const batch = valuesToStore.slice(i, i + batchSize);
        const { error } = await supabase
          .from('historical_portfolio_values')
          .upsert(batch, { 
            onConflict: 'portfolio_id,date',
            ignoreDuplicates: false 
          });
        
        if (error) {
          console.error(`Error storing batch ${Math.floor(i / batchSize) + 1}:`, error);
          console.error('Error details:', JSON.stringify(error, null, 2));
          console.error('Error code:', error.code);
          console.error('Error status:', error.status);
          
          // Check if it's a 404 or table doesn't exist error
          const errorMessage = error.message || JSON.stringify(error);
          if (error.code === 'PGRST116' || 
              error.code === '42P01' || 
              error.status === 404 ||
              errorMessage.includes('404') || 
              errorMessage.includes('relation') || 
              errorMessage.includes('does not exist') ||
              errorMessage.includes('Could not find')) {
            return { 
              success: false, 
              error: 'Table "historical_portfolio_values" does not exist or is not accessible. Please verify the SQL migration was run successfully.' 
            };
          }
          
          errors.push(error);
        }
      }
      
      if (errors.length > 0) {
        return { success: false, error: errors[0].message };
      }
      
      console.log(`✅ Successfully stored ${valuesToStore.length} historical portfolio values`);
      return { success: true, recordsStored: valuesToStore.length };
      
    } catch (error) {
      console.error('Error calculating historical portfolio values:', error);
      return { success: false, error: error.message };
    }
  },

  // Get historical portfolio values for a date range
  async getHistoricalValues(portfolioId, startDate = null, endDate = null) {
    try {
      let query = supabase
        .from('historical_portfolio_values')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .order('date', { ascending: true });

      if (startDate) {
        query = query.gte('date', startDate);
      }
      if (endDate) {
        query = query.lte('date', endDate);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching historical portfolio values:', error);
        return { success: false, error: error.message, data: [] };
      }

      return {
        success: true,
        data: (data || []).map(row => ({
          date: row.date,
          cash: parseFloat(row.cash),
          positionsValue: parseFloat(row.positions_value),
          totalValue: parseFloat(row.total_value),
          interestEarned: parseFloat(row.interest_earned)
        }))
      };
    } catch (error) {
      console.error('Error in getHistoricalValues:', error);
      return { success: false, error: error.message, data: [] };
    }
  }
};