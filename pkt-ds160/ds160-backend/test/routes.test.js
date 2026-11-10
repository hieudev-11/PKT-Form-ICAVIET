// Test tích hợp: khởi động server.js thật (nối DB thật, dùng port riêng để
// không đụng tiến trình dev/production) rồi gọi qua từng route module bằng
// fetch. Phủ ít nhất happy path cho mỗi router đã tách ở Phase 3.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_PORT = 3098;
const BASE_URL = `http://localhost:${TEST_PORT}`;

let serverProcess;

before(async () => {
  serverProcess = spawn(process.execPath, [join(__dirname, '..', 'server.js')], {
    cwd: join(__dirname, '..'),
    env: { ...process.env, PORT: String(TEST_PORT) },
    stdio: 'pipe'
  });

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Server did not start in time')), 15000);
    serverProcess.stdout.on('data', (chunk) => {
      if (chunk.toString().includes('Server')) {
        clearTimeout(timeout);
        resolve();
      }
    });
    serverProcess.on('error', reject);
  });
  // Cho initCheckerDB() một nhịp để chạy xong trước khi test bắn request.
  await new Promise(r => setTimeout(r, 1000));
});

after(() => {
  serverProcess?.kill();
});

test('GET /api/test-db connects to all 3 databases', async () => {
  const res = await fetch(`${BASE_URL}/api/test-db`);
  const body = await res.json();
  assert.equal(body.success, true);
});

test('GET /api/employees returns the ICAVIET staff list (routes/auth.js)', async () => {
  const res = await fetch(`${BASE_URL}/api/employees`);
  const body = await res.json();
  assert.equal(body.success, true);
  assert.ok(Array.isArray(body.data));
});

test('POST /api/auth/login rejects an unknown username with 401 (routes/auth.js)', async () => {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'phase4_nonexistent_user', password: 'whatever' })
  });
  assert.equal(res.status, 401);
});

