# MonarchMoney MCP Server - Installation Guide

## 🚀 One-Click Installation (Recommended)

### Step 1: Download the MCPB Bundle

1. Go to the [Releases page](https://github.com/keithah/monarchmoney-ts-mcp/releases)
2. Download the latest `.mcpb` file (e.g., `monarchmoney-mcp-v1.0.0.mcpb`)

### Step 2: Extract and Install

1. **Extract the bundle:**
   ```bash
   unzip monarchmoney-mcp-v1.0.0.mcpb -d monarchmoney-mcp
   cd monarchmoney-mcp
   ```

2. **Run the installer:**
   ```bash
   node install.js
   ```

3. **Configure credentials:**
   ```bash
   cp .env.example .env
   nano .env  # Edit with your MonarchMoney credentials
   ```

### Step 3: Configure Claude Desktop

Add this to your Claude Desktop configuration file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
**Linux:** `~/.config/claude-desktop/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "monarchmoney": {
      "command": "node",
      "args": ["/full/path/to/monarchmoney-mcp/index.js"],
      "env": {
        "MONARCH_EMAIL": "your-email@example.com",
        "MONARCH_PASSWORD": "your-password",
        "MONARCH_MFA_SECRET": "your-mfa-secret"
      }
    }
  }
}
```

### Step 4: Restart Claude Desktop

Restart Claude Desktop to load the new MCP server.

## 🛠️ Manual Installation (Alternative)

### Prerequisites

- Node.js 18.0.0 or higher
- npm (comes with Node.js)
- MonarchMoney account

### Step 1: Clone Repository

```bash
git clone https://github.com/keithah/monarchmoney-ts-mcp.git
cd monarchmoney-ts-mcp
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Build the Project

```bash
npm run build
```

### Step 4: Configure Environment

```bash
cp .env.example .env
# Edit .env with your MonarchMoney credentials
```

### Step 5: Test the Server

```bash
npm start
# Test with: node test-mcp.js
```

### Step 6: Configure Claude Desktop

Follow Step 3 from the one-click installation above.

## 🔐 Credential Configuration

### Required Environment Variables

- `MONARCH_EMAIL`: Your MonarchMoney email address
- `MONARCH_PASSWORD`: Your MonarchMoney password
- `MONARCH_MFA_SECRET`: Your TOTP/MFA secret key (optional)

### Getting Your MFA Secret

1. Log into MonarchMoney
2. Go to Security Settings
3. Enable Two-Factor Authentication
4. When setting up your authenticator app, copy the secret key
5. Use this key as your `MONARCH_MFA_SECRET`

## 🧪 Testing the Installation

### Test 1: Server Startup

```bash
node test-mcp.js
```

You should see:
```
✅ MCP Server test completed successfully!
```

### Test 2: Claude Desktop Integration

1. Open Claude Desktop
2. Look for the MonarchMoney server in the status
3. Try asking: "What accounts do I have?"

## 🔧 Troubleshooting

### Common Issues

#### "Module not found" Error

```bash
# Re-install dependencies
rm -rf node_modules package-lock.json
npm install
```

#### "Authentication failed" Error

1. Check your credentials in `.env`
2. Verify your MonarchMoney account is accessible
3. Test MFA secret if using 2FA

#### "Command not found" Error

1. Use full path in Claude Desktop config
2. Ensure Node.js is installed and in PATH

### Debug Mode

Set environment variable for detailed logging:

```bash
export LOG_LEVEL=debug
node index.js
```

## 📁 File Structure

```
monarchmoney-mcp/
├── index.js              # Main MCP server
├── package.json          # Dependencies and scripts
├── bundle.json           # MCP bundle metadata
├── install.js            # Installation script
├── .env.example          # Environment template
├── README.md             # Documentation
├── LICENSE               # MIT license
```

## 🚀 Usage Examples

Once installed, you can ask Claude:

- "What's my current net worth?"
- "Show me my spending on restaurants this month"
- "Which accounts have the highest balances?"
- "What are my budget categories?"
- "Show me transactions over $500 last week"

## 📞 Support

- **Issues:** [GitHub Issues](https://github.com/keithah/monarchmoney-ts-mcp/issues)
- **Documentation:** [README.md](README.md)
- **Examples:** [Query Examples](examples/query-examples.md)

---

**Made with ❤️ for the MonarchMoney community**