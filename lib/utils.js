import { format, formatDistanceToNow, parseISO, differenceInDays } from 'date-fns';

/**
 * Check if the user's role is in the list of allowed roles
 * @param {object} session - NextAuth session object
 * @param {string[]} allowedRoles - Array of allowed role strings
 * @returns {boolean}
 */
export function checkRole(session, allowedRoles) {
    if (!session?.user?.role) return false;
    return allowedRoles.includes(session.user.role);
}

/**
 * Format a currency amount in Indian Rupee format
 * @param {number} amount
 * @returns {string} e.g. "₹1,23,456"
 */
export function formatCurrency(amount) {
    if (amount == null || isNaN(amount)) return '₹0';
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(amount);
}

/**
 * Format a number with commas
 * @param {number} num
 * @returns {string} e.g. "12,345"
 */
export function formatNumber(num) {
    if (num == null || isNaN(num)) return '0';
    return new Intl.NumberFormat('en-IN').format(num);
}

/**
 * Format a distance in km
 * @param {number} km
 * @returns {string} e.g. "1,234 km"
 */
export function formatDistance(km) {
    if (km == null || isNaN(km)) return '0 km';
    return `${new Intl.NumberFormat('en-IN').format(Math.round(km))} km`;
}

/**
 * Format a date to a readable string
 * @param {string|Date} date
 * @returns {string} e.g. "21 Feb 2026"
 */
export function formatDate(date) {
    if (!date) return '—';
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, 'dd MMM yyyy');
}

/**
 * Format a date to a relative string
 * @param {string|Date} date
 * @returns {string} e.g. "3 days ago"
 */
export function formatRelativeDate(date) {
    if (!date) return '—';
    const d = typeof date === 'string' ? parseISO(date) : date;
    return formatDistanceToNow(d, { addSuffix: true });
}

/**
 * Get number of days until a date (e.g. license expiry)
 * @param {string|Date} date
 * @returns {number} positive = future, negative = past
 */
export function getDaysUntilExpiry(date) {
    if (!date) return 0;
    const d = typeof date === 'string' ? parseISO(date) : date;
    return differenceInDays(d, new Date());
}

/**
 * Calculate ROI percentage
 * @param {number} revenue - Total revenue
 * @param {number} maintenance - Total maintenance cost
 * @param {number} fuel - Total fuel cost
 * @param {number} acquisitionCost - Vehicle acquisition cost
 * @returns {number} ROI percentage
 */
export function calculateROI(revenue, maintenance, fuel, acquisitionCost) {
    const totalCost = (maintenance || 0) + (fuel || 0) + (acquisitionCost || 0);
    if (totalCost === 0) return 0;
    return parseFloat((((revenue - totalCost) / totalCost) * 100).toFixed(1));
}

/**
 * Get a hex color for a given status string
 * @param {string} status
 * @returns {string} hex color
 */
export function getStatusColor(status) {
    const colors = {
        // Vehicle statuses
        'Available': '#10B981',
        'On Trip': '#3B82F6',
        'In Shop': '#F59E0B',
        'Retired': '#6B7280',

        // Driver statuses
        'On Duty': '#3B82F6',
        'Off Duty': '#6B7280',
        'Suspended': '#EF4444',

        // Trip statuses
        'Draft': '#94A3B8',
        'Dispatched': '#3B82F6',
        'Completed': '#10B981',
        'Cancelled': '#EF4444',

        // Maintenance statuses
        'Ongoing': '#F59E0B',
        'Resolved': '#10B981',

        // Alert severity
        'Low': '#3B82F6',
        'Medium': '#F59E0B',
        'High': '#EF4444',
        'Critical': '#DC2626',
    };

    return colors[status] || '#94A3B8';
}

/**
 * Build query string from an object of params
 * @param {object} params
 * @returns {string}
 */
export function buildQueryString(params) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
            query.set(key, value);
        }
    });
    const str = query.toString();
    return str ? `?${str}` : '';
}

/**
 * Get a human-readable label for a role
 * @param {string} role
 * @returns {string}
 */
export function getRoleLabel(role) {
    const labels = {
        fleet_manager: 'Fleet Manager',
        dispatcher: 'Dispatcher',
        safety_officer: 'Safety Officer',
        financial_analyst: 'Financial Analyst',
    };
    return labels[role] || role;
}
