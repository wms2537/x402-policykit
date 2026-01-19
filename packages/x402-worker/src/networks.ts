/**
 * Supported Networks and Token Addresses
 * x402 uses CAIP-2 identifiers: https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-2.md
 */

export interface NetworkConfig {
  /** CAIP-2 identifier (e.g., eip155:84532) */
  caip2: string;
  /** Chain ID number */
  chainId: number;
  /** Human-readable name */
  name: string;
  /** USDC token address */
  usdc: string;
  /** Whether Coinbase facilitator supports this network */
  facilitatorSupported: boolean;
  /** Block explorer URL */
  explorer: string;
  /** Is testnet */
  testnet: boolean;
}

/**
 * Supported networks for x402 payments
 */
export const NETWORKS: Record<string, NetworkConfig> = {
  // Base Sepolia (Coinbase x402 facilitator supported)
  'eip155:84532': {
    caip2: 'eip155:84532',
    chainId: 84532,
    name: 'Base Sepolia',
    usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    facilitatorSupported: true,
    explorer: 'https://sepolia.basescan.org',
    testnet: true,
  },

  // Base Mainnet (Coinbase x402 facilitator supported)
  'eip155:8453': {
    caip2: 'eip155:8453',
    chainId: 8453,
    name: 'Base',
    usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    facilitatorSupported: true,
    explorer: 'https://basescan.org',
    testnet: false,
  },

  // Cronos Mainnet
  'eip155:25': {
    caip2: 'eip155:25',
    chainId: 25,
    name: 'Cronos',
    usdc: '0xc21223249CA28397B4B6541dfFaEcC539BfF0c59',
    facilitatorSupported: false, // Use custom facilitator
    explorer: 'https://cronoscan.com',
    testnet: false,
  },

  // Cronos Testnet
  'eip155:338': {
    caip2: 'eip155:338',
    chainId: 338,
    name: 'Cronos Testnet',
    usdc: '0x6a3173618859C7cd40fAF6921b5E9eB6A76f1fD4', // Test USDC
    facilitatorSupported: false,
    explorer: 'https://testnet.cronoscan.com',
    testnet: true,
  },

  // Ethereum Mainnet
  'eip155:1': {
    caip2: 'eip155:1',
    chainId: 1,
    name: 'Ethereum',
    usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    facilitatorSupported: false,
    explorer: 'https://etherscan.io',
    testnet: false,
  },

  // Solana (for future support)
  'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1': {
    caip2: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
    chainId: 0, // Not applicable for Solana
    name: 'Solana Devnet',
    usdc: 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr', // Devnet USDC
    facilitatorSupported: true,
    explorer: 'https://explorer.solana.com',
    testnet: true,
  },
};

/**
 * Get network config by CAIP-2 identifier
 */
export function getNetworkByCAIP2(caip2: string): NetworkConfig | undefined {
  return NETWORKS[caip2];
}

/**
 * Get network config by chain ID
 */
export function getNetworkByChainId(chainId: number): NetworkConfig | undefined {
  return Object.values(NETWORKS).find(n => n.chainId === chainId);
}

/**
 * Convert chain ID to CAIP-2 identifier
 */
export function chainIdToCAIP2(chainId: number): string {
  return `eip155:${chainId}`;
}

/**
 * Convert CAIP-2 identifier to chain ID (EVM only)
 */
export function caip2ToChainId(network: string): number {
  const match = network.match(/^eip155:(\d+)$/);
  if (!match) throw new Error(`Invalid EVM CAIP-2 identifier: ${network}`);
  return parseInt(match[1], 10);
}

/**
 * Get USDC address for a chain
 */
export function getUsdcAddress(chainId: number): string | undefined {
  const network = getNetworkByChainId(chainId);
  return network?.usdc;
}

/**
 * Check if facilitator is supported for a network
 */
export function isFacilitatorSupported(chainId: number): boolean {
  const network = getNetworkByChainId(chainId);
  return network?.facilitatorSupported ?? false;
}

/**
 * Build explorer transaction URL
 */
export function getExplorerTxUrl(chainId: number, txHash: string): string | undefined {
  const network = getNetworkByChainId(chainId);
  if (!network) return undefined;
  return `${network.explorer}/tx/${txHash}`;
}

/**
 * Build explorer address URL
 */
export function getExplorerAddressUrl(chainId: number, address: string): string | undefined {
  const network = getNetworkByChainId(chainId);
  if (!network) return undefined;
  return `${network.explorer}/address/${address}`;
}
