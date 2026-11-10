import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildFinalReport, stripHtmlToText, pairKeyOf } from '../lib/final-report.js';

test('gộp ô cột XỬ LÝ và cột TƯ VẤN của cùng một dòng phiếu về 1 dòng tổng hợp', () => {
  const { rows } = buildFinalReport({
    review: {
      fillerChanges: { data_1_2: 'NGUYEN VAN A' },
      reviewChanges: { note_1_2: 'NGUYEN VAN B' }
    },
    logs: [{
      action: 'fill_submit',
      actorName: 'Xuân Hoài',
      createdAt: '01/01/2026',
      changedFields: {
        fields: ['data_1_2'],
        values: {
          data_1_2: { field: 'data_1_2', label: 'Surnames', section: 'THÔNG TIN CÁ NHÂN', item: '1', base_value: 'NGUYEN VAN GOC', old_value: 'NGUYEN VAN GOC', new_value: 'NGUYEN VAN A' }
        }
      }
    }]
  });

  assert.equal(rows.length, 1);
  const row = rows[0];
  assert.equal(row.label, 'Surnames');
  assert.equal(row.section, 'THÔNG TIN CÁ NHÂN');
  assert.equal(row.baseValue, 'NGUYEN VAN GOC');
  assert.equal(row.fillerValue, 'NGUYEN VAN A');
  assert.equal(row.reviewerValue, 'NGUYEN VAN B');
  assert.equal(row.finalValue, 'NGUYEN VAN B', 'tư vấn sửa thì giá trị tư vấn có hiệu lực');
});

test('ô chỉ người xử lý điền thì giá trị cuối là của người xử lý', () => {
  const { rows } = buildFinalReport({
    review: { fillerChanges: { data_3_4: 'HA NOI' }, reviewChanges: {} },
    logs: []
  });
  assert.equal(rows[0].finalValue, 'HA NOI');
  assert.equal(rows[0].reviewerTouched, false);
  assert.equal(rows[0].changeType, 'add');
});

test('ô bị xóa trắng được đánh dấu là xóa, không phải để trống vô danh', () => {
  const { rows } = buildFinalReport({
    review: { fillerChanges: { data_5_6: '__CLEARED__' }, reviewChanges: {} },
    logs: [{
      action: 'fill_submit',
      actorName: 'Xuân Hoài',
      changedFields: {
        fields: ['data_5_6'],
        values: { data_5_6: { field: 'data_5_6', label: 'Số hộ chiếu', base_value: 'C1234567', old_value: 'C1234567', new_value: '' } }
      }
    }]
  });
  assert.equal(rows[0].baseValue, 'C1234567');
  assert.equal(rows[0].finalValue, '');
  assert.equal(rows[0].changeType, 'delete');
});

test('giữ đủ lịch sử từng lần save của một ô, theo thứ tự thời gian', () => {
  const { rows, summary } = buildFinalReport({
    review: { fillerChanges: { data_1_2: 'LAN 3' }, reviewChanges: {} },
    logs: [
      {
        action: 'fill_draft_save', actorName: 'A', createdAtRaw: '2026-01-01T08:00:00',
        changedFields: { fields: ['data_1_2'], values: { data_1_2: { old_value: '', new_value: 'LAN 1' } } }
      },
      {
        action: 'fill_draft_save', actorName: 'A', createdAtRaw: '2026-01-01T09:00:00',
        changedFields: { fields: ['data_1_2'], values: { data_1_2: { old_value: 'LAN 1', new_value: 'LAN 2' } } }
      },
      {
        action: 'fill_submit', actorName: 'A', createdAtRaw: '2026-01-01T10:00:00',
        changedFields: { fields: ['data_1_2'], values: { data_1_2: { old_value: 'LAN 2', new_value: 'LAN 3' } } }
      }
    ]
  });

  assert.equal(rows[0].history.length, 3);
  assert.deepEqual(rows[0].history.map(h => h.newValue), ['LAN 1', 'LAN 2', 'LAN 3']);
  assert.equal(rows[0].touchCount, 3);
  assert.equal(summary.totalLogs, 3);
});

test('bỏ qua field nội bộ và làm sạch HTML của contenteditable', () => {
  const { rows } = buildFinalReport({
    review: {
      fillerChanges: { __ds160_hidden_placeholders__: ['x'], data_2_2: '<b>HA&nbsp;NOI</b><br>VN' },
      reviewChanges: {}
    },
    logs: []
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].fillerValue, 'HA NOI VN');
});

test('data gốc lấy từ ô cột XỬ LÝ, không lấy base của ô cột TƯ VẤN', () => {
  const { rows } = buildFinalReport({
    review: { fillerChanges: {}, reviewChanges: { note_9_9: 'TU VAN SUA' } },
    logs: [{
      action: 'review_complete', actorName: 'Ngọc Ánh',
      changedFields: {
        fields: ['note_9_9'],
        // base của ô TƯ VẤN = giá trị người xử lý để lại, không phải data khách khai.
        values: { note_9_9: { field: 'note_9_9', base_value: 'NGUOI XU LY DIEN', old_value: '', new_value: 'TU VAN SUA' } }
      }
    }]
  });
  assert.equal(rows[0].baseValue, '', 'không được nhận nhầm base của ô TƯ VẤN là data gốc');
  assert.equal(rows[0].finalValue, 'TU VAN SUA');
});

test('helper: pairKeyOf và stripHtmlToText', () => {
  assert.equal(pairKeyOf('note_12_3'), 'data_12_3');
  assert.equal(pairKeyOf('data_12_3'), 'data_12_3');
  assert.equal(stripHtmlToText('__CLEARED__'), '');
  assert.equal(stripHtmlToText('<div>A  &amp;  B</div>'), 'A & B');
});
