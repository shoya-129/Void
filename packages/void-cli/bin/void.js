#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath, pathToFileURL } from "url";
import readline from "readline";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cliRoot = path.resolve(__dirname, "..");
const isLocalDev = fs.existsSync(path.join(cliRoot, "../../packages/void-runtime"));
const workspaceDir = isLocalDev ? path.resolve(cliRoot, "../..") : process.cwd();

// ANSI Color formatting codes
const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m"
};

const tick = `\x1b[32m✔\x1b[0m`;
const cross = `\x1b[31m✘\x1b[0m`;
const info = `\x1b[36mℹ\x1b[0m`;
const warning = `\x1b[33m⚠\x1b[0m`;

// Helper to find the root void.config.json by scanning upward
function findConfig(dir) {
  const configPath = path.join(dir, "void.config.json");
  if (fs.existsSync(configPath)) {
    return { configPath, configDir: dir };
  }
  const parent = path.dirname(dir);
  if (parent === dir) {
    return null;
  }
  return findConfig(parent);
}

function runCommand(cmd, options = {}) {
  try {
    execSync(cmd, { stdio: "inherit", ...options });
    return true;
  } catch (error) {
    return false;
  }
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyFolderRecursive(src, dest, replacements = {}) {
  ensureDir(dest);
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      // Avoid copying build output folder back into itself
      if (entry.name === "@void" || entry.name === "@tgrv") {
        continue;
      }
      copyFolderRecursive(srcPath, destPath, replacements);
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      const isBinary = [".wasm", ".png", ".jpg", ".jpeg", ".gif", ".ico"].includes(ext);
      if (isBinary) {
        fs.copyFileSync(srcPath, destPath);
      } else {
        let content = fs.readFileSync(srcPath, "utf8");
        for (const [key, value] of Object.entries(replacements)) {
          content = content.replace(new RegExp(key, "g"), value);
        }
        fs.writeFileSync(destPath, content);
      }
    }
  }
}

const args = process.argv.slice(2);
const command = args[0];

if (!command) {
  console.log(`
${colors.bold}${colors.cyan}Void CLI - WASM Plugin Manager${colors.reset}

${colors.bold}Usage:${colors.reset}
  ${colors.green}void init [path]${colors.reset}              - Initialize a new application project at path (default: .)
  ${colors.green}void create [plugin-path]${colors.reset}     - Create a new Rust or Go plugin project template (default: .)
  ${colors.green}void build [plugin-path]${colors.reset}      - Compile and place builds inside the plugin folder (default: .)
  ${colors.green}void publish [plugin-path]${colors.reset}    - Build and publish the plugin to npm registry (default: .)
  ${colors.green}void add <plugin-name>${colors.reset}        - Add a plugin from registry/local build into application
  ${colors.green}void remove <plugin-name>${colors.reset}     - Remove a plugin from application and configuration
  ${colors.green}void update${colors.reset}                   - Update all installed plugins to their latest versions
  ${colors.green}void view <plugin-name>${colors.reset}       - Inspect an installed plugin and list all its exposed functions
`);
  process.exit(0);
}

