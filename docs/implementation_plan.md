# Revised Implementation Plan - yt-dlp Observability & Root-Cause Analysis

The objective of this plan is **not to fix the problem immediately**, but to collect sufficient production evidence to isolate the exact reason why `yt-dlp` functions locally but fails on Render. 

---

## 1. Environment Verification & Diagnostics Phase

To isolate system-level variance, we will expose a secure diagnostic endpoint that prints environment details. We will run it in both environments to compile a side-by-side comparison:

| Metric | Local Development | Render Production | Verification Command / API Source |
| :--- | :--- | :--- | :--- |
| **Operating System** | *To be filled* | *To be filled* | `os.type()` / `os.platform()` / `os.release()` |
| **Kernel / Arch** | *To be filled* | *To be filled* | `os.arch()` / `process.arch` |
| **Working Directory**| *To be filled* | *To be filled* | `process.cwd()` |
| **PATH Variable** | *To be filled* | *To be filled* | `process.env.PATH` |
| **Environment Vars** | *To be filled* | *To be filled* | `process.env` (filtered/redacted) |
| **Node Version** | *To be filled* | *To be filled* | `process.version` |
| **Python Version** | *To be filled* | *To be filled* | `python3 --version` or `python --version` |
| **yt-dlp Version** | *To be filled* | *To be filled* | `python3 -m yt_dlp --version` |
| **ffmpeg Version** | *To be filled* | *To be filled* | `ffmpeg -version` |
| **ffprobe Version** | *To be filled* | *To be filled* | `ffprobe -version` |
| **System Memory** | *To be filled* | *To be filled* | `os.totalmem()` / `os.freemem()` / `process.memoryUsage()` |
| **Disk Space** | *To be filled* | *To be filled* | Node `node:fs` space check or shell query (`df -h`) |
| **CPU Info** | *To be filled* | *To be filled* | `os.cpus()` |
| **User/Permissions** | *To be filled* | *To be filled* | `os.userInfo()` |
| **Cache Dir Status** | *To be filled* | *To be filled* | `fs.access` (check read/write/execute flags) |

---

## 2. Health & Diagnostic Endpoints

We will implement two temporary, protected diagnostic routes under `/api/debug`:

### A. `GET /api/debug/environment`
Returns the structural, system, and version metadata described in Section 1. This endpoint will **never** display raw secrets, credentials, or session cookies.

### B. `GET /api/debug/yt-dlp-diagnostic`
Runs a standalone command to bypass Survana's app/routing logic. It queries a known public video (e.g. YouTube ID `dQw4w9WgXcQ` - Rick Astley's "Never Gonna Give You Up"):
```bash
python3 -m yt_dlp -vU "https://www.youtube.com/watch?v=dQw4w9WgXcQ" --get-url --skip-download
```
*   **Captured fields:** Complete stdout, complete stderr, exit code, spawn error exception, elapsed time (ms), signals, and timeout conditions.
*   **Result Matrix:** If this endpoint fails, we immediately isolate the issue to the environment/network level (independent of database or routing bugs).

---

## 3. Debug Mode (`DEBUG_YTDLP=true`)

To prevent logging bloat in production while retaining high-fidelity debugging when needed, we will control log detail using the `DEBUG_YTDLP` environment variable:

```
DEBUG_YTDLP=true  -> Log system metrics, detailed timing, child process arguments, complete stdout, complete stderr, and memory snapshots.
DEBUG_YTDLP=false -> Log only execution summary, errors, exit codes, and timing.
```

---

## 4. Correlation & Tracing Specification

To trace a single audio action from request to backend execution, we will propagate a `correlationId` and `requestId` across the call stack. 

### Trace Sequence:
```
Client HTTP Request -> Express Middleware -> Songs Controller -> getStreamUrl() -> Spawn yt-dlp -> HTTP range fetch -> background download -> Cache Write
```

### Log Schema:
Every log line emitted by the yt-dlp execution helper must output a structured JSON containing:
```json
{
  "timestamp": "2026-08-01T10:31:15.000Z",
  "correlationId": "corr-1af077be-34b1-41a8-ad2c-f1b0e5b804f3",
  "requestId": "req-987654321",
  "videoId": "dQw4w9WgXcQ",
  "endpoint": "/api/songs/stream/dQw4w9WgXcQ",
  "stage": "spawn_ytdlp_process",
  "elapsedTimeMs": 240,
  "payload": { ... }
}
```

---

## 5. Root-Cause Hypothesis Challenge Matrix

Instead of speculating on likelihoods, we will challenge each possible cause with validation criteria:

