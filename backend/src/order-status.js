const ORDER_STATUSES = new Set(['pending', 'processing', 'shipped', 'completed', 'cancelled']);

function isValidOrderStatus(status) {
  return ORDER_STATUSES.has(status);
}

function canTransitionOrderStatus(currentStatus, nextStatus) {
  return isValidOrderStatus(nextStatus)
    && (currentStatus !== 'cancelled' || nextStatus === 'cancelled');
}

module.exports = { canTransitionOrderStatus, isValidOrderStatus };
