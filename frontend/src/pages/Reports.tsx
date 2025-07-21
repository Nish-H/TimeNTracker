import React, { useState, useEffect } from 'react';
import { FaDownload, FaCalendarAlt, FaChartBar, FaFileExport } from 'react-icons/fa';
import { DailyReport, HaloExportEntry } from '@/types';
import { reportsApi } from '@/services/api';
import toast from 'react-hot-toast';

const Reports: React.FC = () => {
  const [dailyReport, setDailyReport] = useState<DailyReport | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [haloExport, setHaloExport] = useState<HaloExportEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDailyReport();
  }, [selectedDate]);

  const loadDailyReport = async () => {
    try {
      setLoading(true);
      const response = await reportsApi.getDaily(selectedDate);
      setDailyReport(response.data.summary);
    } catch (error) {
      console.error('Failed to load daily report:', error);
      toast.error('Failed to load daily report');
    } finally {
      setLoading(false);
    }
  };

  const generateHaloExport = async () => {
    try {
      setLoading(true);
      const response = await reportsApi.getHaloExport(dateRange.start, dateRange.end);
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

      {/* Daily Report */}
      <div className="card">
        <div className="card-header">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FaChartBar className="text-white" />
              Daily Report
            </h3>
            <div className="flex items-center gap-2">
              <FaCalendarAlt className="text-white" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="form-input"
              />
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
                      <span className="font-medium">{category}</span>
                      <div className="text-right">
                        <div className="font-medium">{data.hours}h</div>
                        <div className="text-sm text-white">{data.count} entries</div>
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
                      <span className="font-medium">{client}</span>
                      <div className="text-right">
                        <div className="font-medium">{data.hours}h</div>
                        <div className="text-sm text-white">{data.count} entries</div>
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
                        <div className="font-medium">{task}</div>
                        {data.haloTicketId && (
                          <div className="text-sm text-blue-600">Halo: {data.haloTicketId}</div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{data.hours}h</div>
                        <div className="text-sm text-white">{data.count} entries</div>
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

      {/* Halo Export */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FaFileExport className="text-white" />
            Halo Export
          </h3>
        </div>
        <div className="card-body">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        <th className="px-4 py-2 text-left text-xs font-medium text-white uppercase">
                          Ticket ID
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-white uppercase">
                          Task
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-white uppercase">
                          Client
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-white uppercase">
                          Date
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-white uppercase">
                          Duration
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {haloExport.slice(0, 10).map((entry, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm text-white">
                            {entry.ticket_id || 'N/A'}
                          </td>
                          <td className="px-4 py-2 text-sm text-white">
                            {entry.task_title}
                          </td>
                          <td className="px-4 py-2 text-sm text-white">
                            {entry.client}
                          </td>
                          <td className="px-4 py-2 text-sm text-white">
                            {entry.date}
                          </td>
                          <td className="px-4 py-2 text-sm text-white">
                            {entry.duration_hours}h
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {haloExport.length > 10 && (
                    <div className="px-4 py-2 text-sm text-white text-center">
                      ... and {haloExport.length - 10} more entries
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;