// Build core compilation wrapper function to resolve output directory using void.json manifest
function runBuild(pluginPathArg) {
  const absolutePluginDir = path.resolve(process.cwd(), pluginPathArg);
  if (!fs.existsSync(absolutePluginDir)) {
    console.error(`${cross} ${colors.red}Error: Directory does not exist: ${absolutePluginDir}${colors.reset}`);
    process.exit(1);
  }

  // Load and parse void.json manifest file
  const manifestPath = path.join(absolutePluginDir, "void.json");
  if (!fs.existsSync(manifestPath)) {
    console.error(`${cross} ${colors.red}Error: void.json manifest not found at: ${manifestPath}${colors.reset}`);
    process.exit(1);
  }

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch (err) {
    console.error(`${cross} ${colors.red}Error: Failed to parse void.json manifest: ${err.message}${colors.reset}`);
    process.exit(1);
  }

  if (!manifest.name || !manifest.type || !manifest.buildDir) {
    console.error(`${cross} ${colors.red}Error: void.json must specify 'name', 'type', and 'buildDir'${colors.reset}`);
    process.exit(1);
  }

  const pluginName = manifest.name;
  const pluginType = manifest.type;
  const buildDir = manifest.buildDir;
  const buildOutputDir = path.join(absolutePluginDir, buildDir);

  if (pluginType === "sdk") {
    console.log(`\n${info} Packaging SDK '${colors.bold}${pluginName}${colors.reset}' to local build at: ${colors.bold}${buildOutputDir}${colors.reset}`);
    ensureDir(buildOutputDir);
    copyFolderRecursive(absolutePluginDir, buildOutputDir);
    console.log(`${tick} ${colors.green}Successfully completed SDK packaging!${colors.reset}`);
    return buildOutputDir;
  }

  console.log(`\n${info} Compiling plugin '${colors.bold}${pluginName}${colors.reset}'...`);
  let builtWasmPath = null;

  // Rust plugin compilation
  if (pluginType === "rust") {
    console.log(`${info} Running: ${colors.blue}cargo build --target wasm32-unknown-unknown --release${colors.reset}`);
    const compileSuccess = runCommand("cargo build --target wasm32-unknown-unknown --release", { cwd: absolutePluginDir });
    if (!compileSuccess) {
      console.error(`${cross} ${colors.red}Rust compilation failed.${colors.reset}`);
      process.exit(1);
    }

    const targetDir = path.join(absolutePluginDir, "target", "wasm32-unknown-unknown", "release");
    const wasmFiles = fs.readdirSync(targetDir).filter((file) => file.endsWith(".wasm"));
    if (wasmFiles.length === 0) {
      console.error(`${cross} ${colors.red}Could not find compiled .wasm file in Rust target directory${colors.reset}`);
      process.exit(1);
    }
    builtWasmPath = path.join(targetDir, wasmFiles[0]);
  }
  // Go plugin compilation
  else if (pluginType === "go") {
    const outputWasm = path.join(absolutePluginDir, "plugin.wasm");
    console.log(`${info} Running: ${colors.blue}go build -o plugin.wasm${colors.reset}`);
    const compileSuccess = runCommand("go build -o plugin.wasm", {
      cwd: absolutePluginDir,
      env: { ...process.env, GOOS: "wasip1", GOARCH: "wasm" },
    });
    if (!compileSuccess) {
      console.error(`${cross} ${colors.red}Go compilation failed.${colors.reset}`);
      process.exit(1);
    }
    builtWasmPath = outputWasm;
  } else {
    console.error(`${cross} ${colors.red}Unsupported plugin type: '${pluginType}' in void.json${colors.reset}`);
    process.exit(1);
  }

  console.log(`${info} Placing build output to local folder at ${colors.bold}${buildOutputDir}${colors.reset}...`);
  ensureDir(buildOutputDir);

  // Copy WASM
  fs.copyFileSync(builtWasmPath, path.join(buildOutputDir, "plugin.wasm"));

  // Clean up temporary compiled WASM
  if (path.dirname(builtWasmPath) === absolutePluginDir) {
    try {
      fs.unlinkSync(builtWasmPath);
    } catch (e) {
      // Ignore
    }
  }

  // Write package.json if it does not already exist, or check version if it does
  const packageJsonPath = path.join(buildOutputDir, "package.json");
  if (!fs.existsSync(packageJsonPath)) {
    const pkgJson = {
      name: pluginName,
      version: manifest.version || "1.0.0",
      type: "module",
      main: "index.js",
      dependencies: {
        "@tgrv/void-runtime": "^1.0.0",
      },
      publishConfig: {
        access: "public"
      }
    };
    fs.writeFileSync(packageJsonPath, JSON.stringify(pkgJson, null, 2));
  } else {
    try {
      const existingPkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
      if (existingPkg.version !== manifest.version) {
        console.log(`${info} Version mismatch detected in ${packageJsonPath}. Updating from ${existingPkg.version} to ${manifest.version} to match void.json.`);
        existingPkg.version = manifest.version || "1.0.0";
        fs.writeFileSync(packageJsonPath, JSON.stringify(existingPkg, null, 2));
      }
    } catch (err) {
      console.warn(`${warning} Failed to check/update existing package.json version: ${err.message}`);
    }
  }

  // Generate standard ESM index.js loader
  const indexJsContent = `import { runtime } from "@tgrv/void-runtime";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const plugin = await runtime.load(
  join(__dirname, "plugin.wasm")
);

export default plugin;
`;
  fs.writeFileSync(path.join(buildOutputDir, "index.js"), indexJsContent);
  console.log(`${tick} ${colors.green}Successfully completed compilation & packaging!${colors.reset}`);
  return buildOutputDir;
}

