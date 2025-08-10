const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Find the latest HTML report
const reportsDir = './reports';
console.log('🚀 ERP Refusal Evaluation Results');
console.log('=================================\n');

if (!fs.existsSync(reportsDir)) {
  console.log('❌ No reports directory found. Run `npm run dev` first to generate reports.');
  process.exit(1);
}

const reportFiles = fs.readdirSync(reportsDir)
  .filter(f => f.endsWith('.html'))
  .map(f => ({
    name: f,
    path: path.join(reportsDir, f),
    mtime: fs.statSync(path.join(reportsDir, f)).mtime
  }))
  .sort((a, b) => b.mtime - a.mtime);

if (reportFiles.length === 0) {
  console.log('❌ No HTML reports found. Run `npm run dev` first to generate reports.');
  process.exit(1);
}

const latestReport = reportFiles[0];
const reportPath = path.resolve(latestReport.path);
const fileUrl = `file://${reportPath}`;

console.log(`📊 Latest Report: ${latestReport.name}`);
console.log(`📅 Generated: ${latestReport.mtime.toLocaleString()}`);
console.log(`🌐 Report URL: ${fileUrl}\n`);

console.log('🔍 Available Reports:');
reportFiles.forEach((report, index) => {
  console.log(`   ${index + 1}. ${report.name} (${report.mtime.toLocaleString()})`);
});

console.log('\n🚀 Opening latest report in browser...');

// Try to open in browser (works on macOS, Linux, Windows)
const openCommand = process.platform === 'darwin' ? 'open' : 
                   process.platform === 'win32' ? 'start' : 'xdg-open';

exec(`${openCommand} "${fileUrl}"`, (error) => {
  if (error) {
    console.log('❌ Could not automatically open browser.');
    console.log('📋 Please copy and paste this URL into your browser:');
    console.log(`   ${fileUrl}`);
  } else {
    console.log('✅ Report opened in default browser!');
  }
});

// Also provide quick stats from JSON data if available
const dataDir = './data/results';
if (fs.existsSync(dataDir)) {
  console.log('\n📈 Quick Stats from Latest Run:');
  const files = fs.readdirSync(dataDir)
    .filter(f => f.endsWith('.json') && !f.startsWith('batch_'))
    .map(f => path.join(dataDir, f));

  if (files.length > 0) {
    let totalTests = files.length;
    let totalRefusals = 0;
    let totalCost = 0;
    
    files.forEach(file => {
      try {
        const data = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (data.analysis.isRefusal) totalRefusals++;
        totalCost += data.response.cost;
      } catch (err) {
        // Skip files that can't be read
      }
    });
    
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Pass Rate: ${totalTests > 0 ? ((totalTests - totalRefusals)/totalTests*100).toFixed(1) : 0}%`);
    console.log(`   Total Cost: $${totalCost.toFixed(4)}`);
  } else {
    console.log('   No test data found.');
  }
} else {
  console.log('\n📝 No data directory found. JSON results will be available after running tests.');
}