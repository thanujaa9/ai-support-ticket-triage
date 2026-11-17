const db = require('../config/db');
const env = require('../config/env');

/**
 * AI Service: Supports Google Gemini API (Free tier), OpenAI API,
 * and Smart Heuristic Fallback (zero key required).
 */
class AiService {
  /**
   * Main entry point: Classify ticket & generate first reply draft
   */
  static async triageTicket(ticketId) {
    const start = Date.now();

    // 1. Fetch ticket and customer details
    const ticketRes = await db.query(
      `SELECT t.*, c.name as customer_name, c.company as customer_company, c.email as customer_email,
              cat.name as current_category_name
       FROM tickets t
       JOIN customers c ON c.id = t.customer_id
       LEFT JOIN categories cat ON cat.id = t.category_id
       WHERE t.id = $1`,
      [ticketId]
    );

    if (ticketRes.rows.length === 0) {
      throw new Error(`Ticket #${ticketId} not found.`);
    }

    const ticket = ticketRes.rows[0];

    // 2. Fetch active prompt versions for classification and draft reply
    const classPromptRes = await db.query(
      `SELECT * FROM prompt_versions WHERE purpose = 'classification' AND is_active = true ORDER BY id DESC LIMIT 1`
    );
    const draftPromptRes = await db.query(
      `SELECT * FROM prompt_versions WHERE purpose = 'draft_reply' AND is_active = true ORDER BY id DESC LIMIT 1`
    );

    const classPrompt = classPromptRes.rows[0] || {
      id: null,
      model: 'gemini-1.5-flash',
      system_prompt: 'Classify support ticket into category, priority, and sentiment. Return valid JSON.',
    };

    const draftPrompt = draftPromptRes.rows[0] || {
      id: null,
      model: 'gemini-1.5-flash',
      system_prompt: 'Draft an empathetic, helpful support reply addressing customer issue.',
    };

    // 3. Execute Classification & Draft Generation
    let triageResult;
    let llmLog = {
      ticket_id: ticket.id,
      prompt_version_id: classPrompt.id,
      operation_type: 'triage_classification',
      model: classPrompt.model || 'gemini-1.5-flash',
      request_payload: {},
      response_payload: null,
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
      latency_ms: 0,
      cost_usd: 0,
      status: 'success',
      error_message: null,
    };

    try {
      triageResult = await this.callLlmTriage(ticket, classPrompt, draftPrompt, llmLog);
    } catch (err) {
      console.warn('[AI Service] LLM call failed. Invoking rule-based fallback:', err.message);
      llmLog.status = 'fallback';
      llmLog.error_message = err.message;
      triageResult = this.heuristicFallback(ticket);
    } finally {
      llmLog.latency_ms = Date.now() - start;
      // Record LLM call telemetry into llm_calls table
      await db.query(
        `INSERT INTO llm_calls (
           ticket_id, prompt_version_id, operation_type, model, request_payload,
           response_payload, prompt_tokens, completion_tokens, total_tokens,
           latency_ms, cost_usd, status, error_message
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          llmLog.ticket_id,
          llmLog.prompt_version_id,
          llmLog.operation_type,
          llmLog.model,
          JSON.stringify(llmLog.request_payload),
          llmLog.response_payload ? JSON.stringify(llmLog.response_payload) : null,
          llmLog.prompt_tokens,
          llmLog.completion_tokens,
          llmLog.total_tokens,
          llmLog.latency_ms,
          llmLog.cost_usd,
          llmLog.status,
          llmLog.error_message,
        ]
      );
    }

    // 4. Map proposed category name to category_id
    let proposedCategoryId = null;
    if (triageResult.proposed_category) {
      const catMatch = await db.query('SELECT id FROM categories WHERE name ILIKE $1 LIMIT 1', [
        `%${triageResult.proposed_category}%`,
      ]);
      if (catMatch.rows.length > 0) {
        proposedCategoryId = catMatch.rows[0].id;
      }
    }

    // 5. Store result in ai_responses table
    const aiResponseInsert = await db.query(
      `INSERT INTO ai_responses (
         ticket_id, prompt_version_id, proposed_category_id, proposed_priority,
         proposed_sentiment, draft_reply, confidence_score, status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
       RETURNING *`,
      [
        ticket.id,
        draftPrompt.id,
        proposedCategoryId,
        triageResult.proposed_priority,
        triageResult.proposed_sentiment,
        triageResult.draft_reply,
        triageResult.confidence_score,
      ]
    );

    // 6. Update ticket metadata if fields are empty
    await db.query(
      `UPDATE tickets 
       SET sentiment = COALESCE(sentiment, $1),
           category_id = COALESCE(category_id, $2)
       WHERE id = $3`,
      [triageResult.proposed_sentiment, proposedCategoryId, ticket.id]
    );

    return {
      triage: triageResult,
      ai_response: aiResponseInsert.rows[0],
      llm_call_status: llmLog.status,
    };
  }

  /**
   * Call LLM (Gemini or OpenAI) with fallback to heuristic
   */
  static async callLlmTriage(ticket, classPrompt, draftPrompt, llmLog) {
    const provider = env.AI_PROVIDER.toLowerCase();

    if (provider === 'gemini' && env.GEMINI_API_KEY) {
      return this.callGemini(ticket, classPrompt, draftPrompt, llmLog);
    } else if (provider === 'openai' && env.OPENAI_API_KEY) {
      return this.callOpenAi(ticket, classPrompt, draftPrompt, llmLog);
    } else {
      throw new Error(`No active API key configured for provider "${provider}". Utilizing heuristic rule engine.`);
    }
  }

  /**
   * Google Gemini API Adapter (Generative Language API v1beta)
   */
  static async callGemini(ticket, classPrompt, draftPrompt, llmLog) {
    const model = 'gemini-1.5-flash';
    llmLog.model = model;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;

    const promptText = `
You are an expert customer support triage assistant.
Ticket Subject: "${ticket.subject}"
Ticket Description: "${ticket.description}"
Customer: "${ticket.customer_name}" (Company: "${ticket.customer_company || 'N/A'}")

Analyze this ticket and respond ONLY in valid JSON with this exact schema:
{
  "proposed_category": "Billing & Invoices" | "Technical Support" | "Account Access" | "Bug Report" | "Feature Request" | "Security & Compliance",
  "proposed_priority": "low" | "medium" | "high" | "urgent",
  "proposed_sentiment": "positive" | "neutral" | "negative" | "urgent",
  "confidence_score": 0.85 to 0.99,
  "draft_reply": "A polite, empathetic, professional response to the customer addressing their specific issue with clear next steps."
}
`;

    llmLog.request_payload = { url, model, prompt: promptText };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API Error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = JSON.parse(candidateText);

    llmLog.response_payload = parsed;
    llmLog.prompt_tokens = data.usageMetadata?.promptTokenCount || 250;
    llmLog.completion_tokens = data.usageMetadata?.candidatesTokenCount || 100;
    llmLog.total_tokens = data.usageMetadata?.totalTokenCount || 350;
    llmLog.cost_usd = 0.0; // Gemini free tier!

    return parsed;
  }

  /**
   * OpenAI API Adapter (gpt-4o-mini)
   */
  static async callOpenAi(ticket, classPrompt, draftPrompt, llmLog) {
    const model = 'gpt-4o-mini';
    llmLog.model = model;
    const url = 'https://api.openai.com/v1/chat/completions';

    const systemPrompt = `You are an expert customer support triage assistant. Analyze the incoming ticket and output JSON strictly conforming to the requested schema.`;
    const userPrompt = `
Ticket Subject: "${ticket.subject}"
Ticket Description: "${ticket.description}"
Customer: "${ticket.customer_name}" (Company: "${ticket.customer_company || 'N/A'}")

Output JSON:
{
  "proposed_category": "Billing & Invoices" | "Technical Support" | "Account Access" | "Bug Report" | "Feature Request" | "Security & Compliance",
  "proposed_priority": "low" | "medium" | "high" | "urgent",
  "proposed_sentiment": "positive" | "neutral" | "negative" | "urgent",
  "confidence_score": 0.90,
  "draft_reply": "Empathetic, clear, and actionable customer reply"
}`;

    llmLog.request_payload = { model, systemPrompt, userPrompt };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI API Error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const parsed = JSON.parse(content);

    llmLog.response_payload = parsed;
    llmLog.prompt_tokens = data.usage.prompt_tokens;
    llmLog.completion_tokens = data.usage.completion_tokens;
    llmLog.total_tokens = data.usage.total_tokens;
    llmLog.cost_usd = (data.usage.prompt_tokens * 0.00015 + data.usage.completion_tokens * 0.0006) / 1000;

    return parsed;
  }

  /**
   * Smart Rule-Based Fallback Engine
   * Deterministic heuristic NLP used when no API key is provided or on rate limits.
   */
  static heuristicFallback(ticket) {
    const text = `${ticket.subject} ${ticket.description}`.toLowerCase();

    let category = 'Technical Support';
    let priority = 'medium';
    let sentiment = 'neutral';
    let confidence = 0.88;

    // Category detection
    if (/invoice|charge|refund|credit card|billing|payment|vat|renew/i.test(text)) {
      category = 'Billing & Invoices';
    } else if (/password|mfa|2fa|login|locked|sso|access|auth/i.test(text)) {
      category = 'Account Access';
    } else if (/bug|glitch|error 500|broken|unresponsive|crash/i.test(text)) {
      category = 'Bug Report';
    } else if (/feature|export|integration|snowflake|bigquery|enhance|suggest/i.test(text)) {
      category = 'Feature Request';
    } else if (/security|soc2|gdpr|leak|vulnerability|audit/i.test(text)) {
      category = 'Security & Compliance';
    }

    // Priority detection
    if (/urgent|double charged|emergency|asap|critical|downtime|immediately/i.test(text)) {
      priority = 'urgent';
      sentiment = 'urgent';
      confidence = 0.96;
    } else if (/error 500|locked out|blocking|failing|cannot/i.test(text)) {
      priority = 'high';
      sentiment = 'negative';
      confidence = 0.92;
    } else if (/feature|export|nice to have/i.test(text)) {
      priority = 'low';
      sentiment = 'positive';
      confidence = 0.89;
    }

    // Draft response generation
    const customerName = ticket.customer_name ? ticket.customer_name.split(' ')[0] : 'there';
    let draftReply = `Hi ${customerName},\n\nThank you for reaching out to support. We have received your inquiry regarding "${ticket.subject}".\n\n`;

    if (category === 'Billing & Invoices') {
      draftReply += `Our billing department has been notified to review your transaction records immediately. We will issue any necessary refunds or adjustments and provide confirmation within 24 hours.`;
    } else if (category === 'Account Access') {
      draftReply += `To assist you safely with account recovery, please make sure you can verify ownership of your registered domain or provide your primary backup verification code.`;
    } else if (category === 'Technical Support' || category === 'Bug Report') {
      draftReply += `Our engineering team is actively investigating this behavior. We are analyzing the system logs to identify the root cause and will update you with remediation steps shortly.`;
    } else {
      draftReply += `Our team has logged this request and will evaluate it with our engineering and product teams. We appreciate your feedback!`;
    }

    draftReply += `\n\nBest regards,\nCustomer Support Team`;

    return {
      proposed_category: category,
      proposed_priority: priority,
      proposed_sentiment: sentiment,
      confidence_score: confidence,
      draft_reply: draftReply,
    };
  }

  /**
   * Thread Summarization
   */
  static async summarizeThread(ticketId) {
    const commentsRes = await db.query(
      `SELECT author_type, author_name, body, created_at 
       FROM comments 
       WHERE ticket_id = $1 
       ORDER BY created_at ASC`,
      [ticketId]
    );

    const ticketRes = await db.query('SELECT subject, description FROM tickets WHERE id = $1', [ticketId]);
    if (ticketRes.rows.length === 0) throw new Error('Ticket not found.');

    const ticket = ticketRes.rows[0];
    const comments = commentsRes.rows;

    const summary = {
      root_issue: ticket.subject,
      comment_count: comments.length,
      actions_taken: comments.length > 0
        ? `Exchanged ${comments.length} message(s) between customer and support agents.`
        : 'Ticket newly opened; no agent replies logged yet.',
      current_blocker: 'Awaiting customer response or resolution verification.',
    };

    return summary;
  }
}

module.exports = AiService;
