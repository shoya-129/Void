declare module '@voidwasm/math' {
  interface MathPlugin {
    add(args: { numbers: number[] } | { a: number; b: number }): number;
    format_message(args: { template: string; value: number }): string;
    count_primes(args: { limit: number }): number;
    nbody(args: { n: number; steps: number }): number;
    get_memory_stats(args?: {}): { allocated_objects: number; total_bytes_pinned: number };
    test_mem_pin(args: { data: string }): { ptr: number; size: number };
    test_mem_unpin(args: { ptr: number }): string;
  }
  const math: MathPlugin;
  export default math;
}
