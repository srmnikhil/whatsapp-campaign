import { describe, expect, it } from 'vitest';
import { findStopButtonIndex, findVariables, getTemplateVersion, groupTemplatesByVersion, sortTemplates, summarizeTemplate, upsertTemplate } from './templates.js';

const APPROVED_IMAGE_TEMPLATE = {
  id: '1',
  name: 'diwali_offer',
  language: 'en',
  status: 'APPROVED',
  category: 'MARKETING',
  parameter_format: 'POSITIONAL',
  quality_score: { score: 'GREEN' },
  rejected_reason: 'NONE',
  components: [
    { type: 'HEADER', format: 'IMAGE', example: { header_handle: ['https://scontent.example/x.jpg'] } },
    { type: 'BODY', text: 'Hi {{1}}, 20% off this Diwali.', example: { body_text: [['Rahul']] } },
    { type: 'FOOTER', text: 'Garaaz' },
    { type: 'BUTTONS', buttons: [{ type: 'URL', text: 'Shop', url: 'https://garaaz.com' }, { type: 'QUICK_REPLY', text: 'Stop promotions' }] },
  ],
};

describe('findVariables', () => {
  it('lists positional and named variables', () => {
    expect(findVariables('Hi {{1}} and {{ name }}')).toEqual(['1', 'name']);
    expect(findVariables('')).toEqual([]);
  });
});

describe('summarizeTemplate', () => {
  it('flattens components and finds the stop button', () => {
    const summary = summarizeTemplate(APPROVED_IMAGE_TEMPLATE);
    expect(summary).toMatchObject({
      id: '1',
      qualityScore: 'GREEN',
      rejectedReason: null,
      header: { format: 'IMAGE', exampleUrl: 'https://scontent.example/x.jpg' },
      bodyText: 'Hi {{1}}, 20% off this Diwali.',
      footerText: 'Garaaz',
      stopButtonIndex: 1,
      problems: [],
    });
  });

  it.each([
    [{ status: 'PENDING' }, 'Status is PENDING'],
    [{ category: 'AUTHENTICATION' }, 'Category is AUTHENTICATION'],
    [{ parameter_format: 'NAMED' }, "Named variables aren't supported"],
    [{ components: [{ type: 'BODY', text: 'Hi {{1}}, order {{2}}' }] }, 'Only {{1}} (name) is supported'],
    [{ components: [{ type: 'HEADER', format: 'VIDEO' }, { type: 'BODY', text: 'x' }] }, "video headers aren't supported yet"],
    [{ components: [{ type: 'HEADER', format: 'TEXT', text: 'Hi {{1}}' }, { type: 'BODY', text: 'x' }] }, "Header variables aren't supported"],
    [{ components: [{ type: 'BODY', text: 'x' }, { type: 'BUTTONS', buttons: [{ type: 'URL', text: 'Go', url: 'https://g.com/{{1}}' }] }] }, "URL buttons with variables aren't supported"],
    [{ components: [{ type: 'BODY', text: 'x' }, { type: 'BUTTONS', buttons: [{ type: 'COPY_CODE', text: 'Copy' }] }] }, "copy_code buttons aren't supported"],
  ])('reports campaign problems for %j', (override, problem) => {
    expect(summarizeTemplate({ ...APPROVED_IMAGE_TEMPLATE, ...override }).problems).toContain(problem);
  });

  it('keeps a real rejection reason', () => {
    expect(summarizeTemplate({ ...APPROVED_IMAGE_TEMPLATE, status: 'REJECTED', rejected_reason: 'INVALID_FORMAT' }).rejectedReason).toBe('INVALID_FORMAT');
  });
});

describe('findStopButtonIndex', () => {
  it('matches quick replies case-insensitively and ignores other button types', () => {
    expect(findStopButtonIndex([{ type: 'QUICK_REPLY', text: ' STOP Promotions ' }])).toBe(0);
    expect(findStopButtonIndex([{ type: 'URL', text: 'Stop promotions' }])).toBe(-1);
  });
});

describe('list helpers', () => {
  it('upserts by id and sorts usable templates first', () => {
    const usable = summarizeTemplate(APPROVED_IMAGE_TEMPLATE);
    const pending = summarizeTemplate({ ...APPROVED_IMAGE_TEMPLATE, id: '2', name: 'a_pending', status: 'PENDING' });
    expect(sortTemplates([pending, usable]).map((t) => t.id)).toEqual(['1', '2']);

    const approvedNow = { ...pending, status: 'APPROVED' };
    expect(upsertTemplate([usable, pending], approvedNow)[1].status).toBe('APPROVED');
    expect(upsertTemplate([usable], pending)).toHaveLength(2);
  });
});

describe('template versions', () => {
  it('reads the _vN suffix', () => {
    expect(getTemplateVersion('estimate_ready_en_v3')).toBe(3);
    expect(getTemplateVersion('estimate_ready_en_v10')).toBe(10);
    expect(getTemplateVersion('diwali_offer')).toBe(0);
  });

  it('groups versions of one template and puts the newest first', () => {
    const t = (name, language = 'en') => ({ name, language });
    const groups = groupTemplatesByVersion([
      t('estimate_ready_en_v3'),
      t('estimate_ready_en_v10'),
      t('estimate_ready_en_v4'),
      t('enquiry_ready_en_v2'),
      t('estimate_ready_en_v3', 'hi'),
    ]);
    expect(groups).toHaveLength(3);
    const estimate = groups.find((g) => g.baseName === 'estimate_ready_en' && g.language === 'en');
    expect(estimate.versions.map((v) => v.name)).toEqual([
      'estimate_ready_en_v10',
      'estimate_ready_en_v4',
      'estimate_ready_en_v3',
    ]);
    expect(estimate.latest.name).toBe('estimate_ready_en_v10');
  });
});