function parsePackageSpec(spec) {
  if (spec.startsWith("@")) {
    const parts = spec.slice(1).split("@");
    const name = "@" + parts[0];
    const version = parts[1] || null;
    return { name, version };
  } else {
    const parts = spec.split("@");
    const name = parts[0];
    const version = parts[1] || null;
    return { name, version };
  }
}

function runAdd(pluginNameInput, appDir) {
  const configInfo = findConfig(appDir);
  if (!configInfo) {
    console.error(`${cross} ${colors.red}Error: void.config.json not found. Run 'void init' first.${colors.reset}`);
    process.exit(1);
  }

  const { name: pluginName, version: requestedVersion } = parsePackageSpec(pluginNameInput);
  const config = JSON.parse(fs.readFileSync(configInfo.configPath, "utf8"));
  
  // Look up local build directory
  let localBuildDir = null;

  const scanLocations = [
    path.join(workspaceDir, "plugins"),
    path.join(workspaceDir, "packages"),
    path.join(workspaceDir, "sdk")
  ];

  for (const root of scanLocations) {
    if (fs.existsSync(root)) {
      const subdirs = fs.readdirSync(root);
      for (const subdir of subdirs) {
        const pPath = path.join(root, subdir);
        if (fs.statSync(pPath).isDirectory()) {
          // Scans nested scopes (e.g. plugins/math/@tgrv/void-math)
          const entries = fs.readdirSync(pPath);
          for (const entry of entries) {
            if (entry.startsWith("@")) {
              const scopePath = path.join(pPath, entry);
              const subfolders = fs.readdirSync(scopePath);
              for (const name of subfolders) {
                const pkgPath = path.join(scopePath, name, "package.json");
                if (fs.existsSync(pkgPath)) {
                  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
                  if (pkg.name === pluginName) {
                    localBuildDir = path.join(scopePath, name);
                    break;
                  }
                }
              }
            }
            if (localBuildDir) break;
          }
        }
        if (localBuildDir) break;
      }
    }
    if (localBuildDir) break;
  }

  const targetPluginDir = path.join(appDir, "node_modules", pluginName);
  ensureDir(path.dirname(targetPluginDir));

  let resolvedVersion = "1.0.0";

  if (localBuildDir) {
    console.log(`${info} Installing local build of '${colors.bold}${pluginName}${colors.reset}' from ${localBuildDir} to ${targetPluginDir}...`);
    if (fs.existsSync(targetPluginDir)) {
      fs.rmSync(targetPluginDir, { recursive: true, force: true });
    }
    copyFolderRecursive(localBuildDir, targetPluginDir);

    try {
      const localPkgPath = path.join(localBuildDir, "package.json");
      if (fs.existsSync(localPkgPath)) {
        const localPkg = JSON.parse(fs.readFileSync(localPkgPath, "utf8"));
        resolvedVersion = localPkg.version || "1.0.0";
      }
    } catch (e) {}
  } else {
    console.log(`${info} Installing '${colors.bold}${pluginNameInput}${colors.reset}' from NPM registry...`);
    const npmSuccess = runCommand(`npm install ${pluginNameInput}`, { cwd: appDir });
    if (!npmSuccess) {
      console.error(`${cross} ${colors.red}Error: Failed to install package '${pluginNameInput}' via npm.${colors.reset}`);
      process.exit(1);
    }

    try {
      const installedPkgPath = path.join(appDir, "node_modules", pluginName, "package.json");
      if (fs.existsSync(installedPkgPath)) {
        const installedPkg = JSON.parse(fs.readFileSync(installedPkgPath, "utf8"));
        resolvedVersion = installedPkg.version || "1.0.0";
      }
    } catch (e) {}
  }

  // Update package.json of the application
  const pkgPath = path.join(appDir, "package.json");
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    pkg.dependencies = pkg.dependencies || {};
    pkg.dependencies[pluginName] = `^${resolvedVersion}`;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
  }

  // Update void.config.json
  config.plugins = config.plugins || {};
  config.plugins[pluginName] = `^${resolvedVersion}`;
  fs.writeFileSync(configInfo.configPath, JSON.stringify(config, null, 2));

  console.log(`${tick} ${colors.green}Successfully added '${pluginName}' (version ^${resolvedVersion})!${colors.reset}\n`);
}

