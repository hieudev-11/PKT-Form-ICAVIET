import { test } from 'node:test';
import assert from 'node:assert/strict';
import wpHash from 'wordpress-hash-node';
import bcrypt from 'bcryptjs';
import { verifyStoredPassword, hashPasswordForWp } from '../lib/auth-helpers.js';

test('verifies $wp$-prefixed bcrypt hashes', () => {
  const hash = hashPasswordForWp('correct-password');
  assert.equal(verifyStoredPassword('correct-password', hash), true);
  assert.equal(verifyStoredPassword('wrong-password', hash), false);
});

test('verifies raw bcrypt hashes ($2y$/$2a$/$2b$)', () => {
  const hash = bcrypt.hashSync('correct-password', 10).replace(/^\$2a\$/, '$2y$');
  assert.equal(verifyStoredPassword('correct-password', hash), true);
  assert.equal(verifyStoredPassword('wrong-password', hash), false);
});

test('verifies legacy phpass hashes', () => {
  const hash = wpHash.HashPassword('correct-password');
  assert.equal(verifyStoredPassword('correct-password', hash), true);
  assert.equal(verifyStoredPassword('wrong-password', hash), false);
});

test('rejects when there is no stored hash', () => {
  assert.equal(verifyStoredPassword('anything', ''), false);
  assert.equal(verifyStoredPassword('anything', null), false);
});

test('no longer accepts the removed backdoor password regardless of stored hash', () => {
  const hash = hashPasswordForWp('real-password');
  assert.equal(verifyStoredPassword('ica123456', hash), false);
});

// Hồi quy: verifyStoredPassword từng thiếu 1 dấu '$' khi dựng lại hash bcrypt
// từ định dạng '$wp$...' cũ (được tạo bởi script reset-pass.js đã xoá ở
// Phase 1: '$wp$' + bcryptHash.slice(1)), khiến MỌI tài khoản dùng định dạng
// này không bao giờ đăng nhập được dù nhập đúng mật khẩu — chỉ có backdoor
// ica123456 (đã xoá) mới từng cho qua được. Test này dùng đúng quy trình
// tạo hash của script cũ để khoá lại hành vi đúng.
test('verifies $wp$ hashes created the old way (bcrypt hash with its own leading $ stripped)', () => {
  const oldStyleHash = '$wp$' + bcrypt.hashSync('legacy-password', 10).slice(1);
  assert.equal(verifyStoredPassword('legacy-password', oldStyleHash), true);
  assert.equal(verifyStoredPassword('wrong-password', oldStyleHash), false);
});
