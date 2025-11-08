#!/usr/bin/env node

/**
 * Electron Development Script
 *
 * This script provides hot-reload development mode for Electron applications.
 * It automatically builds Electron dependencies, starts the Remix development server,
 * and launches the Electron application with hot-reload capabilities.
 */

import { spawn, exec } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants
const REMIX_PORT = 5173;
const CHECK_INTERVAL = 1000;
const MAX_RETRIES = 30;

// Set environment variables
process.env.NODE_ENV = 'development';

console.log('🚀 Starting Electron hot-reload development mode...');
console.log('🔧 Environment:', process.env.NODE_ENV);

let electronProcess = null;
let remixProcess = null;

/**
 * Cleanup function to gracefully shutdown all processes
 */
function cleanup() {
  console.log('\n🛑 Shutting down all processes...');

  if (electronProcess) {
    electronProcess.kill('SIGTERM');
  }

  if (remixProcess) {
    remixProcess.kill('SIGTERM');
  }

  process.exit(0);
}

// Handle process exit signals
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

/**
 * Wait for a server to start on the specified port
 * @param {number} port - Port number to check
 * @param {string} serverName - Name of the server for logging
 * @returns {Promise<void>}
 */
async function waitForServer(port, serverName) {
  return new Promise((resolve, reject) => {
    let retries = 0;

    const checkServer = () => {
      exec(`lsof -i :${port}`, (error, stdout) => {
        if (stdout) {
          console.log(`✅ ${serverName} started`);
          resolve();
        } else if (retries >= MAX_RETRIES) {
          reject(new Error(`Timeout waiting for ${serverName} to start`));
        } else {
          retries++;
          setTimeout(checkServer, CHECK_INTERVAL);
        }
      });
    };

    checkServer();
  });
}

/**
 * Build Electron dependencies
 * @returns {Promise<void>}
 */
async function buildElectronDeps() {
  return new Promise((resolve, reject) => {
    console.log('📦 Building Electron dependencies...');
    const buildProcess = spawn('pnpm', ['electron:build:deps'], {
      stdio: 'inherit',
      env: { ...process.env },
    });

    buildProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Electron dependencies built successfully');
        resolve();
      } else {
        console.error('');
        console.error('❌ Build failed with exit code:', code);
        console.error('');
        console.error('💡 Troubleshooting:');
        console.error('   1. Check if all dependencies are installed: pnpm install');
        console.error('   2. Verify build scripts in package.json');
        console.error('   3. Check for TypeScript or build errors above');
        console.error('');
        reject(new Error(`Build failed with exit code: ${code}. See error messages above for details.`));
      }
    });

    buildProcess.on('error', (error) => {
      console.error('');
      console.error('❌ Build process error:', error.message);
      console.error('');
      console.error('💡 Troubleshooting:');
      console.error('   1. Make sure pnpm is installed: npm install -g pnpm');
      console.error('   2. Check if the "electron:build:deps" script exists in package.json');
      console.error('   3. Verify you have write permissions in the project directory');
      console.error('');
      reject(new Error(`Build process error: ${error.message}. See troubleshooting tips above.`));
    });
  });
}

/**
 * Main function to start Electron development mode
 * @returns {Promise<void>}
 */
async function startElectronDev() {
  try {
    // 1. Build Electron dependencies first
    console.log('📦 Building Electron dependencies...');
    await buildElectronDeps();

    // 2. Start Remix development server
    console.log('🌐 Starting Remix development server...');
    remixProcess = spawn('pnpm', ['dev'], {
      stdio: 'pipe',
      env: { ...process.env },
    });

    remixProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`[Remix] ${output.trim()}`);
    });

    remixProcess.stderr.on('data', (data) => {
      console.error(`[Remix Error] ${data.toString().trim()}`);
    });

    // Wait for Remix server to start
    await waitForServer(REMIX_PORT, 'Remix development server');

    // 3. Start Electron application
    console.log('⚡ Starting Electron application...');

    const electronPath = path.join(__dirname, '..', 'node_modules', '.bin', 'electron');
    const mainPath = path.join(__dirname, '..', 'build', 'electron', 'main', 'index.mjs');

    // Check if main process file exists
    if (!fs.existsSync(mainPath)) {
      console.error(`❌ Main process file not found: ${mainPath}`);
      console.error('');
      console.error('💡 Recovery steps:');
      console.error('   1. Run "pnpm electron:build:deps" to build Electron dependencies');
      console.error('   2. Make sure the build completed successfully');
      console.error('   3. Check that the file exists at the expected path');
      console.error('');
      console.error('📝 Expected build output location:');
      console.error(`   ${mainPath}`);
      console.error('');
      throw new Error(`Main process file not found: ${mainPath}. Please run "pnpm electron:build:deps" first.`);
    }

    electronProcess = spawn(electronPath, [mainPath], {
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'development',
        ELECTRON_IS_DEV: '1',
      },
    });

    electronProcess.on('error', (error) => {
      console.error('❌ Failed to start Electron:', error);
      cleanup();
    });

    electronProcess.on('exit', (code) => {
      console.log(`📱 Electron process exited with code: ${code}`);

      if (code !== 0) {
        cleanup();
      }
    });

    console.log('🎉 Electron hot-reload development mode started!');
    console.log('💡 Code changes will automatically reload');
    console.log('🛑 Press Ctrl+C to exit');
  } catch (error) {
    console.error('❌ Startup failed:', error.message);
    cleanup();
  }
}

// Start development mode
startElectronDev();
