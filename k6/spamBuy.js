import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

// Custom metrics to track exactly what happens
const successfulReqs = new Counter('successful_reqs');
const blockedReqs = new Counter('blocked_reqs');

export const options = {
  // Traffic Stages: Simulate a real day pattern
  stages: [
    { duration: '10s', target: 10 },  // Warm up: 10 users
    { duration: '30s', target: 100 }, // SPIKE: Ramp up to 100 concurrent users!
    { duration: '10s', target: 0 },   // Cool down
  ],
  
  // Don't treat 429s as "errors" in the final report
  thresholds: {
    'http_req_duration': ['p(95)<500'], // 95% of requests must complete under 500ms
  },
};

export default function () {
  // The Payload (empty object like in your React code)
  const payload = JSON.stringify({});
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // Hit the endpoint
  const res = http.post('http://localhost:3000/buy', payload, params);

  // Check the response status
  const is200 = res.status === 200;
  const is429 = res.status === 429;

  // Update our counters
  if (is200) {
    successfulReqs.add(1);
    check(res, { 'status is 200': (r) => r.status === 200 });
  } else if (is429) {
    blockedReqs.add(1);
    check(res, { 'Rate Limited (429)': (r) => r.status === 429 });
  } else {
    // If it's 500, your server crashed!
    check(res, { 'Server Error': (r) => r.status !== 200 && r.status !== 429 });
  }

  sleep(Math.random() * 0.5); 
}