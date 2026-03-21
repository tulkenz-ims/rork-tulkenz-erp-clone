// api/ai-tools/code-editor.js
// GitHub API integration — read, diff, and commit file changes
// Claude proposes diffs, user approves, then this commits to main

const Anthropic = require('@anthropic-ai/sdk').default;
const { resolveScreenPath, listAllScreens } = require('./screen-map');

const GITHUB_OWNER = 'tulkenz-ims';
const GITHUB_REPO  = 'rork-tulkenz-erp-clone';
const GITHUB_BRANCH = 'main';

function getGitHubHeaders() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN not set in environment variables.');
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
    'User-Agent': 'TulKenz-OPS-AI',
  };
}

// ── Read a file from GitHub ──────────────────────────────────────────────────

async function readFile(filePath) {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${encodeURIComponent(filePath)}?ref=${GITHUB_BRANCH}`;
  const resp = await fetch(url, { headers: getGitHubHeaders() });

  if (resp.status === 404) {
    return { success: false, error: `File not found: ${filePath}` };
  }
  if (!resp.ok) {
    const body = await resp.text();
    return { success: false, error: `GitHub API error ${resp.status}: ${body}` };
  }

  const data = await resp.json();
  const content = Buffer.from(data.content, 'base64').toString('utf8');
  return {
    success: true,
    path: filePath,
    content,
    sha: data.sha,
    size: content.length,
    lines: content.split('\n').length,
  };
}

// ── Commit a file change to GitHub ───────────────────────────────────────────

async function commitFile(filePath, newContent, commitMessage, currentSha) {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${encodeURIComponent(filePath)}`;
  const encoded = Buffer.from(newContent, 'utf8').toString('base64');

  const body = {
    message: commitMessage,
    content: encoded,
    branch: GITHUB_BRANCH,
    sha: currentSha,
  };

  const resp = await fetch(url, {
    method: 'PUT',
    headers: getGitHubHeaders(),
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errBody = await resp.text();
    return { success: false, error: `Commit failed ${resp.status}: ${errBody}` };
  }

  const result = await resp.json();
  return {
    success: true,
    commit_sha: result.commit?.sha,
    commit_url: result.commit?.html_url,
    message: `Committed to ${GITHUB_BRANCH}. Vercel will deploy in ~35 seconds.`,
  };
}

// ── Generate a diff summary (human readable) ─────────────────────────────────

function generateDiffSummary(originalContent, newContent, filePath) {
  const origLines = originalContent.split('\n');
  const newLines = newContent.split('\n');

  const added = [];
  const removed = [];
  const changed = [];

  // Simple line-by-line diff
  const maxLen = Math.max(origLines.length, newLines.length);
  for (let i = 0; i < maxLen; i++) {
    const orig = origLines[i];
    const next = newLines[i];
    if (orig === undefined) {
      added.push(`+ [line ${i + 1}] ${next}`);
    } else if (next === undefined) {
      removed.push(`- [line ${i + 1}] ${orig}`);
    } else if (orig !== next) {
      changed.push(`~ [line ${i + 1}] "${orig.trim()}" → "${next.trim()}"`);
    }
  }

  const summary = [];
  summary.push(`File: ${filePath}`);
  summary.push(`Lines: ${origLines.length} → ${newLines.length} (${newLines.length - origLines.length >= 0 ? '+' : ''}${newLines.length - origLines.length})`);
  summary.push('');

  if (changed.length > 0) {
    summary.push(`MODIFIED (${changed.length} lines):`);
    changed.slice(0, 10).forEach(l => summary.push(`  ${l}`));
    if (changed.length > 10) summary.push(`  ... and ${changed.length - 10} more changes`);
    summary.push('');
  }
  if (added.length > 0) {
    summary.push(`ADDED (${added.length} lines):`);
    added.slice(0, 10).forEach(l => summary.push(`  ${l}`));
    if (added.length > 10) summary.push(`  ... and ${added.length - 10} more additions`);
    summary.push('');
  }
  if (removed.length > 0) {
    summary.push(`REMOVED (${removed.length} lines):`);
    removed.slice(0, 10).forEach(l => summary.push(`  ${l}`));
    if (removed.length > 10) summary.push(`  ... and ${removed.length - 10} more removals`);
    summary.push('');
  }

  return summary.join('\n');
}

// ── Use Claude to generate the edited file ───────────────────────────────────

async function generateEdit(filePath, currentContent, instruction, userLanguage = 'en') {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set.');

  const client = new Anthropic({ apiKey });

  const prompt = `You are an expert React Native / Expo developer working on TulKenz OPS, a food manufacturing operations platform.

The app uses:
- React Native / Expo with Expo Router
- TypeScript
- Supabase backend
- TanStack Query (useQuery, useMutation)
- Tony Stark HUD theme: bg=#0a0e1a, card=#0d1117, border=#1a2332, accent=#00d4ff, green=#00ff88, yellow=#ffcc00, red=#ff4444
- All form fields must be filled before submission — use "N/A" if not applicable
- Time clock = "Check In / Check Out" (never "clock in/out")

FILE: ${filePath}
CURRENT CODE:
\`\`\`typescript
${currentContent}
\`\`\`

INSTRUCTION: ${instruction}

Rules:
1. Return ONLY the complete updated file — no explanation, no markdown, no backticks, no preamble
2. Preserve all existing functionality — only change what the instruction requires
3. Match the existing code style exactly
4. Keep the HUD theme consistent
5. Never remove imports that are used elsewhere in the file
6. The output must be valid TypeScript/JavaScript that will compile without errors`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    messages: [{ role: 'user', content: prompt }],
  });

  const newContent = response.content[0]?.text || '';
  if (!newContent || newContent.length < 50) {
    throw new Error('Claude returned empty or invalid code.');
  }

  // Strip any accidental markdown fences
  const cleaned = newContent
    .replace(/^```(typescript|tsx|javascript|js)?\n/m, '')
    .replace(/\n```$/m, '')
    .trim();

  return cleaned;
}

