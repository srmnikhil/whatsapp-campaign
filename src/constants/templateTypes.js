/** Marketing template types Meta documents. Only `CUSTOM` can be created from this app. */
export const TEMPLATE_TYPES = Object.freeze([
  { value: 'CUSTOM', label: 'Custom', supported: true, description: 'The default. You pick any mix of header, body, footer and buttons. This is what this app creates.' },
  { value: 'CATALOG', label: 'Catalog', supported: false, description: 'Lets customers browse your product catalog inside WhatsApp.' },
  { value: 'COUPON_CODE', label: 'Coupon code', supported: false, description: 'Adds a button that copies a code to the customer\'s clipboard when tapped.' },
  { value: 'MEDIA_CARD_CAROUSEL', label: 'Media card carousel', supported: false, description: 'One text message with up to 10 horizontally scrollable media cards.' },
  { value: 'PRODUCT_CARD_CAROUSEL', label: 'Product card carousel', supported: false, description: 'One text message with up to 10 horizontally scrollable product cards.' },
  { value: 'SINGLE_PRODUCT', label: 'Single-product message', supported: false, description: 'One text message with a product card. Meta\'s page describes it almost the same as the product card carousel, so check Meta\'s docs before relying on this.' },
  { value: 'MULTI_PRODUCT', label: 'Multi-product message', supported: false, description: 'Showcases up to 30 products, in up to 10 sections, in one message.' },
  { value: 'LIMITED_TIME_OFFER', label: 'Limited-time offer', supported: false, description: 'Shows an expiry date and a countdown timer for an offer code.' },
  { value: 'CALL_PERMISSION_REQUEST', label: 'Call permission request', supported: false, description: 'Asks the customer for permission so your business can call them outside the customer service window.' },
]);
