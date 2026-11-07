const assert = require('node:assert/strict');
const http = require('node:http');
const { after, before, test } = require('node:test');

let server;
let service;
let baseUrl;
const requests = [];

before(async () => {
  server = http.createServer((request, response) => {
    const chunks = [];

    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => {
      const bodyText = Buffer.concat(chunks).toString();
      const body = bodyText ? JSON.parse(bodyText) : {};
      requests.push({
        path: request.url,
        headers: request.headers,
        body,
      });
      response.setHeader('Content-Type', 'application/json');

      if (request.url === '/moderate') {
        if (body.text === 'service-down') {
          response.statusCode = 503;
          response.end(JSON.stringify({ detail: 'unavailable' }));
          return;
        }

        const unsafe = body.text === 'unsafe';
        response.end(JSON.stringify({
          label: body.text === 'invalid-label' ? 'UNKNOWN' : unsafe ? 'TOXIC' : 'NON_TOXIC',
          probability_toxic: unsafe ? 0.98 : 0.02,
          threshold: 0.5,
          action: unsafe ? 'REJECT' : 'CONTINUE',
          detected_words: [],
          has_violation: unsafe,
        }));
        return;
      }

      if (request.url === '/generate') {
        const shouldRejectIdentity = body.prompt?.includes('FORCE_BAD_IDENTITY');
        const emptyGeneratorResponse = body.prompt?.includes('Pertanyaan siswa:\nempty') || body.prompt === 'empty';
        const responseText = shouldRejectIdentity
          ? 'Saya AI assistant menggunakan Copilot SDK di VS Code. Informasi backend: MODERATION_API_URL=... dan request_id debug sedang berjalan.'
          : emptyGeneratorResponse
            ? ''
            : `Generated: ${body.prompt}`;
        response.end(JSON.stringify({
          response: responseText,
        }));
        return;
      }

      if (request.url === '/health') {
        response.end(JSON.stringify({
          status: 'ok',
          service: 'qwen-generator',
          qwen_ready: true,
          port: 8001,
        }));
        return;
      }

      response.statusCode = 404;
      response.end(JSON.stringify({ detail: 'Not Found' }));
    });
  });

  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
  process.env.MODERATION_API_URL = baseUrl;
  process.env.MODERATION_API_KEY = 'test-moderation-key';
  process.env.GENERATOR_API_URL = baseUrl;
  process.env.GENERATOR_API_KEY = 'test-generator-key';
  process.env.GENERATOR_TIMEOUT = '1000';
  service = require('../src/services/moderationService');
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
});

test('moderation posts text and fails closed when the API is unavailable', async () => {
  const safeResult = await service.moderateMessage('safe question', 'request-1');
  assert.equal(safeResult.serviceAvailable, true);
  assert.equal(safeResult.label, 'NON_TOXIC');
  assert.equal(safeResult.hasViolation, false);

  const moderationRequest = requests.find(
    (request) => request.path === '/moderate',
  );
  assert.equal(moderationRequest.body.text, 'safe question');
  assert.equal(moderationRequest.body.request_id, 'request-1');
  assert.equal(moderationRequest.headers.authorization, 'Bearer test-moderation-key');
  assert.equal(moderationRequest.headers['ngrok-skip-browser-warning'], 'true');

  const unavailableResult = await service.moderateMessage('service-down', 'request-2');
  assert.equal(unavailableResult.serviceAvailable, false);
  assert.equal(unavailableResult.label, 'NON_TOXIC');
  assert.equal(unavailableResult.hasViolation, false);
  assert.equal(unavailableResult.action, 'REJECT');
});

test('only a valid toxic result is a violation; malformed labels fail closed', async () => {
  const toxic = await service.moderateMessage('unsafe', 'toxic-1');
  assert.equal(toxic.serviceAvailable, true);
  assert.equal(toxic.label, 'TOXIC');
  assert.equal(toxic.hasViolation, true);
  const invalid = await service.moderateMessage('invalid-label', 'invalid-1');
  assert.equal(invalid.serviceAvailable, false);
  assert.equal(invalid.hasViolation, false);
  assert.equal(invalid.action, 'REJECT');
});

test('generator sends the educational prompt and returns the generated response', async () => {
  const generated = await service.generateLocalResponse(
    'Apa manfaat pemanasan?',
    'request-3',
  );

  const lastGeneratorRequest = requests.filter(
    (request) => request.path === '/generate',
  ).at(-1);

  assert.equal(generated, `Generated: ${lastGeneratorRequest.body.prompt}`);

  const generatorRequest = lastGeneratorRequest;
  assert.ok(generatorRequest.body.prompt.includes('You are EduBot'));
  assert.ok(generatorRequest.body.prompt.includes('Apa manfaat pemanasan?'));
  assert.equal(generatorRequest.body.max_new_tokens, 256);
  assert.equal(generatorRequest.body.do_sample, false);
  assert.equal(generatorRequest.body.request_id, 'request-3');
  assert.equal(generatorRequest.headers.authorization, 'Bearer test-generator-key');
  assert.equal(generatorRequest.headers['ngrok-skip-browser-warning'], 'true');
});

test('student-facing validation rejects Copilot/developer identity responses and falls back safely', async () => {
  const generated = await service.generateLocalResponse(
    'FORCE_BAD_IDENTITY pertanyaan aman',
    'request-4',
  );

  assert.ok(generated.includes('Aku EduBot'));
  assert.equal(
    generated,
    'Halo! Aku EduBot, teman belajarmu. Aku siap membantu belajar dengan cara yang mudah, santai, dan menyenangkan. Silakan ajukan pertanyaanmu lagi tentang pelajaran hari ini.',
  );
});

test('missing educational prompt fails explicitly instead of falling back silently', () => {
  assert.throws(
    () => service.loadEducationalSystemPrompt('/definitely/missing/system_prompt.md'),
    /Educational system prompt is not available/i,
  );
});

test('generator health requires a ready Qwen service', async () => {
  assert.equal(await service.checkGeneratorHealth(), true);
  assert.ok(requests.some((request) => request.path === '/health'));
});

test('generator rejects empty responses instead of returning them as answers', async () => {
  await assert.rejects(
    service.generateLocalResponse('empty'),
    /Generator API request failed/,
  );
});
