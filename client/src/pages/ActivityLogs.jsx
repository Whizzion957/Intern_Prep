import { useState, useEffect } from 'react';
import { logsAPI } from '../services/api';
import './ActivityLogs.css';

const ActivityLogs = () => {
    const [logs, setLogs] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filters
    const [filters, setFilters] = useState({
        action: '',
        search: '',
        startDate: '',
        endDate: '',
        isError: false,
    });

    const [pagination, setPagination] = useState({
        page: 1,
        limit: 50,
        total: 0,
        pages: 0,
    });

    const [selectedLog, setSelectedLog] = useState(null);
    const [actions, setActions] = useState([]);

    // Fetch actions for filter dropdown
    useEffect(() => {
        logsAPI.getActions()
            .then(({ data }) => setActions(data.actions || []))
            .catch(() => { });
    }, []);

    // Fetch stats
    useEffect(() => {
        logsAPI.getLogStats()
            .then(({ data }) => setStats(data))
            .catch(() => { });
    }, []);

    // Fetch logs
    useEffect(() => {
        fetchLogs();
    }, [pagination.page, filters]);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const params = {
                page: pagination.page,
                limit: pagination.limit,
                ...filters,
            };

            // Remove empty filters
            Object.keys(params).forEach(key => {
                if (!params[key]) delete params[key];
            });

            const { data } = await logsAPI.getLogs(params);
            setLogs(data.logs);
            setPagination(prev => ({
                ...prev,
                total: data.pagination.total,
                pages: data.pagination.pages,
            }));
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch logs');
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getActionColor = (action) => {
        if (action.includes('CREATE')) return 'success';
        if (action.includes('DELETE')) return 'error';
        if (action.includes('UPDATE') || action.includes('TRANSFER')) return 'warning';
        if (action.includes('LOGIN')) return 'info';
        if (action.includes('ERROR')) return 'error';
        return 'default';
    };

    const getActionIcon = (action) => {
        if (action.includes('LOGIN')) return '🔑';
        if (action.includes('LOGOUT')) return '🚪';
        if (action.includes('QUESTION')) return '❓';
        if (action.includes('COMPANY')) return '🏢';
        if (action.includes('TIP')) return '💡';
        if (action.includes('USER') || action.includes('ADMIN')) return '👤';
        if (action.includes('BACKUP')) return '💾';
        if (action.includes('ERROR')) return '❌';
        return '📝';
    };

    return (
        <div className="activity-logs-page">
            <div className="logs-header">
                <h1>Activity Logs</h1>
                <p>Monitor all activities on the platform</p>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="logs-stats">
                    <div className="stat-card">
                        <span className="stat-value">{stats.totalLogs}</span>
                        <span className="stat-label">Total Logs</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-value">{stats.todayLogs}</span>
                        <span className="stat-label">Today</span>
                    </div>
                    <div className="stat-card error">
                        <span className="stat-value">{stats.errorLogs}</span>
                        <span className="stat-label">Errors</span>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="logs-filters">
                <input
                    type="text"
                    placeholder="Search logs..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="search-input"
                />
                <select
                    value={filters.action}
                    onChange={(e) => handleFilterChange('action', e.target.value)}
                    className="filter-select"
                >
                    <option value="">All Actions</option>
                    {actions.map(action => (
                        <option key={action} value={action}>{action}</option>
                    ))}
                </select>
                <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    className="date-input"
                />
                <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    className="date-input"
                />
                <label className="error-filter">
                    <input
                        type="checkbox"
                        checked={filters.isError}
                        onChange={(e) => handleFilterChange('isError', e.target.checked)}
                    />
                    Errors Only
                </label>
            </div>

            {/* Logs List */}
            {loading ? (
                <div className="logs-loading">Loading...</div>
            ) : error ? (
                <div className="logs-error">{error}</div>
            ) : (
                <>
                    <div className="logs-list">
                        {logs.length === 0 ? (
                            <div className="no-logs">No logs found</div>
                        ) : (
                            logs.map(log => (
                                <div
                                    key={log._id}
                                    className={`log-item ${log.isError ? 'error' : ''}`}
                                    onClick={() => setSelectedLog(log)}
                                >
                                    <div className="log-icon">{getActionIcon(log.action)}</div>
                                    <div className="log-content">
                                        <div className="log-main">
                                            <span className={`log-action ${getActionColor(log.action)}`}>
                                                {log.action}
                                            </span>
                                            <span className="log-description">
                                                {log.description || 'No description'}
                                            </span>
                                        </div>
                                        <div className="log-meta">
                                            {log.userInfo && (
                                                <span className="log-user">
                                                    {log.userInfo.name} ({log.userInfo.enrollmentNumber})
                                                </span>
                                            )}
                                            <span className="log-time">{formatDate(log.createdAt)}</span>
                                            {log.ip && <span className="log-ip">{log.ip}</span>}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Pagination */}
                    {pagination.pages > 1 && (
                        <div className="logs-pagination">
                            <button
                                disabled={pagination.page === 1}
                                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                            >
                                Previous
                            </button>
                            <span>Page {pagination.page} of {pagination.pages}</span>
                            <button
                                disabled={pagination.page === pagination.pages}
                                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                            >
                                Next
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* Log Detail Modal */}
            {selectedLog && (
                <div className="log-modal-overlay" onClick={() => setSelectedLog(null)}>
                    <div className="log-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{getActionIcon(selectedLog.action)} {selectedLog.action}</h2>
                            <button className="close-btn" onClick={() => setSelectedLog(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="detail-row">
                                <span className="label">Time:</span>
                                <span>{formatDate(selectedLog.createdAt)}</span>
                            </div>
                            {selectedLog.userInfo && (
                                <>
                                    <div className="detail-row">
                                        <span className="label">User:</span>
                                        <span>{selectedLog.userInfo.name}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="label">Enrollment:</span>
                                        <span>{selectedLog.userInfo.enrollmentNumber}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="label">Role:</span>
                                        <span>{selectedLog.userInfo.role}</span>
                                    </div>
                                </>
                            )}
                            <div className="detail-row">
                                <span className="label">Description:</span>
                                <span>{selectedLog.description || '-'}</span>
                            </div>
                            <div className="detail-row">
                                <span className="label">Target Type:</span>
                                <span>{selectedLog.targetType || '-'}</span>
                            </div>
                            <div className="detail-row">
                                <span className="label">Target ID:</span>
                                <span className="mono">{selectedLog.targetId || '-'}</span>
                            </div>
                            <div className="detail-row">
                                <span className="label">IP Address:</span>
                                <span className="mono">{selectedLog.ip || '-'}</span>
                            </div>
                            <div className="detail-row">
                                <span className="label">Path:</span>
                                <span className="mono">{selectedLog.path || '-'}</span>
                            </div>
                            {selectedLog.targetInfo && (
                                <div className="detail-row">
                                    <span className="label">Target Info:</span>
                                    <pre className="json-display">
                                        {JSON.stringify(selectedLog.targetInfo, null, 2)}
                                    </pre>
                                </div>
                            )}
                            {selectedLog.metadata && (
                                <div className="detail-row">
                                    <span className="label">Metadata:</span>
                                    <pre className="json-display">
                                        {JSON.stringify(selectedLog.metadata, null, 2)}
                                    </pre>
                                </div>
                            )}
                            {selectedLog.isError && selectedLog.errorDetails && (
                                <div className="error-details">
                                    <h3>Error Details</h3>
                                    <div className="detail-row">
                                        <span className="label">Message:</span>
                                        <span className="error-text">{selectedLog.errorDetails.message}</span>
                                    </div>
                                    {selectedLog.errorDetails.stack && (
                                        <div className="detail-row">
                                            <span className="label">Stack:</span>
                                            <pre className="stack-trace">{selectedLog.errorDetails.stack}</pre>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ActivityLogs;