test('draft create -> read -> delete round trip (routes/drafts.js)', async () => {
  const draftKey = 'phase4-integration-test';
  const userId = 999999;

  const created = await fetch(`${BASE_URL}/api/drafts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ draft_key: draftKey, user_id: userId, draft_type: 'fill', form_type: 'ds160', draft_data: { hello: 'phase4' } })
  }).then(r => r.json());
  assert.equal(created.success, true);

  const fetched = await fetch(`${BASE_URL}/api/drafts/${draftKey}?user_id=${userId}`).then(r => r.json());
  assert.equal(fetched.success, true);
  assert.equal(fetched.data.hello, 'phase4');

  const deleted = await fetch(`${BASE_URL}/api/drafts/${draftKey}?user_id=${userId}`, { method: 'DELETE' }).then(r => r.json());
  assert.equal(deleted.success, true);
});

test('review submit -> pending -> complete -> completed-all round trip (routes/reviews.js)', async () => {
  const reviewerId = 888887;

  const submitted = await fetch(`${BASE_URL}/api/reviews/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      submission_id: 999999, customer_name: 'Phase4 Test', form_type: 'ds160', form_label: 'Test',
      filler_id: 1, filler_name: 'Tester', reviewer_id: reviewerId, reviewer_name: 'ReviewerPhase4',
      filler_changes: { a: 1 }
    })
  }).then(r => r.json());
  assert.equal(submitted.success, true);
  const reviewId = submitted.id;

  const pending = await fetch(`${BASE_URL}/api/reviews/pending/${reviewerId}`).then(r => r.json());
  assert.equal(pending.success, true);
  const pendingItem = pending.data.find(r => r.id === reviewId);
  assert.ok(pendingItem, 'submitted review should appear in pending list');
  assert.ok(!('reviewerName' in pendingItem), 'pending rows must not include reviewerName (matches original behavior)');

  const completed = await fetch(`${BASE_URL}/api/reviews/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ review_id: reviewId, changes: { note: 'done' } })
  }).then(r => r.json());
  assert.equal(completed.success, true);

  const completedAll = await fetch(`${BASE_URL}/api/reviews/completed-all`).then(r => r.json());
  const completedItem = completedAll.data.find(r => r.id === reviewId);
  assert.ok(completedItem, 'completed review should appear in completed-all list');
  assert.ok('reviewerName' in completedItem, 'completed-all rows must include reviewerName (matches original behavior)');

  // dọn dữ liệu test khỏi DB thật
  const { poolChecker } = await import('../db.js');
  await poolChecker.query('DELETE FROM icaviet_review_queue WHERE id = ?', [reviewId]);
});

test('submit -> reopen -> resubmit ghi đè đúng phiếu cũ, không đẻ phiếu trùng (routes/reviews.js)', async () => {
  const reviewerId = 888886;
  const fillerId = 777776;
  const submissionId = 999998;

  const submitted = await fetch(`${BASE_URL}/api/reviews/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      submission_id: submissionId, customer_name: 'Reopen Test', form_type: 'ds160', form_label: 'Test',
      filler_id: fillerId, filler_name: 'Tester', reviewer_id: reviewerId, reviewer_name: 'ReviewerReopen',
      filler_changes: { data_1_2: 'bản đầu' }
    })
  }).then(r => r.json());
  assert.equal(submitted.success, true);
  const reviewId = submitted.id;

  // Người xử lý lấy lại đúng phiếu đã giao, kèm nguyên nội dung đã điền.
  const bySubmission = await fetch(`${BASE_URL}/api/reviews/by-submission/${submissionId}?form_type=ds160`).then(r => r.json());
  assert.equal(bySubmission.success, true);
  assert.equal(bySubmission.data.id, reviewId);
  assert.equal(bySubmission.data.fillerChanges.data_1_2, 'bản đầu');

  // Nhân viên thường không được mở lại phiếu đã giao, và cũng không submit đè được.
  const deniedReopen = await fetch(`${BASE_URL}/api/reviews/reopen`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ review_id: reviewId, actor_id: fillerId, actor_name: 'Tester', actor_username: 'nhanvien' })
  });
  assert.equal(deniedReopen.status, 403, 'chỉ ittest được mở lại phiếu đã giao');

  const deniedResubmit = await fetch(`${BASE_URL}/api/reviews/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      submission_id: submissionId, customer_name: 'Reopen Test', form_type: 'ds160', form_label: 'Test',
      filler_id: fillerId, filler_name: 'Tester', reviewer_id: reviewerId, reviewer_name: 'ReviewerReopen',
      filler_changes: { data_1_2: 'lén sửa' }
    })
  });
  assert.equal(deniedResubmit.status, 409, 'phiếu đang chờ kiểm tra thì không submit đè được');

  const reopened = await fetch(`${BASE_URL}/api/reviews/reopen`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ review_id: reviewId, actor_id: fillerId, actor_name: 'IT Test', actor_username: 'ittest' })
  }).then(r => r.json());
  assert.equal(reopened.success, true);

  // Phiếu đã mở lại thì rời hàng đợi của tư vấn.
  const pendingAfterReopen = await fetch(`${BASE_URL}/api/reviews/pending/${reviewerId}`).then(r => r.json());
  assert.ok(!pendingAfterReopen.data.some(r => r.id === reviewId), 'phiếu mở lại không được còn trong hàng đợi kiểm tra');

  // Thao tác mở lại phải để lại dấu vết trong log dù không sửa ô nào.
  const reopenLogs = await fetch(`${BASE_URL}/api/check-logs?username=ittest&review_id=${reviewId}&action=review_reopen`).then(r => r.json());
  assert.equal(reopenLogs.data.logs.length, 1);

  const resubmitted = await fetch(`${BASE_URL}/api/reviews/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      submission_id: submissionId, customer_name: 'Reopen Test', form_type: 'ds160', form_label: 'Test',
      filler_id: fillerId, filler_name: 'Tester', reviewer_id: reviewerId, reviewer_name: 'ReviewerReopen',
      filler_changes: { data_1_2: 'bản sửa lại' }
    })
  }).then(r => r.json());
  assert.equal(resubmitted.success, true);
  assert.equal(resubmitted.id, reviewId, 'giao lại phải ghi đè đúng phiếu cũ');
  assert.equal(resubmitted.updated, true);

  const { poolChecker } = await import('../db.js');
  const [rows] = await poolChecker.query(
    'SELECT COUNT(*) AS total FROM icaviet_review_queue WHERE submission_id = ? AND form_type = ?',
    [submissionId, 'ds160']
  );
  assert.equal(rows[0].total, 1, 'không được tạo thêm phiếu trùng trong hàng đợi');

  await poolChecker.query('DELETE FROM icaviet_review_queue WHERE id = ?', [reviewId]);
  await poolChecker.query('DELETE FROM icaviet_audit_logs WHERE review_id = ?', [reviewId]);
});

