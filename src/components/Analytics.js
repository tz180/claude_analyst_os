import React from 'react';
import { TrendingUp, Activity, Target, CheckCircle, AlertTriangle, BarChart3 } from 'lucide-react';

// Pipeline Velocity Component
export const PipelineVelocityCard = ({ pipelineVelocity }) => {
  if (!pipelineVelocity || !pipelineVelocity.velocityByStatus) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <TrendingUp className="mr-2" size={20} />
          Pipeline Velocity
        </h3>
        <div className="text-center py-8 text-gray-500">
          <p>No pipeline data available</p>
        </div>
      </div>
    );
  }

  const { velocityByStatus, totalItems, conversionRate, pipelineHealth } = pipelineVelocity;

  const getHealthColor = (health) => {
    switch (health) {
      case 'Good': return 'text-green-600 bg-green-100';
      case 'Fair': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-red-600 bg-red-100';
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold flex items-center">
          <TrendingUp className="mr-2" size={20} />
          Pipeline Velocity
        </h3>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getHealthColor(pipelineHealth)}`}>
          {pipelineHealth}
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{totalItems}</div>
          <div className="text-sm text-gray-600">Total Ideas</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{conversionRate}%</div>
          <div className="text-sm text-gray-600">Conversion Rate</div>
        </div>
      </div>

      <div className="space-y-3">
        {Object.entries(velocityByStatus).map(([status, data]) => (
          <div key={status} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <div>
              <div className="font-medium text-gray-900">{status}</div>
              <div className="text-sm text-gray-600">{data.count} items</div>
            </div>
            <div className="text-right">
              <div className="font-medium text-gray-900">{data.avgDays} days</div>
              <div className="text-sm text-gray-600">avg. time</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Coverage Activity Component
export const CoverageActivityCard = ({ coverageActivity }) => {
  if (!coverageActivity || !coverageActivity.totalCompanies) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Activity className="mr-2" size={20} />
          Coverage Activity
        </h3>
        <div className="text-center py-8 text-gray-500">
          <p>No coverage data available</p>
        </div>
      </div>
    );
  }

  const { 
    totalCompanies, 
    recentlyActive, 
    needsAttention, 
    avgDaysSinceModel, 
    avgDaysSinceMemo,
    companiesByActivity 
  } = coverageActivity;

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <Activity className="mr-2" size={20} />
        Coverage Activity
      </h3>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{totalCompanies}</div>
          <div className="text-sm text-gray-600">Total Companies</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{recentlyActive}</div>
          <div className="text-sm text-gray-600">Recently Active</div>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Avg. Days Since Model:</span>
          <span className="font-medium">{avgDaysSinceModel} days</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Avg. Days Since Memo:</span>
          <span className="font-medium">{avgDaysSinceMemo} days</span>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="font-medium text-gray-900 mb-3">Activity Breakdown</h4>
        {Object.entries(companiesByActivity).map(([activity, count]) => (
          <div key={activity} className="flex justify-between items-center">
            <span className="text-sm text-gray-600">{activity}</span>
            <div className="flex items-center space-x-2">
              <div className="w-16 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full" 
                  style={{ width: `${totalCompanies > 0 ? (count / totalCompanies) * 100 : 0}%` }}
                ></div>
              </div>
              <span className="text-sm font-medium w-8 text-right">{count}</span>
            </div>
          </div>
        ))}
      </div>

      {needsAttention > 0 && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center">
            <AlertTriangle className="text-yellow-600 mr-2" size={16} />
            <span className="text-sm text-yellow-800">
              {needsAttention} companies need attention (90+ days inactive)
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// Productivity Metrics Component
export const ProductivityMetricsCard = ({ productivityMetrics }) => {
  if (!productivityMetrics || !productivityMetrics.totalDeliverables) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Target className="mr-2" size={20} />
          Productivity Metrics
        </h3>
        <div className="text-center py-8 text-gray-500">
          <p>No deliverables data available</p>
        </div>
      </div>
    );
  }

  const { 
    totalDeliverables, 
    completed, 
    inProgress, 
    stalled, 
    completionRate, 
    avgDaysToComplete,
    byType,
    byPriority,
    recentActivity 
  } = productivityMetrics;

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <Target className="mr-2" size={20} />
        Productivity Metrics
      </h3>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{totalDeliverables}</div>
          <div className="text-sm text-gray-600">Total Deliverables</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{completionRate}%</div>
          <div className="text-sm text-gray-600">Completion Rate</div>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Completed:</span>
          <span className="font-medium text-green-600">{completed}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">In Progress:</span>
          <span className="font-medium text-blue-600">{inProgress}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Stalled:</span>
          <span className="font-medium text-yellow-600">{stalled}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Avg. Days to Complete:</span>
          <span className="font-medium">{avgDaysToComplete} days</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="font-medium text-gray-900 mb-2">By Type</h4>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>Memos:</span>
              <span className="font-medium">{byType.memo}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Models:</span>
              <span className="font-medium">{byType.model}</span>
            </div>
          </div>
        </div>
        <div>
          <h4 className="font-medium text-gray-900 mb-2">By Priority</h4>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>High:</span>
              <span className="font-medium text-red-600">{byPriority.High}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Medium:</span>
              <span className="font-medium text-yellow-600">{byPriority.Medium}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Low:</span>
              <span className="font-medium text-green-600">{byPriority.Low}</span>
            </div>
          </div>
        </div>
      </div>

      {recentActivity > 0 && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <CheckCircle className="text-green-600 mr-2" size={16} />
            <span className="text-sm text-green-800">
              {recentActivity} new deliverables in the last 7 days
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// Quick Stats Component
export const QuickStatsCard = ({ analytics }) => {
  if (!analytics) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <BarChart3 className="mr-2" size={20} />
          Quick Stats
        </h3>
        <div className="text-center py-8 text-gray-500">
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  const { pipelineVelocity, coverageActivity, productivityMetrics } = analytics;

  const stats = [
    {
      label: 'Pipeline Ideas',
      value: pipelineVelocity?.totalItems || 0,
      icon: TrendingUp,
      color: 'text-blue-600'
    },
    {
      label: 'Active Coverage',
      value: coverageActivity?.totalCompanies || 0,
      icon: Activity,
      color: 'text-green-600'
    },
    {
      label: 'Deliverables',
      value: productivityMetrics?.totalDeliverables || 0,
      icon: Target,
      color: 'text-purple-600'
    },
    {
      label: 'Completion Rate',
      value: `${productivityMetrics?.completionRate || 0}%`,
      icon: CheckCircle,
      color: 'text-orange-600'
    }
  ];

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <BarChart3 className="mr-2" size={20} />
        Quick Stats
      </h3>
      
      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
            <stat.icon className={`mx-auto mb-2 ${stat.color}`} size={24} />
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-sm text-gray-600">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}; 