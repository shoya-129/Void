declare module '@tgrv/void-math' {
  interface MathPlugin {
    add(args: { numbers: number[] } | { a: number; b: number }): number;
    format_message(args: { template: string; value: number }): string;
    count_primes(args: { limit: number }): number;
    nbody(args: { n: number; steps: number }): number;
  }
  const math: MathPlugin;
  export default math;
}
