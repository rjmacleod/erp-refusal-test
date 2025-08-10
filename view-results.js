const fs = require('fs');
const path = require('path');

// Read all result files
const resultsDir = './data/results';
const files = fs.readdirSync(resultsDir)
  .filter(f => f.endsWith('.json') && !f.startsWith('batch_'))
  .map(f => path.join(resultsDir, f));

console.log('🚀 ERP Refusal Evaluation Results');
console.log('=================================\n');

let totalTests = 0;
let totalRefusals = 0;
const providerStats = {};
const intensityStats = {};

files.forEach(file => {
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    const { testCase, response, analysis } = data;
    
    totalTests++;
    if (analysis.isRefusal) totalRefusals++;
    
    // Provider stats
    const provider = response.provider;
    if (!providerStats[provider]) {
      providerStats[provider] = { total: 0, refusals: 0 };
    }
    providerStats[provider].total++;
    if (analysis.isRefusal) providerStats[provider].refusals++;
    
    // Intensity stats
    const intensity = testCase.intensityLevel;
    if (!intensityStats[intensity]) {
      intensityStats[intensity] = { total: 0, refusals: 0 };
    }
    intensityStats[intensity].total++;
    if (analysis.isRefusal) intensityStats[intensity].refusals++;
    
    console.log(`📝 Test Case: ${testCase.id}`);
    console.log(`   Intensity: Level ${testCase.intensityLevel}`);
    console.log(`   Provider: ${response.provider} (${response.model})`);
    console.log(`   Prompt: "${testCase.prompt}"`);
    console.log(`   Character: "${testCase.character}"`);
    console.log(`   Response: "${response.response.substring(0, 100)}..."`);
    console.log(`   Analysis: ${analysis.isRefusal ? '🚫 REFUSED' : '✅ ACCEPTED'} (confidence: ${analysis.confidence.toFixed(2)})`);
    console.log(`   Reason: ${analysis.reason}`);
    console.log(`   Cost: $${response.cost.toFixed(4)}`);
    console.log('');
  } catch (err) {
    console.error(`Error reading ${file}:`, err.message);
  }
});

console.log('📊 SUMMARY STATISTICS');
console.log('====================');
console.log(`Total Tests: ${totalTests}`);
console.log(`Total Refusals: ${totalRefusals}`);
console.log(`Overall Refusal Rate: ${totalTests > 0 ? (totalRefusals/totalTests*100).toFixed(1) : 0}%\n`);

console.log('📈 By Provider:');
Object.entries(providerStats).forEach(([provider, stats]) => {
  const rate = stats.total > 0 ? (stats.refusals/stats.total*100).toFixed(1) : 0;
  console.log(`   ${provider}: ${stats.refusals}/${stats.total} refused (${rate}%)`);
});

console.log('\n🌡️ By Intensity Level:');
Object.entries(intensityStats).forEach(([intensity, stats]) => {
  const rate = stats.total > 0 ? (stats.refusals/stats.total*100).toFixed(1) : 0;
  console.log(`   Level ${intensity}: ${stats.refusals}/${stats.total} refused (${rate}%)`);
});

const totalCost = files.reduce((sum, file) => {
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    return sum + data.response.cost;
  } catch {
    return sum;
  }
}, 0);

console.log(`\n💰 Total Cost: $${totalCost.toFixed(4)}`);