test('GET /api/check-logs/final gộp log + filler_changes + review_changes thành 1 bảng (routes/audit-logs.js)', async () => {
  const submissionId = 999997;

  const submitted = await fetch(`${BASE_URL}/api/reviews/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      submission_id: submissionId, customer_name: 'Final Report Test', form_type: 'ds160', form_label: 'Test',
      filler_id: 1, filler_name: 'Nguoi Xu Ly', reviewer_id: 888885, reviewer_name: 'Nguoi Tu Van',
      filler_changes: { data_1_2: 'NGUOI XU LY DIEN' }
    })
  }).then(r => r.json());
  const reviewId = submitted.id;

  await fetch(`${BASE_URL}/api/audit-logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'fill_submit', form_type: 'ds160', submission_id: submissionId, review_id: reviewId,
      actor_name: 'Nguoi Xu Ly', changed_count: 1,
      changed_fields: {
        fields: ['data_1_2'],
        values: {
          data_1_2: {
            field: 'data_1_2', label: 'Surnames', section: 'THONG TIN CA NHAN', item: '1',
            base_value: 'DATA GOC', old_value: 'DATA GOC', new_value: 'NGUOI XU LY DIEN'
          }
        }
      }
    })
  });

  await fetch(`${BASE_URL}/api/reviews/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ review_id: reviewId, changes: { note_1_2: 'TU VAN SUA LAI' } })
  });

  const report = await fetch(`${BASE_URL}/api/check-logs/final?username=ittest&review_id=${reviewId}`).then(r => r.json());
  assert.equal(report.success, true);

  const row = report.data.rows.find(r => r.key === 'data_1_2');
  assert.ok(row, 'phải có dòng tổng hợp cho ô data_1_2');
  assert.equal(row.label, 'Surnames');
  assert.equal(row.baseValue, 'DATA GOC');
  assert.equal(row.fillerValue, 'NGUOI XU LY DIEN');
  assert.equal(row.reviewerValue, 'TU VAN SUA LAI');
  assert.equal(row.finalValue, 'TU VAN SUA LAI');
  assert.ok(row.history.length >= 1, 'phải giữ lịch sử lần save');

  const forbidden = await fetch(`${BASE_URL}/api/check-logs/final?username=khac&review_id=${reviewId}`);
  assert.equal(forbidden.status, 403);

  const { poolChecker } = await import('../db.js');
  await poolChecker.query('DELETE FROM icaviet_review_queue WHERE id = ?', [reviewId]);
  await poolChecker.query('DELETE FROM icaviet_audit_logs WHERE submission_id = ?', [submissionId]);
});

test('POST /api/audit-logs -> GET /api/check-logs round trip (routes/audit-logs.js)', async () => {
  const marker = `phase4_audit_${Date.now()}`;
  const posted = await fetch(`${BASE_URL}/api/audit-logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: marker, form_type: 'ds160',
      changed_fields: { fields: ['fullName'], values: { fullName: { old: 'A', new: 'B' } } },
      changed_count: 1, customer_name: 'Phase4 Audit Test', actor_name: 'Tester', actor_username: 'phase4tester'
    })
  }).then(r => r.json());
  assert.equal(posted.success, true);

  const logs = await fetch(`${BASE_URL}/api/check-logs?username=ittest&action=${marker}`).then(r => r.json());
  assert.equal(logs.success, true);
  assert.equal(logs.data.logs.length, 1);
  assert.equal(logs.data.logs[0].customerName, 'Phase4 Audit Test');

  const forbidden = await fetch(`${BASE_URL}/api/check-logs?username=someoneelse`);
  assert.equal(forbidden.status, 403);

  const { poolChecker } = await import('../db.js');
  await poolChecker.query('DELETE FROM icaviet_audit_logs WHERE action = ?', [marker]);
});

test('GET /api/ds160 list + detail (routes/ds160.js)', async () => {
  const list = await fetch(`${BASE_URL}/api/ds160?page=1&per_page=2`).then(r => r.json());
  assert.equal(list.ok, true);
  assert.ok(Array.isArray(list.data));
  if (list.data.length) {
    const detail = await fetch(`${BASE_URL}/api/ds160/${list.data[0].id}`).then(r => r.json());
    assert.equal(detail.ok, true);
  }
});

test('GET /api/i130a/nbl-list, ndbl-list, detail, combine (routes/i130a.js)', async () => {
  const nbl = await fetch(`${BASE_URL}/api/i130a/nbl-list`).then(r => r.json());
  assert.equal(nbl.success, true);
  const ndbl = await fetch(`${BASE_URL}/api/i130a/ndbl-list`).then(r => r.json());
  assert.equal(ndbl.success, true);

  if (nbl.data.length) {
    const detail = await fetch(`${BASE_URL}/api/i130a/${nbl.data[0].id}`).then(r => r.json());
    assert.equal(detail.ok, true);
  }

  if (nbl.data.length && ndbl.data.length) {
    const combined = await fetch(`${BASE_URL}/api/i130a/combine?nbl_id=${nbl.data[0].id}&ndbl_id=${ndbl.data[0].id}&allow_assigned=1`).then(r => r.json());
    assert.equal(combined.ok, true);
  }
});
