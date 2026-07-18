declare module 'hello-cpp' {
  interface CppPlugin {
    hello(args: { name: string }): { message: string };
  }
  const plugin: CppPlugin;
  export default plugin;
}
