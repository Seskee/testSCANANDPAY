// server/services/dashboardService.js
const { getDB } = require('../config/database');

const getDailyRevenue = async (restaurantId, date = new Date()) => {
  const db = getDB();
  const start = new Date(date); start.setHours(0, 0, 0, 0);
  const end   = new Date(date); end.setHours(23, 59, 59, 999);

  const rows = await db.getDailyRevenue(restaurantId, start, end);
  const row = rows[0] || { revenue: 0, transactions: 0, tips: 0 };

  return {
    date: start.toISOString().split('T')[0],
    totalRevenue: row.revenue,
    totalTips: row.tips,
    transactionCount: row.transactions,
    averageTransaction: row.transactions > 0 ? row.revenue / row.transactions : 0,
  };
};

const getMonthlyRevenue = async (restaurantId, month, year) => {
  if (!month || month < 1 || month > 12) throw new Error('Invalid month (1-12)');
  if (!year || year < 2000 || year > 2100) throw new Error('Invalid year');
  const db = getDB();

  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth   = new Date(year, month, 0, 23, 59, 59, 999);

  const dailyRows = await db.getDailyRevenue(restaurantId, startOfMonth, endOfMonth);

  // Popuni sve dane (i oni bez transakcija)
  const daysInMonth = endOfMonth.getDate();
  const dailyMap = {};
  dailyRows.forEach(r => { dailyMap[r.date] = r; });

  const dailyBreakdown = [];
  let totalRevenue = 0, totalTips = 0, transactionCount = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const row = dailyMap[dateKey] || { revenue: 0, tips: 0, transactions: 0 };
    dailyBreakdown.push({ date: dateKey, revenue: row.revenue, tips: row.tips, transactions: row.transactions });
    totalRevenue     += row.revenue;
    totalTips        += row.tips;
    transactionCount += row.transactions;
  }

  return {
    month, year, totalRevenue, totalTips, transactionCount,
    averageTransaction: transactionCount > 0 ? totalRevenue / transactionCount : 0,
    dailyBreakdown,
  };
};

const getTransactionHistory = async (restaurantId, filters = {}) => {
  const db = getDB();
  const { startDate, endDate, limit = 100, skip = 0 } = filters;

  const page = Math.floor(skip / limit) + 1;
  const result = await db.getTransactionHistory(
    restaurantId,
    { limit: parseInt(limit), page },
    startDate ? new Date(startDate) : undefined,
    endDate   ? new Date(endDate)   : undefined
  );

  return {
    transactions: result.data,
    pagination: {
      total: result.total,
      limit: result.limit,
      skip: parseInt(skip),
      hasMore: result.hasMore,
    },
  };
};

const getDashboardSummary = async (restaurantId) => {
  const db = getDB();
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const weekStart  = new Date(today); weekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date(today); monthStart.setMonth(monthStart.getMonth() - 1);

  const [todayData, yesterdayData, allTime] = await Promise.all([
    getDailyRevenue(restaurantId, now),
    getDailyRevenue(restaurantId, yesterday),
    db.getDashboardSummary(restaurantId),
  ]);

  const weekData  = await db.getDashboardSummary(restaurantId, weekStart, now);
  const monthData = await db.getDashboardSummary(restaurantId, monthStart, now);

  const revenueChange = yesterdayData.totalRevenue > 0
    ? ((todayData.totalRevenue - yesterdayData.totalRevenue) / yesterdayData.totalRevenue) * 100
    : 0;

  return {
    today: {
      revenue: todayData.totalRevenue,
      tips: todayData.totalTips,
      transactions: todayData.transactionCount,
      averageTransaction: todayData.averageTransaction,
      change: revenueChange,
    },
    week:  { revenue: weekData.total_revenue,  transactions: weekData.total_transactions },
    month: { revenue: monthData.total_revenue, transactions: monthData.total_transactions },
    activeTables: allTime.active_bills,
    totalTables:  0,
  };
};

module.exports = { getDailyRevenue, getMonthlyRevenue, getTransactionHistory, getDashboardSummary };
