/**
 * Automated Verification Script for Stage 2 & 3 REST APIs
 * Run via: node backend/test-api.js
 */

const http = require('http');

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : null;
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers,
    };
    if (dataString) {
      reqHeaders['Content-Length'] = Buffer.byteLength(dataString);
    }

    const options = {
      hostname: 'localhost',
      port: process.env.PORT ? parseInt(process.env.PORT, 10) : 5001,
      path: path,
      method: method,
      headers: reqHeaders,
    };

    const req = http.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => { responseBody += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseBody);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: responseBody });
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (dataString) req.write(dataString);
    req.end();
  });
}

async function runTests() {
  console.log('--- Starting API Verification Tests ---');

  // 1. Health check
  console.log('\n1. Testing GET /api/health');
  const health = await request('GET', '/api/health');
  console.log('Status:', health.status, 'Body:', health.data);

  // 2. Login as admin
  console.log('\n2. Testing POST /api/auth/login (Admin credentials)');
  const loginRes = await request('POST', '/api/auth/login', {
    email: 'admin@triage.local',
    password: 'Password123!',
  });
  console.log('Status:', loginRes.status, 'User:', loginRes.data.user);
  const token = loginRes.data.token;

  // 3. Authenticated GET /api/auth/me
  console.log('\n3. Testing GET /api/auth/me');
  const meRes = await request('GET', '/api/auth/me', null, {
    Authorization: `Bearer ${token}`,
  });
  console.log('Status:', meRes.status, 'Me:', meRes.data.user);

  // 4. GET /api/tickets
  console.log('\n4. Testing GET /api/tickets (Filtering & JOINs)');
  const ticketsRes = await request('GET', '/api/tickets?status=open', null, {
    Authorization: `Bearer ${token}`,
  });
  console.log('Status:', ticketsRes.status, 'Total Open Tickets:', ticketsRes.data.total);
  if (ticketsRes.data.tickets && ticketsRes.data.tickets.length > 0) {
    const first = ticketsRes.data.tickets[0];
    console.log(`Sample Ticket: #${first.ticket_number} - "${first.subject}" (${first.priority}, Customer: ${first.customer_company})`);
  }

  // 5. Test Customer Ticket Submission + Duplicate Detection
  console.log('\n5. Testing POST /api/tickets with duplicate subject');
  const ticketCreateRes = await request('POST', '/api/tickets', {
    name: 'Marcus Brody',
    email: 'marcus@fintechglobal.io',
    subject: 'Webhooks failing with 500 error code since morning', // similar to TIC-1002
    description: 'Our webhooks are still failing with 500 errors. Need an urgent update.',
    priority: 'urgent',
  });
  console.log('Status:', ticketCreateRes.status);
  console.log('Created Ticket Number:', ticketCreateRes.data.ticket?.ticket_number);
  console.log('Duplicate Warning:', ticketCreateRes.data.duplicate_warning);

  console.log('\n--- API Verification Tests Finished Successfully! ---');
}

runTests().catch(console.error);
