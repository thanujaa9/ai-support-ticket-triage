const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');

// All AI routes require authentication (Agent or Admin)
router.use(authenticate);

// Triage trigger & Thread summarization
router.post('/tickets/:ticketId/triage', aiController.triageTicket);
router.get('/tickets/:ticketId/summarize', aiController.summarizeThread);

// Human-in-the-Loop review
router.post('/responses/:id/review', aiController.reviewAiResponse);

// Prompt Version Management
router.get('/prompts', aiController.listPromptVersions);

// LLM Run Debugger (Observability)
router.get('/debug/llm-calls', aiController.getLlmCalls);

module.exports = router;