function runUpdate(appDir) {
  const configInfo = findConfig(appDir);
  if (!configInfo) {
    console.error(`${cross} ${colors.red}Error: void.config.json not found. Run 'void init' first.${colors.reset}`);
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(configInfo.configPath, "utf8"));
  const plugins = config.plugins || {};
  const pluginNames = Object.keys(plugins);

  if (pluginNames.length === 0) {
    console.log(`${info} No plugins configured to update.`);
    return;
  }

  console.log(`\n${info} Updating plugins to latest versions...`);
  for (const name of pluginNames) {
    runAdd(`${name}@latest`, appDir);
  }
  console.log(`${tick} ${colors.green}All plugins updated successfully!${colors.reset}\n`);
}


async function main() {
  switch (command) {
    case "init": {
      const targetPathArg = args[1] || ".";
      const targetDir = path.resolve(process.cwd(), targetPathArg);
      ensureDir(targetDir);

      console.log(`\n${info} Initializing Void project at: ${colors.bold}${targetDir}${colors.reset}`);

      const hasExistingPkg = fs.existsSync(path.join(targetDir, "package.json"));

      // Initialize package.json if not exists
      const pkgPath = path.join(targetDir, "package.json");
      if (!hasExistingPkg) {
        const defaultPkg = {
          name: path.basename(targetDir),
          version: "1.0.0",
          type: "module",
          dependencies: {},
        };
        fs.writeFileSync(pkgPath, JSON.stringify(defaultPkg, null, 2));
      }

      // Initialize void.config.json
      const configPath = path.join(targetDir, "void.config.json");
      if (!fs.existsSync(configPath)) {
        const config = {
          registry: "./registry",
          plugins: {},
        };
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      }

      // If it's a fresh project, write default app.js
      if (!hasExistingPkg) {
        const appPath = path.join(targetDir, "app.js");
        if (!fs.existsSync(appPath)) {
          const appContent = `import math from "@tgrv/void-math";

console.log("=== Void Application ===");

try {
  console.log("Math sum (40 + 2):", math.add({ a: 40, b: 2 }));
} catch (e) {
  console.error("Error running application:", e.message);
}
`;
          fs.writeFileSync(appPath, appContent);
        }
      }

      // Install void-runtime via NPM
      console.log(`${info} Running: ${colors.blue}npm install @tgrv/void-runtime${colors.reset}`);
      const npmSuccess = runCommand("npm install @tgrv/void-runtime", { cwd: targetDir });
      if (!npmSuccess) {
        console.error(`${cross} ${colors.red}Failed to install @tgrv/void-runtime via npm.${colors.reset}`);
      }

      // If it's a fresh project, also install @tgrv/void-math using the shared installer logic
      if (!hasExistingPkg) {
        runAdd("@tgrv/void-math", targetDir);
      }

      console.log(`${tick} ${colors.green}Successfully initialized Void project!${colors.reset}`);
      if (!hasExistingPkg) {
        console.log(`\nTo run the starter app, execute:`);
        console.log(`  ${colors.cyan}node app.js${colors.reset}\n`);
      } else {
        console.log(`\nTo add plugins, you can run:`);
        console.log(`  ${colors.cyan}npx void add <plugin-name>${colors.reset}\n`);
      }
      break;
    }

    case "create": {
      const pluginPathArg = args[1] || ".";
      const targetDir = path.resolve(process.cwd(), pluginPathArg);
      const folderName = path.basename(targetDir);

      // Prompt for language
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      const rawLanguage = await new Promise((resolve) => {
        rl.question(`${info} Select plugin language (go/rust) [default: rust]: `, (ans) => {
          resolve(ans.trim().toLowerCase() || "rust");
        });
      });
      rl.close();

      if (rawLanguage !== "rust" && rawLanguage !== "go") {
        console.error(`${cross} ${colors.red}Error: Unsupported language: ${rawLanguage}${colors.reset}`);
        process.exit(1);
      }

      if (rawLanguage === "rust") {
        // Verify Cargo
        const cargoCheck = runCommand("cargo --version");
        if (!cargoCheck) {
          console.error(`\n${cross} ${colors.red}Error: 'rustc' or 'cargo' is not installed on your machine.${colors.reset}`);
          console.error(`${colors.yellow}Please install Rust from https://rustup.rs/ first.${colors.reset}\n`);
          process.exit(1);
        }

        console.log(`${info} Creating Rust plugin template at ${colors.bold}${targetDir}${colors.reset}...`);
        ensureDir(targetDir);
        const templateSrc = path.join(cliRoot, "templates", "rust");
        copyFolderRecursive(templateSrc, targetDir, {
          "\\{\\{name\\}\\}": folderName,
          "\\{\\{type\\}\\}": "rust",
          "\\{\\{workspace_dir\\}\\}": workspaceDir.replace(/\\/g, "/"),
        });
      } else {
        // Verify Go
        const goCheck = runCommand("go version");
        if (!goCheck) {
          console.error(`\n${cross} ${colors.red}Error: 'go' is not installed on your machine.${colors.reset}`);
          console.error(`${colors.yellow}Please install Go from https://go.dev/doc/install first.${colors.reset}\n`);
          process.exit(1);
        }

        console.log(`${info} Creating Go plugin template at ${colors.bold}${targetDir}${colors.reset}...`);
        ensureDir(targetDir);
        const templateSrc = path.join(cliRoot, "templates", "go");
        copyFolderRecursive(templateSrc, targetDir, {
          "\\{\\{name\\}\\}": folderName,
          "\\{\\{type\\}\\}": "go",
          "\\{\\{workspace_dir\\}\\}": workspaceDir.replace(/\\/g, "/"),
        });
      }

      console.log(`${tick} ${colors.green}Plugin created successfully under '${pluginPathArg}'!${colors.reset}`);
      console.log(`${info} ${colors.yellow}Reminder: Make sure to include build directories in your main .gitignore to avoid committing builds (e.g., add **/@void/ and **/@tgrv/).${colors.reset}\n`);
      break;
    }

    case "build": {
      const pluginPathArg = args[1] || ".";
      runBuild(pluginPathArg);
      break;
    }

    case "publish": {
      const pluginPathArg = args[1] || ".";
      // 1. Run build
      const buildOutputDir = runBuild(pluginPathArg);

      // 2. Call npm publish --access public inside the output build folder
      console.log(`\n${info} Running 'npm publish --access public' inside: ${colors.bold}${buildOutputDir}${colors.reset}`);
      const publishSuccess = runCommand("npm publish --access public", { cwd: buildOutputDir });
      if (!publishSuccess) {
        console.log(`\n${warning} ${colors.yellow}NPM publish failed or completed as dry run (check NPM login credentials).${colors.reset}`);
      } else {
        console.log(`${tick} ${colors.green}Successfully published package to NPM!${colors.reset}\n`);
      }
      break;
    }

    case "add": {
      const pluginName = args[1];
      if (!pluginName) {
        console.error(`${cross} ${colors.red}Error: Please specify the plugin to add. e.g. void add @tgrv/void-math${colors.reset}`);
        process.exit(1);
      }
      runAdd(pluginName, process.cwd());
      break;
    }

    case "remove": {
      const pluginName = args[1];
      if (!pluginName) {
        console.error(`${cross} ${colors.red}Error: Please specify the plugin to remove. e.g. void remove @tgrv/void-math${colors.reset}`);
        process.exit(1);
      }

      const configInfo = findConfig(process.cwd());
      if (!configInfo) {
        console.error(`${cross} ${colors.red}Error: void.config.json not found.${colors.reset}`);
        process.exit(1);
      }

      const config = JSON.parse(fs.readFileSync(configInfo.configPath, "utf8"));
      
      console.log(`${info} Removing '${colors.bold}${pluginName}${colors.reset}'...`);
      
      // Run npm uninstall
      const npmSuccess = runCommand(`npm uninstall ${pluginName}`, { cwd: process.cwd() });
      if (!npmSuccess) {
        console.error(`${cross} ${colors.red}Error: Failed to uninstall package '${pluginName}' via npm.${colors.reset}`);
      }

      // Explicitly delete folder from node_modules if it exists
      const targetPluginDir = path.join(process.cwd(), "node_modules", pluginName);
      if (fs.existsSync(targetPluginDir)) {
        fs.rmSync(targetPluginDir, { recursive: true, force: true });
      }

      // Update package.json of the application
      const pkgPath = path.join(process.cwd(), "package.json");
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
        if (pkg.dependencies && pkg.dependencies[pluginName]) {
          delete pkg.dependencies[pluginName];
          fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
        }
      }

      // Update void.config.json
      if (config.plugins && config.plugins[pluginName]) {
        delete config.plugins[pluginName];
        fs.writeFileSync(configInfo.configPath, JSON.stringify(config, null, 2));
      }

      console.log(`${tick} ${colors.green}Successfully removed '${pluginName}'!${colors.reset}\n`);
      break;
    }

    case "update": {
      runUpdate(process.cwd());
      break;
    }

    case "view": {
      const pluginName = args[1];
      if (!pluginName) {
        console.error(`${cross} ${colors.red}Error: Please specify the plugin to view, e.g. void view @tgrv/void-math${colors.reset}`);
        process.exit(1);
      }

      const configInfo = findConfig(process.cwd());
      if (!configInfo) {
        console.error(`${cross} ${colors.red}Error: void.config.json not found.${colors.reset}`);
        process.exit(1);
      }

      const pluginDir = path.join(process.cwd(), "node_modules", pluginName);
      if (!fs.existsSync(pluginDir)) {
        console.error(`${cross} ${colors.red}Error: Plugin '${pluginName}' is not installed in this project.${colors.reset}`);
        process.exit(1);
      }

      const wasmPath = path.join(pluginDir, "plugin.wasm");
      if (!fs.existsSync(wasmPath)) {
        console.error(`${cross} ${colors.red}Error: WASM binary not found at: ${wasmPath}${colors.reset}`);
        process.exit(1);
      }

      // Dynamically load the plugin and query its functions
      try {
        const runtimePath = path.join(process.cwd(), "node_modules", "@tgrv", "void-runtime", "index.js");
        const { runtime } = await import(pathToFileURL(path.resolve(runtimePath)).toString());
        const plugin = await runtime.load(wasmPath);
        
        // Query reflected functions list
        const functions = plugin.callInternal("__list_functions__", {});
        
        console.log(`\n${colors.bold}${colors.magenta}=========================================${colors.reset}`);
        console.log(`${colors.bold}${colors.cyan}Plugin '${pluginName}' Details:${colors.reset}`);
        console.log(`${colors.bold}${colors.magenta}=========================================${colors.reset}`);
        console.log(`${colors.bold}Location:${colors.reset}  ${pluginDir}`);
        console.log(`${colors.bold}Functions:${colors.reset}`);
        if (Array.isArray(functions) && functions.length > 0) {
          for (const f of functions) {
            console.log("  " + tick + " " + f);
          }
        } else {
          console.log(`  (no functions registered)`);
        }
        console.log(`${colors.bold}${colors.magenta}=========================================${colors.reset}\n`);
      } catch (err) {
        console.error(`${cross} ${colors.red}Error loading plugin details: ${err.message}${colors.reset}`);
        process.exit(1);
      }
      break;
    }

    default:
      console.error(`${cross} ${colors.red}Unknown command: ${command}${colors.reset}`);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error("CLI error:", err);
  process.exit(1);
});
