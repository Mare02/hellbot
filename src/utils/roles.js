const staffIds = require('./staffIds');
const { owner } = require('../utils/config');

const roles = {
  UNLOCKED: 'unlocked',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
}

const ROLE_ORDER = [
  roles.UNLOCKED,
  roles.ADMIN,
  roles.MODERATOR
];

const hasPermission = (commandPerm, userId) => {
  const staffRole = getStaffRole(userId);
  if (!staffRole) {
    return false;
  }
  return ROLE_ORDER.indexOf(staffRole) <= ROLE_ORDER.indexOf(commandPerm);
}

const getStaffRole = (userId) => {
  if (
    staffIds.unlockedStaffIds.includes(String(userId))
    || String(userId) === owner.id
  ) {
    return roles.UNLOCKED;
  } else if (staffIds.adminStaffIds.includes(String(userId))) {
    return roles.ADMIN;
  } else if (staffIds.moderatorStaffIds.includes(String(userId))) {
    return roles.MODERATOR;
  } else {
    return null;
  }
}

module.exports = {
  ...roles,
  hasPermission,
}
