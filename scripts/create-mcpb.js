#!/usr/bin/env node

/**
 * Script to create an MCP Bundle (.mcpb) file
 * This packages the MCP server for one-click installation
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Creating MCP Bundle (.mcpb) for MonarchMoney MCP Server');
console.log('===========================================================');

const bundleDir = path.join(__dirname, '..', 'mcpb-temp');
const outputDir = path.join(__dirname, '..', 'dist');
const packageJson = require('../package.json');
const bundleJson = require('../bundle.json');

// Clean and create bundle directory
if (fs.existsSync(bundleDir)) {
  fs.rmSync(bundleDir, { recursive: true });
}
fs.mkdirSync(bundleDir, { recursive: true });

console.log('📦 Copying required files...');

// Copy built JavaScript files
if (!fs.existsSync(path.join(__dirname, '..', 'dist'))) {
  console.error('❌ Build files not found. Please run "npm run build" first.');
  process.exit(1);
}

// Copy main files to bundle
const filesToCopy = [
  'dist/index.js',
  'package.json',
  'bundle.json',
  'README.md',
  'LICENSE',
  '.env.example'
];

filesToCopy.forEach(file => {
  const sourcePath = path.join(__dirname, '..', file);
  const destPath = path.join(bundleDir, path.basename(file));
  
  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, destPath);
    console.log(`✅ Copied ${file}`);
  } else {
    console.warn(`⚠️  File not found: ${file}`);
  }
});

// Create a simplified package.json for the bundle
const bundlePackageJson = {
  name: packageJson.name,
  version: packageJson.version,
  description: packageJson.description,
  main: 'index.js',
  bin: {
    [packageJson.name]: 'index.js'
  },
  dependencies: packageJson.dependencies,
  engines: packageJson.engines,
  keywords: packageJson.keywords,
  author: packageJson.author,
  license: packageJson.license
};

fs.writeFileSync(
  path.join(bundleDir, 'package.json'),
  JSON.stringify(bundlePackageJson, null, 2)
);

// Create manifest.json for MCP bundle compatibility
const manifest = {
  manifest_version: 1,
  name: bundleJson.displayName || bundleJson.name,
  version: bundleJson.version,
  description: bundleJson.description,
  author: bundleJson.author,
  homepage: bundleJson.homepage,
  license: bundleJson.license,
  mcp: {
    server: bundleJson.server,
    tools: bundleJson.tools,
    requirements: bundleJson.requirements
  },
  keywords: bundleJson.keywords,
  examples: bundleJson.examples
};

fs.writeFileSync(
  path.join(bundleDir, 'manifest.json'),
  JSON.stringify(manifest, null, 2)
);

// Create installation script
const installScript = `#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Installing MonarchMoney MCP Server...');

// Install dependencies
console.log('📦 Installing dependencies...');
try {
  execSync('npm install --production --silent', { stdio: 'inherit' });
  console.log('✅ Dependencies installed successfully');
} catch (error) {
  console.error('❌ Failed to install dependencies:', error.message);
  process.exit(1);
}

console.log('\\n🎉 MonarchMoney MCP Server installed successfully!');
console.log('\\n📋 Next steps:');
console.log('1. Copy .env.example to .env and configure your MonarchMoney credentials');
console.log('2. Add this server to your Claude Desktop configuration');
console.log('3. Restart Claude Desktop to load the new MCP server');
console.log('\\n📖 See README.md for detailed setup instructions');
`;

fs.writeFileSync(path.join(bundleDir, 'install.js'), installScript);
fs.chmodSync(path.join(bundleDir, 'install.js'), '755');

// Install archiver if not available
try {
  require('archiver');
} catch (error) {
  console.log('📦 Installing archiver dependency...');
  execSync('npm install archiver --no-save', { stdio: 'inherit' });
}

// Create the MCPB archive
console.log('\n📦 Creating MCPB archive...');

const archiver = require('archiver');
const mcpbPath = path.join(outputDir, `${bundleJson.name}-v${bundleJson.version}.mcpb`);

// Ensure output directory exists
fs.mkdirSync(outputDir, { recursive: true });

const output = fs.createWriteStream(mcpbPath);
const archive = archiver('zip', { zlib: { level: 9 } });

archive.on('error', (err) => {
  throw err;
});

archive.pipe(output);

// Add all files from bundle directory
archive.directory(bundleDir, false);

archive.finalize();

output.on('close', () => {
  console.log(`\n✅ MCPB created successfully: ${mcpbPath}`);
  console.log(`📊 Archive size: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
  
  // Clean up temp directory
  fs.rmSync(bundleDir, { recursive: true });
  console.log('🧹 Cleaned up temporary files');
  
  console.log('\n🎉 MCP Bundle ready for distribution!');
  console.log(`📁 Location: ${mcpbPath}`);
});