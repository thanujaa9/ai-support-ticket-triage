const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticket.controller');
const commentController = require('../controllers/comment.controller');
const historyController = require('../controllers/history.controller');
const { authenticate, optionalAuth } = require('../middleware/auth.middleware');

// Public or Agent ticket creation (Customer portal can submit without token, agent with token)
router.post('/', optionalAuth, ticketController.createTicket);

// Employee routes (Agents & Admins)
router.get('/', authenticate, ticketController.listTickets);
router.get('/:id', optionalAuth, ticketController.getTicketById);
router.patch('/:id', authenticate, ticketController.updateTicket);
router.post('/:id/assign', authenticate, ticketController.assignTicket);

// Nested Comments & History routes
router.get('/:ticketId/comments', optionalAuth, commentController.getTicketComments);
router.post('/:ticketId/comments', optionalAuth, commentController.addComment);
router.get('/:ticketId/history', authenticate, historyController.getTicketHistory);

module.exports = router;
