// ============================================================
// USER SERVICE — Profile, settings, account management
// ============================================================
import apiClient from './client';

const UserService = {

  // ── Get current user profile ──────────────────────────────
  // GET /users/me/
  getProfile: async () => {
    const response = await apiClient.get('/users/me/');
    return response.data;
  },

  // ── Update profile info ───────────────────────────────────
  // PATCH /users/me/
  updateProfile: async (fields) => {
    const response = await apiClient.patch('/users/me/', fields);
    return response.data;
  },

  // ── Change password ───────────────────────────────────────
  // POST /users/me/change-password
  changePassword: async ({ currentPassword, newPassword }) => {
    await apiClient.post('/users/me/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
  },

  // ── Delete account ────────────────────────────────────────
  // DELETE /users/me
  deleteAccount: async () => {
    await apiClient.delete('/users/me');
  },

  // ── Update notification preferences ──────────────────────
  // PATCH /users/me/notifications
  updateNotifications: async ({ reminders, tips }) => {
    const response = await apiClient.patch('/users/me/notifications', {
      reminders,
      tips,
    });
    return response.data.preferences;
  },
};

export default UserService;