| Hypothesis | Reason it explains the failure | Confirming Evidence | Eliminating Evidence | Diagnostic Log Point |
| :--- | :--- | :--- | :--- | :--- |
| **Outdated yt-dlp** | YouTube frequently updates signature algorithms. Outdated tools fail signature checks. | Log version < current PyPI release. HTTP 403 or signature cipher fail in stderr. | Log version matches latest release. Successful extraction on target URL. | `ytdlpVersion` in `GET /api/debug/environment`. |
| **Missing ffmpeg / ffprobe** | If media format conversions or metadata reads require binaries not in the path. | `ffmpeg -version` fails to execute or is missing in system path. | Binaries successfully return version strings. | `ffmpegVersion` / `ffprobeVersion` in environment dump. |
| **Render OS/Environment differences** | Discrepancies in library paths, dynamic links, or python runtimes in Docker. | `python -m yt_dlp` errors out immediately with import or execution faults. | Python command initializes successfully and exits with code 0 on help. | Standalone diagnostics execution logs. |
| **Missing Browser/Cookies** | Render lacks GUI browsers; `--cookies-from-browser` will fail. | Stderr contains: "Browser not found" or "Could not extract cookies". | Successful extract without browser flags or with provided `cookies.txt`. | Standalone execution logs with cookies flagged. |
| **PATH Issues** | System fails to resolve `python`, `deno`, or `ffmpeg`. | Child process throws `ENOENT` on spawn. | Child process runs and outputs binary paths. | `PATH` variable logs & spawn process error code. |
| **Permission Issues** | System user lacks execution rights for python/deno or write rights for cache. | Stderr contains "Permission denied" or "EACCES" error thrown. | Subprocesses run and cache files write successfully. | Current user permission log + cache write checks. |
| **Network Restrictions** | Render host blocks outbound requests or DNS lookups to Google Video/YouTube. | Connection timeout, `ETIMEDOUT`, or DNS resolution error in logs. | Successful network responses from YouTube API endpoints. | Outbound fetch timing + stderr network codes. |
| **YouTube Anti-Abuse Blocking** | YouTube blocks Render/AWS IP addresses automatically. | Stderr outputs `HTTP Error 429: Too Many Requests` or `HTTP Error 403: Forbidden`. | Stream resolves successfully without proxies. | Complete stderr dump from standalone command. |
| **Incorrect Spawn Config** | `spawn` args array is incorrectly formatted or shell mode flags are missing. | Error `ENOENT` or exit codes 1 or 2 with syntax errors. | Processes start normally with standard args. | Log of exact array passed to `child_process.spawn`. |

---

## 6. Production Safety & Redaction Rules

Logs must never leak sensitive details. We will implement a `redactSensitiveInfo` helper to filter stdout, stderr, and arguments:
*   **Cookie Redaction:** Scan and replace text values following `--cookies` paths or browser cookies values.
*   **Proxy Credentials:** Match and mask `http://user:pass@host` patterns using regex.
*   **Auth Headers:** Replace Bearer or Basic authentication values with `[REDACTED]`.

---

## 7. Review & Categorization of Existing Codebase Findings

We categorize the issues found during our initial code review into three priorities:

### A. Critical (Must Fix Now for Diagnostics)
*   **Headless Cookie Handling:** Strip out browser cookies automation (`--cookies-from-browser`) if it triggers environment errors on headless Docker.
*   **Child Process Error Catching:** Intercept spawn errors (like `ENOENT`) globally to prevent uncaught exceptions from killing the Node server.

### B. Important (Implement After Finding Root Cause)
*   **Search caching:** Stop duplicate `yt-dlp` runs on repeated queries.
*   **Local Caching Throttling Queue:** Implement the concurrency queue to throttle `yt-dlp` spawns to a maximum of 2, preventing CPU bottlenecks and rate limiting.
*   **Synchronous Startup Loop Yields:** Refactor `renameCachedFiles` to execute incrementally using `setImmediate` or background worker intervals.

### C. Nice to Have (Future Optimization)
*   **Redis integrations:** Distributed caching for search queries and resolved stream URLs.
*   **Separate scraper microservice:** Isolate python runs from the Express app.
*   **Object Storage (Cloudflare R2 / AWS S3):** Persist files out of local transient container memory.

---

## 8. Implementation Roadmap

```mermaid
grid-layout
```
*(Process Sequence)*
1.  **Phase 1: Environment Diagnostics:** Implement `GET /api/debug/environment` endpoint to retrieve versions and specs.
2.  **Phase 2: Standalone yt-dlp Diagnostics:** Implement `GET /api/debug/yt-dlp-diagnostic` endpoint.
3.  **Phase 3: Structured logging:** Introduce the `runYtDlp` subprocess wrapper in `yt-dlp-helper.js` and implement the safety scrubbing helper.
4.  **Phase 4: Correlation IDs:** Set up correlation/request tracing middleware.
5.  **Phase 5: Application Instrumentation:** Route all `yt-dlp` actions inside `yt-dlp-helper.js` through `runYtDlp`.
6.  **Phase 6: Compare Local vs Render:** Query endpoints in both environments to collect log reports.
7.  **Phase 7: Root Cause Analysis:** Match collected evidence against the Hypothesis Challenge Matrix.
8.  **Phase 8: Recommended Fixes:** Build targeted patches based on verified findings.

---

## 9. Verification Plan

*   **Local Test:** Hit `GET http://localhost:5000/api/debug/environment` and check JSON structure.
*   **Diagnostic Test:** Hit `GET http://localhost:5000/api/debug/yt-dlp-diagnostic` and check for Rickroll URL resolution log.
*   **Redaction Check:** Run a test passing a mock `--cookies C:\secret\cookies.txt` or a proxy with credentials to confirm that the logs redact the arguments safely.