// ── Main handler — called from ai-assist.js ──────────────────────────────────

async function handleCodeEditorTool(toolName, params, userLanguage = 'en') {
  const es = userLanguage === 'es';

  try {
    switch (toolName) {

      // ── list_screens ────────────────────────────────────────────────────────
      case 'list_screens': {
        const screens = listAllScreens();
        const grouped = {
          screens: screens.filter(s => s.path.includes('app/(tabs)')),
          hooks: screens.filter(s => s.path.includes('hooks/')),
          api: screens.filter(s => s.path.includes('api/')),
        };
        return {
          success: true,
          action: 'list_screens',
          data: grouped,
          speech: es
            ? `Encontré ${grouped.screens.length} pantallas, ${grouped.hooks.length} hooks, y ${grouped.api.length} archivos de API en el mapa.`
            : `Found ${grouped.screens.length} screens, ${grouped.hooks.length} hooks, and ${grouped.api.length} API files in the map.`,
        };
      }

      // ── read_screen ─────────────────────────────────────────────────────────
      case 'read_screen': {
        const { screen_name, file_path } = params;

        // Resolve path — either direct file_path or screen_name lookup
        let resolvedPath = file_path;
        if (!resolvedPath && screen_name) {
          const resolved = resolveScreenPath(screen_name);
          if (!resolved) {
            return {
              success: false,
              action: 'read_screen',
              speech: es
                ? `No encontré "${screen_name}" en el mapa de pantallas. Intenta con el nombre exacto o la ruta del archivo.`
                : `Could not find "${screen_name}" in the screen map. Try the exact screen name or file path.`,
            };
          }
          resolvedPath = resolved.path;
        }

        if (!resolvedPath) {
          return {
            success: false,
            action: 'read_screen',
            speech: es ? 'Necesito el nombre de la pantalla o la ruta del archivo.' : 'I need a screen name or file path.',
          };
        }

        const result = await readFile(resolvedPath);
        if (!result.success) {
          return {
            success: false,
            action: 'read_screen',
            speech: es
              ? `Error al leer el archivo: ${result.error}`
              : `Error reading file: ${result.error}`,
          };
        }

        return {
          success: true,
          action: 'read_screen',
          path: resolvedPath,
          content: result.content,
          sha: result.sha,
          lines: result.lines,
          speech: es
            ? `Leí ${resolvedPath} — ${result.lines} líneas.`
            : `Read ${resolvedPath} — ${result.lines} lines.`,
        };
      }

      // ── edit_screen ─────────────────────────────────────────────────────────
      case 'edit_screen': {
        const { screen_name, file_path, instruction } = params;

        if (!instruction) {
          return {
            success: false,
            action: 'edit_screen',
            speech: es ? 'Necesito saber qué cambiar.' : 'I need to know what to change.',
          };
        }

        // Resolve path
        let resolvedPath = file_path;
        if (!resolvedPath && screen_name) {
          const resolved = resolveScreenPath(screen_name);
          if (!resolved) {
            return {
              success: false,
              action: 'edit_screen',
              speech: es
                ? `No encontré "${screen_name}" en el mapa de pantallas.`
                : `Could not find "${screen_name}" in the screen map.`,
            };
          }
          resolvedPath = resolved.path;
        }

        if (!resolvedPath) {
          return {
            success: false,
            action: 'edit_screen',
            speech: es ? 'Necesito el nombre de la pantalla o la ruta del archivo.' : 'I need a screen name or file path.',
          };
        }

        // Read current file
        const current = await readFile(resolvedPath);
        if (!current.success) {
          return {
            success: false,
            action: 'edit_screen',
            speech: es
              ? `No pude leer el archivo: ${current.error}`
              : `Could not read file: ${current.error}`,
          };
        }

        // Generate edited version
        const newContent = await generateEdit(
          resolvedPath,
          current.content,
          instruction,
          userLanguage
        );

        // Generate diff summary
        const diff = generateDiffSummary(current.content, newContent, resolvedPath);

        return {
          success: true,
          action: 'edit_screen',
          path: resolvedPath,
          original_sha: current.sha,
          original_content: current.content,
          new_content: newContent,
          diff_summary: diff,
          pending_commit: true,
          speech: es
            ? `Aquí está el diff para ${resolvedPath}. Revísalo y dime si quieres que lo publique, o si necesita cambios.\n\n${diff}`
            : `Here's the diff for ${resolvedPath}. Review it and tell me to deploy it, or let me know what to change.\n\n${diff}`,
        };
      }

      // ── deploy_change ────────────────────────────────────────────────────────
      case 'deploy_change': {
        const { file_path, new_content, original_sha, commit_message } = params;

        if (!file_path || !new_content || !original_sha) {
          return {
            success: false,
            action: 'deploy_change',
            speech: es
              ? 'Faltan datos para el commit. Genera el diff primero con edit_screen.'
              : 'Missing data for commit. Generate the diff first with edit_screen.',
          };
        }

        const message = commit_message || `AI edit: ${file_path} — ${new Date().toISOString().split('T')[0]}`;

        const result = await commitFile(file_path, new_content, message, original_sha);

        if (!result.success) {
          return {
            success: false,
            action: 'deploy_change',
            speech: es
              ? `Error al publicar: ${result.error}`
              : `Deploy failed: ${result.error}`,
          };
        }

        return {
          success: true,
          action: 'deploy_change',
          commit_sha: result.commit_sha,
          commit_url: result.commit_url,
          speech: es
            ? `✅ Publicado. Vercel está desplegando ahora — listo en ~35 segundos.\nCommit: ${result.commit_sha?.slice(0, 7)}`
            : `✅ Deployed. Vercel is building now — live in ~35 seconds.\nCommit: ${result.commit_sha?.slice(0, 7)}`,
        };
      }

      default:
        return {
          success: false,
          speech: es ? 'Herramienta desconocida.' : 'Unknown code editor tool.',
        };
    }
  } catch (err) {
    console.error(`[code-editor] ${toolName} error:`, err.message);
    return {
      success: false,
      action: toolName,
      speech: es
        ? `Error en el editor de código: ${err.message}`
        : `Code editor error: ${err.message}`,
    };
  }
}

module.exports = { handleCodeEditorTool, readFile, commitFile };
