const os = require('os');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { getCacheDir } = require('../../database/settings');

// Helper to run commands asynchronously with timeout
function runCommand(cmd, args, timeoutMs = 30000) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    let stdout = '';
    let stderr = '';
    let resolved = false;

    const child = spawn(cmd, args);

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        child.kill('SIGKILL');
        resolve({
          success: false,
          exitCode: null,
          signal: 'SIGKILL',
          stdout,
          stderr: stderr + `\n[Timeout] Execution exceeded ${timeoutMs}ms`,
          elapsedTimeMs: Date.now() - startTime
        });
      }
    }, timeoutMs);

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve({
          success: false,
          error: err.message,
          exitCode: null,
          signal: null,
          stdout,
          stderr: stderr + `\n[Spawn Error] ${err.message}`,
          elapsedTimeMs: Date.now() - startTime
        });
      }
    });

    child.on('close', (code, signal) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve({
          success: code === 0,
          exitCode: code,
          signal,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          elapsedTimeMs: Date.now() - startTime
        });
      }
    });
  });
}

// Redact sensitive environment variables
function getRedactedEnv() {
  const env = {};
  const sensitiveKeywords = ['key', 'secret', 'pass', 'token', 'cookie', 'auth', 'uri', 'url', 'password'];
  for (const [k, v] of Object.entries(process.env)) {
    const isSensitive = sensitiveKeywords.some(keyword => k.toLowerCase().includes(keyword));
    env[k] = isSensitive ? '[REDACTED]' : v;
  }
  return env;
}

// Cross-platform disk check
function getDiskSpace() {
  return new Promise((resolve) => {
    const cmd = process.platform === 'win32' 
      ? 'wmic logicaldisk get caption,freespace,size' 
      : 'df -h .';
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        resolve({ error: err.message, stderr: stderr.trim() });
      } else {
        resolve(stdout.trim());
      }
    });
  });
}

// API: GET /api/debug/environment
const getEnvironment = async (req, res) => {
  const correlationId = req.headers['x-correlation-id'] || req.headers['x-request-id'] || `debug-env-${Math.random().toString(36).substring(2, 9)}`;
  console.log(`[DEBUG] [${correlationId}] Gathering environment information...`);

  // Query binary versions
  const pythonCheck = await runCommand('python', ['--version']);
  const python3Check = !pythonCheck.success ? await runCommand('python3', ['--version']) : null;
  const pythonResult = pythonCheck.success ? pythonCheck.stdout : (python3Check && python3Check.success ? python3Check.stdout : 'Not found');

  const ytdlpCheck = await runCommand('python', ['-m', 'yt_dlp', '--version']);
  const ytdlpStandaloneCheck = !ytdlpCheck.success ? await runCommand('yt-dlp', ['--version']) : null;
  const ytdlpResult = ytdlpCheck.success ? ytdlpCheck.stdout : (ytdlpStandaloneCheck && ytdlpStandaloneCheck.success ? ytdlpStandaloneCheck.stdout : 'Not found');

  const denoCheck = await runCommand('deno', ['--version']);
  const ffmpegCheck = await runCommand('ffmpeg', ['-version']);
  const ffprobeCheck = await runCommand('ffprobe', ['-version']);

  // Check cache path permissions
  let cacheDirStatus = { path: null, exists: false, writable: false, error: null };
  try {
    const cacheDir = await getCacheDir();
    cacheDirStatus.path = cacheDir;
    cacheDirStatus.exists = fs.existsSync(cacheDir);
    if (cacheDirStatus.exists) {
      const testFile = path.join(cacheDir, `.test-write-${Date.now()}`);
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      cacheDirStatus.writable = true;
    }
  } catch (err) {
    cacheDirStatus.error = err.message;
  }

  // Disk space
  const diskSpace = await getDiskSpace();

  // OS stats
  const cpus = os.cpus();
  const memoryInfo = {
    total: Math.round(os.totalmem() / 1024 / 1024) + ' MB',
    free: Math.round(os.freemem() / 1024 / 1024) + ' MB',
    processMemory: process.memoryUsage()
  };

  const response = {
    correlationId,
    timestamp: new Date().toISOString(),
    system: {
      platform: process.platform,
      osType: os.type(),
      osRelease: os.release(),
      arch: os.arch(),
      cwd: process.cwd(),
      userInfo: os.userInfo(),
      cpusCount: cpus.length,
      cpuModel: cpus.length > 0 ? cpus[0].model : 'Unknown',
      memory: memoryInfo,
      disk: diskSpace
    },
    binaries: {
      node: process.version,
      python: pythonResult,
      ytdlp: ytdlpResult,
      deno: denoCheck.success ? denoCheck.stdout.split('\n')[0] : 'Not found',
      ffmpeg: ffmpegCheck.success ? ffmpegCheck.stdout.split('\n')[0] : 'Not found',
      ffprobe: ffprobeCheck.success ? ffprobeCheck.stdout.split('\n')[0] : 'Not found'
    },
    cacheDir: cacheDirStatus,
    environmentVariables: getRedactedEnv()
  };

  res.json(response);
};

// API: GET /api/debug/yt-dlp-diagnostic
const getYtDlpDiagnostic = async (req, res) => {
  const correlationId = req.headers['x-correlation-id'] || req.headers['x-request-id'] || `debug-ytdlp-${Math.random().toString(36).substring(2, 9)}`;
  const videoId = req.query.videoId || 'dQw4w9WgXcQ'; // Fallback to Rickroll
  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
  
  console.log(`[DEBUG] [${correlationId}] Launching standalone yt-dlp diagnostic for ${youtubeUrl}`);

  // Construct args manually without cookies/runtimes for the basic test
  // We also try with cookies if config allows
  const runTest = async (withCookies) => {
    let args = ['-m', 'yt_dlp', '-vU', '--get-url', '--skip-download', youtubeUrl];
    if (withCookies) {
      const localCookiesPath = path.join(__dirname, '..', '..', 'cookies.txt');
      if (fs.existsSync(localCookiesPath)) {
        args.push('--cookies', localCookiesPath);
      }
    }
    
    const startTime = Date.now();
    const result = await runCommand('python', args);
    const endTime = Date.now();

    return {
      withCookies,
      command: `python ${args.join(' ')}`,
      success: result.success,
      exitCode: result.exitCode,
      signal: result.signal,
      elapsedTimeMs: endTime - startTime,
      stdout: result.stdout,
      stderr: result.stderr,
      error: result.error
    };
  };

  try {
    const noCookiesTest = await runTest(false);
    const cookiesTest = fs.existsSync(path.join(__dirname, '..', '..', 'cookies.txt')) 
      ? await runTest(true) 
      : { message: 'cookies.txt not found, skipped cookies test' };

    res.json({
      correlationId,
      timestamp: new Date().toISOString(),
      videoId,
      youtubeUrl,
      diagnostics: {
        noCookiesTest,
        cookiesTest
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
      correlationId
    });
  }
};

module.exports = {
  getEnvironment,
  getYtDlpDiagnostic
};
