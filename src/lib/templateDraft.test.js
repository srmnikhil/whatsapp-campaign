import { describe, expect, it } from 'vitest';
import { EMPTY_DRAFT, buildTemplateCreatePayload, validateTemplateDraft } from './templateDraft.js';

const image = new File(['x'], 'offer.png', { type: 'image/png' });
const VALID = {
  ...EMPTY_DRAFT,
  name: 'diwali_offer',
  imageFile: image,
  bodyText: 'Hi {{1}}, get 20% off this Diwali.',
  footerText: 'Garaaz',
};

describe('validateTemplateDraft', () => {
  it('accepts a valid image draft', () => {
    expect(validateTemplateDraft(VALID)).toEqual({});
  });

  it.each([
    [{ name: 'Diwali Offer' }, 'name'],
    [{ name: '' }, 'name'],
    [{ bodyText: '' }, 'bodyText'],
    [{ bodyText: 'Hi {{2}}, offer' }, 'bodyText'],
    [{ bodyText: 'Hi {{1}} and {{1}} again' }, 'bodyText'],
    [{ bodyText: '{{1}}, offer for you' }, 'bodyText'],
    [{ bodyText: 'Offer for {{1}}' }, 'bodyText'],
    [{ bodyText: 'x'.repeat(1025) }, 'bodyText'],
    [{ imageFile: null }, 'imageFile'],
    [{ imageFile: new File(['x'], 'a.gif', { type: 'image/gif' }) }, 'imageFile'],
    [{ footerText: 'x'.repeat(61) }, 'footerText'],
    [{ footerText: 'Hi {{1}}' }, 'footerText'],
    [{ sampleName: ' ' }, 'sampleName'],
  ])('rejects %j', (override, field) => {
    expect(validateTemplateDraft({ ...VALID, ...override })).toHaveProperty(field);
  });

  it('does not need an image or sample when there is no header or variable', () => {
    expect(validateTemplateDraft({ ...VALID, headerFormat: 'NONE', imageFile: null, bodyText: 'Big sale today at Garaaz.', sampleName: '' })).toEqual({});
  });
});

describe('buildTemplateCreatePayload', () => {
  it('builds an image marketing template with the stop button', () => {
    expect(buildTemplateCreatePayload(VALID, { headerHandle: '4::aGFuZGxl' })).toEqual({
      name: 'diwali_offer',
      language: 'en',
      category: 'MARKETING',
      parameter_format: 'POSITIONAL',
      components: [
        { type: 'HEADER', format: 'IMAGE', example: { header_handle: ['4::aGFuZGxl'] } },
        { type: 'BODY', text: 'Hi {{1}}, get 20% off this Diwali.', example: { body_text: [['Rahul']] } },
        { type: 'FOOTER', text: 'Garaaz' },
        { type: 'BUTTONS', buttons: [{ type: 'QUICK_REPLY', text: 'Stop promotions' }] },
      ],
    });
  });

  it('omits the header, example, footer and buttons when not used', () => {
    const payload = buildTemplateCreatePayload({ ...VALID, headerFormat: 'NONE', bodyText: 'Big sale today.', footerText: '', includeStopButton: false });
    expect(payload.components).toEqual([{ type: 'BODY', text: 'Big sale today.' }]);
  });

  it('builds a template with text header, utility category, and CTA buttons (URL and Phone)', () => {
    const ctaDraft = {
      name: 'order_status_update',
      category: 'UTILITY',
      language: 'en',
      headerFormat: 'TEXT',
      headerText: 'Order Dispatched',
      bodyText: 'Hi {{1}}, your order has shipped!',
      sampleName: 'Vikram',
      footerText: 'Garaaz Logistics',
      buttonType: 'CTA',
      ctaButtons: [
        { type: 'URL', text: 'Track Order', url: 'https://garaaz.com/track' },
        { type: 'PHONE_NUMBER', text: 'Call Us', phoneNumber: '+919257039785' },
      ],
    };

    expect(validateTemplateDraft(ctaDraft)).toEqual({});
    expect(buildTemplateCreatePayload(ctaDraft)).toEqual({
      name: 'order_status_update',
      language: 'en',
      category: 'UTILITY',
      parameter_format: 'POSITIONAL',
      components: [
        { type: 'HEADER', format: 'TEXT', text: 'Order Dispatched' },
        { type: 'BODY', text: 'Hi {{1}}, your order has shipped!', example: { body_text: [['Vikram']] } },
        { type: 'FOOTER', text: 'Garaaz Logistics' },
        {
          type: 'BUTTONS',
          buttons: [
            { type: 'URL', text: 'Track Order', url: 'https://garaaz.com/track' },
            { type: 'PHONE_NUMBER', text: 'Call Us', phone_number: '+919257039785' },
          ],
        },
      ],
    });
  });

  it('builds a template with COPY_CODE button', () => {
    const copyDraft = {
      name: 'promo_coupon',
      category: 'MARKETING',
      language: 'en',
      headerFormat: 'NONE',
      bodyText: 'Use code below for 25% discount.',
      buttonType: 'CTA',
      ctaButtons: [{ type: 'COPY_CODE', text: 'Copy Coupon', example: 'SALE25' }],
    };

    expect(buildTemplateCreatePayload(copyDraft).components).toContainEqual({
      type: 'BUTTONS',
      buttons: [{ type: 'COPY_CODE', example: 'SALE25' }],
    });
  });
});
