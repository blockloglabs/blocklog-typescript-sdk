# Installation Guide

This guide covers installing and setting up the Blocklog TypeScript SDK.

## Prerequisites

- Node.js 18+ or newer
- npm or yarn package manager
- A Blocklog API key (get one at [base_url](base_url))

## Installation

### npm

```bash
npm install @blocklog/sdk
```

### yarn

```bash
yarn add @blocklog/sdk
```

### pnpm

```bash
pnpm add @blocklog/sdk
```

## Setup

### Basic Setup

```typescript
import { BlocklogClient } from '@blocklog/sdk';

const client = new BlocklogClient({
  apiKey: 'your-api-key',
});
```

### Environment Variables

Create a `.env` file:

```env
BLOCKLOG_API_KEY=your-api-key
BLOCKLOG_ENDPOINT=base_url
BLOCKLOG_BATCH_SIZE=100
BLOCKLOG_FLUSH_INTERVAL=5000
BLOCKLOG_ENABLE_SIGNING=true
BLOCKLOG_DEBUG=false
```

Then use it in your code:

```typescript
import { BlocklogClient } from '@blocklog/sdk';

const client = new BlocklogClient({
  // API key will be loaded from BLOCKLOG_API_KEY environment variable
});
```

### TypeScript Configuration

The SDK is written in TypeScript and includes full type definitions. Ensure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true
  }
}
```

## Verification

Test your installation with a simple script:

```typescript
import { BlocklogClient } from '@blocklog/sdk';

const client = new BlocklogClient({ apiKey: 'your-api-key' });

async function test() {
  try {
    await client.event('TEST_EVENT', { message: 'Installation successful' });
    console.log('✓ Blocklog SDK is working');
    await client.shutdown();
  } catch (error) {
    console.error('✗ Installation failed:', error);
  }
}

test();
```

## Next Steps

- [Quick Start Guide](quickstart.md) - Get started with basic usage
- [Configuration](configuration.md) - Advanced configuration options
- [Architecture](architecture.md) - Understand the SDK architecture
- [Feature Guides](guides/) - Explore specific features
- [Integration Guides](integrations/) - Integrate with popular frameworks

## Troubleshooting

### Common Issues

**Import errors:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**TypeScript errors:**
- Ensure you're using Node.js 18+
- Check your `tsconfig.json` configuration
- Make sure you have the latest TypeScript version

**API key errors:**
- Verify your API key is correct
- Check that your API key has the necessary permissions
- Ensure you're using the correct endpoint

### Getting Help

- Check the [GitHub Issues](https://github.com/blockloglabs/blocklog-typescript/issues)
- Email founder@blocklogsecurity.com
- Join our [Discord community](https://discord.gg/blocklog)
