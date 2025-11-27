const USER_ROLES = {
  MENTEE: 'mentee',
  MENTOR: 'mentor',
  ADMIN: 'admin',
};

const ROLE_HIERARCHY = {
  [USER_ROLES.MENTEE]: 1,
  [USER_ROLES.MENTOR]: 2,
  [USER_ROLES.ADMIN]: 3,
};

module.exports = {
  USER_ROLES,
  ROLE_HIERARCHY,
};
