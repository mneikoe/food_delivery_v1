const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const reportDir = path.join(__dirname, "../reports");
if (!fs.existsSync(reportDir)) {
  fs.mkdirSync(reportDir, { recursive: true });
}

console.log("🔒 Running security audit...");

const auditResult = {
  timestamp: new Date().toISOString(),
  secretsScan: { status: "PASS", issues: [] },
  unusedDependencies: [],
  npmAudit: { status: "PASS", details: {} }
};

// 1. Hardcoded Secrets Scan
const filesToScan = [
  "server.js",
  "src/app.js",
  "src/config/env.js",
  "src/config/swagger.js",
  "src/controllers/paymentController.js"
];

filesToScan.forEach(file => {
  const filePath = path.join(__dirname, "../", file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, "utf8");
    // Simple regex for dummy key indicators
    if (content.includes("your_super_secret_jwt_key") || content.includes("your_webhook_secret_here")) {
      auditResult.secretsScan.issues.push({
        file,
        issue: "Placeholder/default configuration values detected."
      });
      auditResult.secretsScan.status = "WARN";
    }
  }
});

// 2. Unused Dependency Check
const packageJson = require("../package.json");
if (packageJson.dependencies["@supabase/supabase-js"]) {
  auditResult.unusedDependencies.push({
    package: "@supabase/supabase-js",
    reason: "Supabase authentication replaced with custom Nodemailer OTP service."
  });
}

// 3. NPM Audit
try {
  const auditJson = execSync("npm audit --json", { encoding: "utf8" });
  auditResult.npmAudit.details = JSON.parse(auditJson);
} catch (error) {
  // npm audit exits with non-zero if vulnerabilities are found
  try {
    auditResult.npmAudit.details = JSON.parse(error.stdout || "{}");
    auditResult.npmAudit.status = "FAIL";
  } catch (e) {
    auditResult.npmAudit.status = "WARN";
    auditResult.npmAudit.details = { error: "Failed to parse npm audit output" };
  }
}

// Output report
const outputPath = path.join(reportDir, "security-audit.json");
const rootOutputPath = path.join(__dirname, "../security-audit.json");
fs.writeFileSync(outputPath, JSON.stringify(auditResult, null, 2));
fs.writeFileSync(rootOutputPath, JSON.stringify(auditResult, null, 2));
console.log(`✅ Security audit completed. Report saved to ${outputPath}`);
