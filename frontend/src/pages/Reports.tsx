import React, { useState, useEffect } from 'react';
import { FaDownload, FaCalendarAlt, FaChartBar, FaFileExport, FaFilter, FaUser } from 'react-icons/fa';
import { DailyReport, HaloExportEntry, Client, Category, User } from '@/types';
import { reportsApi, clientsApi, categoriesApi, usersApi } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

const Reports: React.FC = () => {
  const { user } = useAuth();
  const [dailyReport, setDailyReport] = useState<DailyReport | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [haloExport, setHaloExport] = useState<HaloExportEntry[]>([]);
  const [rangeReport, setRangeReport] = useState<any>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [filters, setFilters] = useState({
    clientId: '',
    categoryId: '',
    userId: ''
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'daily' | 'range' | 'export'>('daily');

  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    loadDailyReport();
    loadFilterOptions();
  }, [selectedDate]);

  const loadFilterOptions = async () => {
    try {
      const promises = [
        clientsApi.getAll(),
        categoriesApi.getAll()
      ];
      
      // Only load users if admin
      if (isAdmin) {
        promises.push(usersApi.getAll());
      }
      
      const responses = await Promise.all(promises);
      setClients(responses[0].data.clients);
      setCategories(responses[1].data.categories);
      
      if (isAdmin && responses[2]) {
        setUsers(responses[2].data);
      }
    } catch (error) {
      console.error('Failed to load filter options:', error);
    }
  };

  const loadDailyReport = async () => {
    try {
      setLoading(true);
      const userId = filters.userId ? parseInt(filters.userId) : undefined;
      const response = await reportsApi.getDaily(selectedDate, userId);
      setDailyReport(response.data.summary);
    } catch (error) {
      console.error('Failed to load daily report:', error);
      toast.error('Failed to load daily report');
    } finally {
      setLoading(false);
    }
  };

  const generateRangeReport = async () => {
    try {
      setLoading(true);
      const clientId = filters.clientId ? parseInt(filters.clientId) : undefined;
      const categoryId = filters.categoryId ? parseInt(filters.categoryId) : undefined;
      const userId = filters.userId ? parseInt(filters.userId) : undefined;
      
      const response = await reportsApi.getRange(dateRange.start, dateRange.end, clientId, categoryId, userId);
      setRangeReport(response.data);
      toast.success('Range report generated successfully');
    } catch (error) {
      console.error('Failed to generate range report:', error);
      toast.error('Failed to generate range report');
    } finally {
      setLoading(false);
    }
  };

  const generateHaloExport = async () => {
    try {
      setLoading(true);
      const userId = filters.userId ? parseInt(filters.userId) : undefined;
      const response = await reportsApi.getHaloExport(dateRange.start, dateRange.end, userId);
      setHaloExport(response.data.export);
      toast.success('Halo export generated successfully');
    } catch (error) {
      console.error('Failed to generate Halo export:', error);
      toast.error('Failed to generate Halo export');
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    if (haloExport.length === 0) {
      toast.error('No data to export');
      return;
    }

    const csvContent = [
      // Header
      'Ticket ID,Task Title,Client,Category,Date,Start Time,End Time,Duration (Hours),Description',
      // Data
      ...haloExport.map(entry => [
        entry.ticket_id,
        `"${entry.task_title}"`,
        entry.client,
        entry.category,
        entry.date,
        entry.start_time,
        entry.end_time,
        entry.duration_hours,
        `"${entry.description}"`,
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `halo-export-${dateRange.start}-to-${dateRange.end}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="page-title">Reports</h1>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('daily')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'daily'
                ? 'border-blue-500 text-white'
                : 'border-transparent text-gray-400 hover:text-white hover:border-gray-300'
            }`}
          >
            Daily Report
          </button>
          <button
            onClick={() => setActiveTab('range')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'range'
                ? 'border-blue-500 text-white'
                : 'border-transparent text-gray-400 hover:text-white hover:border-gray-300'
            }`}
          >
            Date Range Report
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'export'
                ? 'border-blue-500 text-white'
                : 'border-transparent text-gray-400 hover:text-white hover:border-gray-300'
            }`}
          >
            Halo Export
          </button>
        </nav>
      </div>

      {/* Daily Report Tab */}
      {activeTab === 'daily' && (
        <div className="card">
        <div className="card-header">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FaChartBar className="text-white" />
              Daily Report
            </h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <FaCalendarAlt className="text-white" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="form-input"
                />
              </div>
              {isAdmin && (
                <div className="flex items-center gap-2">
                  <FaUser className="text-white" />
                  <select
                    value={filters.userId}
                    onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                    className="form-select"
                  >
                    <option value="">All Engineers</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={loadDailyReport}
                    className="btn btn-sm btn-primary flex items-center gap-1"
                  >
                    <FaFilter />
                    Apply
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="card-body">
          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-20 bg-gray-200 rounded"></div>
              <div className="h-40 bg-gray-200 rounded"></div>
            </div>
          ) : dailyReport ? (
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {dailyReport.totalHours}h
                  </div>
                  <div className="text-sm text-blue-700">Total Hours</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {dailyReport.entriesCount}
                  </div>
                  <div className="text-sm text-green-700">Time Entries</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {Object.keys(dailyReport.byTask).length}
                  </div>
                  <div className="text-sm text-purple-700">Tasks Worked</div>
                </div>
              </div>

              {/* By Category */}
              <div>
                <h4 className="font-medium text-white mb-3">Time by Category</h4>
                <div className="space-y-2">
                  {Object.entries(dailyReport.byCategory).map(([category, data]) => (
                    <div key={category} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span className="font-medium text-black">{category}</span>
                      <div className="text-right">
                        <div className="font-medium text-black">{data.hours}h</div>
                        <div className="text-sm text-gray-600">{data.count} entries</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* By Client */}
              <div>
                <h4 className="font-medium text-white mb-3">Time by Client</h4>
                <div className="space-y-2">
                  {Object.entries(dailyReport.byClient).map(([client, data]) => (
                    <div key={client} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span className="font-medium text-black">{client}</span>
                      <div className="text-right">
                        <div className="font-medium text-black">{data.hours}h</div>
                        <div className="text-sm text-gray-600">{data.count} entries</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* By Task */}
              <div>
                <h4 className="font-medium text-white mb-3">Time by Task</h4>
                <div className="space-y-2">
                  {Object.entries(dailyReport.byTask).map(([task, data]) => (
                    <div key={task} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <div>
                        <div className="font-medium text-black">{task}</div>
                        {data.haloTicketId && (
                          <div className="text-sm text-blue-600">Halo: {data.haloTicketId}</div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-black">{data.hours}h</div>
                        <div className="text-sm text-gray-600">{data.count} entries</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-white">
              <p>No data available for this date</p>
            </div>
          )}
        </div>
        </div>
      )}

      {/* Date Range Report Tab */}
      {activeTab === 'range' && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FaChartBar className="text-white" />
              Date Range Report
            </h3>
          </div>
          <div className="card-body">
            {/* Date Range and Filter Controls */}
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="form-label">Start Date</label>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">End Date</label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    className="form-input"
                  />
                </div>
                {isAdmin && (
                  <div>
                    <label className="form-label">Engineer Filter</label>
                    <select
                      value={filters.userId}
                      onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                      className="form-select"
                    >
                      <option value="">All Engineers</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="form-label">Client Filter</label>
                  <select
                    value={filters.clientId}
                    onChange={(e) => setFilters({ ...filters, clientId: e.target.value })}
                    className="form-select"
                  >
                    <option value="">All Clients</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Category Filter</label>
                  <select
                    value={filters.categoryId}
                    onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })}
                    className="form-select"
                  >
                    <option value="">All Categories</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <button
                onClick={generateRangeReport}
                disabled={loading || !dateRange.start || !dateRange.end}
                className="btn btn-primary flex items-center gap-2"
              >
                <FaFilter />
                Generate Range Report
              </button>
            </div>

            {/* Range Report Results */}
            {loading && (
              <div className="animate-pulse space-y-4">
                <div className="h-20 bg-gray-200 rounded"></div>
                <div className="h-40 bg-gray-200 rounded"></div>
              </div>
            )}

            {rangeReport && !loading && (
              <div className="space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {rangeReport.summary?.totalHours || 0}h
                    </div>
                    <div className="text-sm text-blue-700">Total Hours</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {rangeReport.summary?.entriesCount || 0}
                    </div>
                    <div className="text-sm text-green-700">Time Entries</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {rangeReport.summary?.tasksCount || 0}
                    </div>
                    <div className="text-sm text-purple-700">Tasks Worked</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {rangeReport.summary?.daysWorked || 0}
                    </div>
                    <div className="text-sm text-orange-700">Days Worked</div>
                  </div>
                </div>

                {/* Daily Breakdown */}
                {rangeReport.dailyBreakdown && Object.keys(rangeReport.dailyBreakdown).length > 0 && (
                  <div>
                    <h4 className="font-medium text-white mb-3">Daily Breakdown</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full border border-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Date</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Hours</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Entries</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Tasks</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {Object.entries(rangeReport.dailyBreakdown).map(([date, data]: [string, any]) => (
                            <tr key={date}>
                              <td className="px-4 py-2 text-sm text-gray-900 font-medium">
                                {new Date(date).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-900">
                                {data.hours}h
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-900">
                                {data.entries}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-900">
                                {data.tasks}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* By Client */}
                {rangeReport.byClient && Object.keys(rangeReport.byClient).length > 0 && (
                  <div>
                    <h4 className="font-medium text-white mb-3">Time by Client</h4>
                    <div className="space-y-2">
                      {Object.entries(rangeReport.byClient).map(([client, data]: [string, any]) => (
                        <div key={client} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                          <span className="font-medium text-black">{client}</span>
                          <div className="text-right">
                            <div className="font-medium text-black">{data.hours}h</div>
                            <div className="text-sm text-gray-600">{data.entries} entries</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* By Category */}
                {rangeReport.byCategory && Object.keys(rangeReport.byCategory).length > 0 && (
                  <div>
                    <h4 className="font-medium text-white mb-3">Time by Category</h4>
                    <div className="space-y-2">
                      {Object.entries(rangeReport.byCategory).map(([category, data]: [string, any]) => (
                        <div key={category} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                          <span className="font-medium text-black">{category}</span>
                          <div className="text-right">
                            <div className="font-medium text-black">{data.hours}h</div>
                            <div className="text-sm text-gray-600">{data.entries} entries</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Halo Export Tab */}
      {activeTab === 'export' && (
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FaFileExport className="text-white" />
            Halo Export
          </h3>
        </div>
        <div className="card-body">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="form-label">Start Date</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label">End Date</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="form-input"
                />
              </div>
              {isAdmin && (
                <div>
                  <label className="form-label">Engineer Filter</label>
                  <select
                    value={filters.userId}
                    onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                    className="form-select"
                  >
                    <option value="">All Engineers</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <button
                onClick={generateHaloExport}
                disabled={loading}
                className="btn btn-primary flex items-center gap-2"
              >
                <FaChartBar />
                Generate Export
              </button>
              {haloExport.length > 0 && (
                <button
                  onClick={downloadCSV}
                  className="btn btn-success flex items-center gap-2"
                >
                  <FaDownload />
                  Download CSV
                </button>
              )}
            </div>

            {haloExport.length > 0 && (
              <div className="mt-6">
                <h4 className="font-medium text-white mb-3">
                  Export Preview ({haloExport.length} entries)
                </h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">
                          Ticket ID
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">
                          Task
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">
                          Client
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">
                          Date
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">
                          Duration
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {haloExport.slice(0, 10).map((entry, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {entry.ticket_id || 'N/A'}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {entry.task_title}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {entry.client}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {entry.date}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {entry.duration_hours}h
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {haloExport.length > 10 && (
                    <div className="px-4 py-2 text-sm text-gray-600 text-center">
                      ... and {haloExport.length - 10} more entries
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
};

export default Reports;