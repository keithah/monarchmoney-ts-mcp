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

// Copy node_modules dependencies
console.log('📦 Installing dependencies for MCPB...');
const nodeModulesSource = path.join(__dirname, '..', 'node_modules');
const nodeModulesDest = path.join(bundleDir, 'node_modules');

if (fs.existsSync(nodeModulesSource)) {
  // Create a production install for the bundle
  const tempPackageJson = {
    name: packageJson.name,
    version: packageJson.version,
    dependencies: packageJson.dependencies,
    engines: packageJson.engines
  };

  fs.writeFileSync(
    path.join(bundleDir, 'package.json'),
    JSON.stringify(tempPackageJson, null, 2)
  );

  // Handle local monarchmoney dependency
  const monarchmoneySource = path.join(__dirname, '../../monarchmoney-ts');
  if (fs.existsSync(monarchmoneySource)) {
    // Copy built monarchmoney package directly
    const monarchmoneyDest = path.join(bundleDir, 'node_modules', 'monarchmoney');
    fs.mkdirSync(path.dirname(monarchmoneyDest), { recursive: true });
    execSync(`cp -r "${monarchmoneySource}/dist" "${monarchmoneyDest}/"`, { stdio: 'pipe' });
    execSync(`cp "${monarchmoneySource}/package.json" "${monarchmoneyDest}/"`, { stdio: 'pipe' });

    // Update package.json to use standard dependency
    tempPackageJson.dependencies.monarchmoney = "^1.0.2";
    fs.writeFileSync(
      path.join(bundleDir, 'package.json'),
      JSON.stringify(tempPackageJson, null, 2)
    );
  }

  // Install production dependencies in bundle directory
  try {
    execSync('npm install --production --no-optional --ignore-scripts', {
      cwd: bundleDir,
      stdio: 'pipe'
    });
    console.log('✅ Dependencies installed successfully');
  } catch (error) {
    console.error('❌ Failed to install dependencies:', error.message);
    process.exit(1);
  }
} else {
  console.warn('⚠️  node_modules not found. Run npm install first.');
  process.exit(1);
}

// Update package.json with additional fields after npm install
const existingPackageJson = JSON.parse(fs.readFileSync(path.join(bundleDir, 'package.json'), 'utf8'));
const bundlePackageJson = {
  ...existingPackageJson,
  description: packageJson.description,
  main: 'index.js',
  bin: {
    [packageJson.name]: 'index.js'
  },
  keywords: packageJson.keywords,
  author: packageJson.author,
  license: packageJson.license
};

fs.writeFileSync(
  path.join(bundleDir, 'package.json'),
  JSON.stringify(bundlePackageJson, null, 2)
);

// Create manifest.json for MCPB compatibility following official spec
const manifest = {
  dxt_version: "0.1",
  name: "monarchmoney-mcp",
  display_name: bundleJson.displayName,
  version: bundleJson.version,
  description: bundleJson.description,
  author: {
    name: "Keith Herrington",
    url: "https://github.com/keithah/monarchmoney-ts-mcp"
  },
  keywords: bundleJson.keywords,
  server: {
    type: "node",
    entry_point: "index.js",
    mcp_config: {
      command: "node",
      args: ["${__dirname}/index.js"],
      env: {
        MONARCH_EMAIL: "${user_config.MONARCH_EMAIL}",
        MONARCH_PASSWORD: "${user_config.MONARCH_PASSWORD}",
        MONARCH_MFA_SECRET: "${user_config.MONARCH_MFA_SECRET}"
      }
    }
  },
  tools_generated: true,
  compatibility: {
    claude_desktop: ">=0.10.0",
    platforms: ["darwin", "win32", "linux"],
    runtimes: {
      node: ">=18.0.0"
    }
  },
  user_config: {
    MONARCH_EMAIL: {
      type: "string",
      title: "MonarchMoney Email",
      description: "Your MonarchMoney email address",
      sensitive: false,
      required: true
    },
    MONARCH_PASSWORD: {
      type: "string",
      title: "MonarchMoney Password",
      description: "Your MonarchMoney password",
      sensitive: true,
      required: true
    },
    MONARCH_MFA_SECRET: {
      type: "string",
      title: "MonarchMoney MFA Secret",
      description: "Your TOTP/MFA secret key (optional)",
      sensitive: true,
      required: false
    }
  },
  license: bundleJson.license
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