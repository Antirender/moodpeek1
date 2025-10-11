#!/usr/bin/env node

// server/seedData.js
// Simple script to call the seed endpoint

const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5174,
  path: '/dev/seed',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', data);
    if (res.statusCode === 200) {
      console.log('✓ Seed data created successfully!');
      console.log('→ Visit http://localhost:5173/trends to see the visualization');
    }
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.end();

console.log('Seeding data...');