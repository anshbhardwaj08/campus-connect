const express = require('express');
const adminController = require('../controllers/admin.controller');
const { verifyAccessToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();

router.use(verifyAccessToken, requireRole('admin', 'moderator'));

router.get('/stats', adminController.getDashboardStats);

router.get('/users', adminController.getUsers);
router.patch('/users/:id/ban', adminController.banUser);
router.patch('/users/:id/unban', adminController.unbanUser);

router.get('/listings', adminController.getListings);
router.patch('/listings/:id/approve', adminController.approveListing);
router.patch('/listings/:id/reject', adminController.rejectListing);

router.get('/reports', adminController.getReports);
router.patch('/reports/:id/resolve', adminController.resolveReport);

router.post('/notifications/broadcast', adminController.broadcastNotif);

router.get('/logs', adminController.getLogs);

router.get('/categories', adminController.getCategories);
router.post('/categories', requireRole('admin'), adminController.createCategory);

module.exports = router;
