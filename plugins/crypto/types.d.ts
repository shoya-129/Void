declare module '@voidwasm/crypto' {
  interface CryptoPlugin {
    hash_chain(args: { input: string; iterations: number }): string;
  }
  const crypto: CryptoPlugin;
  export default crypto;
}
