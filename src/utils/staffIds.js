require('dotenv').config();

module.exports = {
  unlockedStaffIds: process.env.UNLOCKED ? process.env.UNLOCKED.split(',') : [],
  adminStaffIds: process.env.ADMINS ? process.env.ADMINS.split(',') : [],
  moderatorStaffIds: process.env.MODERATORS ? process.env.MODERATORS.split(',') : [],
};
