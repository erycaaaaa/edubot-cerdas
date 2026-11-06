// Script verifikasi konektivitas Backend Express ke Reward Gamification API di Railway
const https = require('node:https');

const REWARD_URL = process.env.GAMIFICATION_API_URL || 'https://edubot-cerdas-production.up.railway.app';

async function request(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, REWARD_URL);
    const options = {
      method,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    };
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy(new Error('Request timeout'));
    });
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function run() {
  console.log(`🔍 Menguji komunikasi ke Reward API: ${REWARD_URL}`);
  
  // 1. Health check
  try {
    const health = await request('/health');
    console.log(`✅ [GET /health] Status: ${health.status}`, health.body);
    if (health.status !== 200 || health.body?.status !== 'ok') {
      throw new Error('Health check tidak mengembalikan status ok');
    }
  } catch (err) {
    console.error('❌ [GET /health] Gagal:', err.message);
    process.exit(1);
  }

  // 2. Root info
  try {
    const root = await request('/');
    console.log(`✅ [GET /] Status: ${root.status}`, root.body);
  } catch (err) {
    console.error('❌ [GET /] Gagal:', err.message);
  }

  // 3. Evaluate Reward (safe_interaction, non-toxic, XP=0)
  try {
    const evalRes = await request('/reward/evaluate', 'POST', {
      event: 'safe_interaction',
      current_xp: 0,
      moderation_label: 'NON_TOXIC',
      request_id: 'test-dry-run',
    });
    console.log(`✅ [POST /reward/evaluate - safe] Status: ${evalRes.status}`, evalRes.body);
    if (evalRes.status !== 200 || evalRes.body?.reward_delta !== 1) {
      throw new Error('Evaluasi reward aman tidak sesuai harapan');
    }
  } catch (err) {
    console.error('❌ [POST /reward/evaluate - safe] Gagal:', err.message);
    process.exit(1);
  }

  // 4. Evaluate Reward (toxic interaction, blocked)
  try {
    const toxicRes = await request('/reward/evaluate', 'POST', {
      event: 'conversation_completed',
      current_xp: 10,
      moderation_label: 'TOXIC',
      request_id: 'test-toxic-dry-run',
    });
    console.log(`✅ [POST /reward/evaluate - toxic] Status: ${toxicRes.status}`, toxicRes.body);
    if (toxicRes.status !== 200 || toxicRes.body?.reward_delta !== 0 || toxicRes.body?.safety_gate !== 'BLOCK_REWARD') {
      throw new Error('Evaluasi reward toxic tidak diblokir dengan benar');
    }
  } catch (err) {
    console.error('❌ [POST /reward/evaluate - toxic] Gagal:', err.message);
    process.exit(1);
  }

  // 5. Badges
  try {
    const badgeRes = await request('/reward/badges', 'POST', {
      conversation_count: 5,
      helpful_feedback_count: 5,
      challenge_count: 1,
      streak_days: 3,
    });
    console.log(`✅ [POST /reward/badges] Status: ${badgeRes.status}`, badgeRes.body);
    if (badgeRes.status !== 200 || badgeRes.body?.count !== 4) {
      throw new Error('Evaluasi badge tidak sesuai');
    }
  } catch (err) {
    console.error('❌ [POST /reward/badges] Gagal:', err.message);
    process.exit(1);
  }

  console.log('\n🎉 SELURUH PENGUJIAN INTEGRASI KE REWARD API BERHASIL!');
}

run();

