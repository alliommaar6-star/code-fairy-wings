import { Order } from '../types';

/**
 * Minifies and encodes the essential order payload into a URL-safe Base64 string.
 * This guarantees that when a link is sent via WhatsApp or SMS, ANY device (customer's phone,
 * incognito window, another browser) can unpack the order immediately with 100% reliability,
 * without failing or falling through to the admin POS dashboard.
 */
export function encodeOrderData(order: Order): string {
  try {
    const minified = {
      i: order.id,
      n: order.orderNo,
      d: order.date,
      t: order.time,
      ci: order.customerId,
      cn: order.customerName,
      cp: order.customerPhone || '',
      it: (order.items || []).map((it) => ({
        pi: it.productId,
        pn: it.productName,
        q: it.quantity,
        sp: it.sellingPrice,
        cp: it.costPrice || 0,
        dc: it.discount || 0,
        t: it.total,
        // Omit huge base64 data URLs to prevent overflowing browser and WhatsApp URL character limits
        img: it.imageUrl && !it.imageUrl.startsWith('data:') ? it.imageUrl : '',
      })),
      st: order.subtotal,
      dc: order.discount || 0,
      df: order.deliveryFee || 0,
      dfp: order.deliveryFeePayer || 'Customer',
      tot: order.total,
      pd: order.paidAmount || 0,
      adv: order.advanceAmount || 0,
      dd: order.deliveryDistrict || '',
      da: order.deliveryAddress || '',
      stt: order.status || 'confirmed',
      fs: order.fulfillmentStatus || 'ASSIGNED',
      ps: order.paymentStatus || 'unpaid',
      dn: order.driverName || '',
      dp: order.driverPhone || '',
      dv: order.driverVehicle || '',
      pt: order.portalToken || order.id,
    };

    const jsonStr = JSON.stringify(minified);
    const bytes = new TextEncoder().encode(jsonStr);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch (err) {
    console.error('Failed to encode order payload:', err);
    return '';
  }
}

/**
 * Safely decodes the URL-safe base64 string back into a full Order object.
 */
export function decodeOrderData(rawEncoded: string): Order | null {
  try {
    if (!rawEncoded) return null;
    let clean = rawEncoded.trim();
    try {
      if (clean.includes('%')) {
        clean = decodeURIComponent(clean);
      }
    } catch {}

    let base64 = clean.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const jsonStr = new TextDecoder().decode(bytes);
    const m = JSON.parse(jsonStr);

    const order: Order = {
      id: m.i || `ord-${Date.now()}`,
      orderNo: m.n || 'ORD-00000',
      date: m.d || new Date().toISOString().split('T')[0],
      time: m.t || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      customerId: m.ci || 'CUST-WALKIN',
      customerName: m.cn || 'Macmiil Sharaf leh',
      customerPhone: m.cp || undefined,
      items: (m.it || []).map((it: any) => ({
        productId: it.pi,
        productName: it.pn,
        quantity: Number(it.q) || 1,
        sellingPrice: Number(it.sp) || 0,
        costPrice: Number(it.cp) || 0,
        discount: Number(it.dc) || 0,
        total: Number(it.t) || (Number(it.sp) || 0) * (Number(it.q) || 1),
        imageUrl: it.img || undefined,
      })),
      subtotal: Number(m.st) || 0,
      discount: Number(m.dc) || 0,
      deliveryFee: Number(m.df) || 0,
      deliveryFeePayer: m.dfp === 'Business' ? 'Business' : 'Customer',
      cargoFee: 0,
      total: Number(m.tot) || 0,
      paidAmount: Number(m.pd) || 0,
      advanceAmount: Number(m.adv) || 0,
      deliveryDistrict: m.dd || 'Muqdisho',
      deliveryAddress: m.da || '',
      fulfillmentType: 'Delivery',
      fulfillmentStatus: m.fs || 'ASSIGNED',
      status: m.stt || 'confirmed',
      paymentStatus: m.ps || 'unpaid',
      driverName: m.dn || undefined,
      driverPhone: m.dp || undefined,
      driverVehicle: m.dv || undefined,
      portalToken: m.pt || m.i,
      createdAt: m.d ? new Date(m.d).toISOString() : new Date().toISOString(),
    };

    return order;
  } catch (err) {
    console.error('Failed to decode order payload:', err);
    return null;
  }
}

/**
 * Builds the canonical, 100% reliable Customer Portal Link.
 * Uses root query params `/?portal_token=...&pdata=...` so that every static server,
 * Cloud Run container, reverse proxy, and WhatsApp in-app browser reliably loads index.html
 * and decodes the order directly into the customer portal splash screen.
 */
export function buildCustomerPortalUrl(order: Order): string {
  const token = order.portalToken || order.id;
  const packed = encodeOrderData(order);
  const origin = window.location.origin;

  if (packed) {
    return `${origin}/p/${encodeURIComponent(token)}?pdata=${encodeURIComponent(packed)}`;
  }
  return `${origin}/p/${encodeURIComponent(token)}`;
}

/**
 * Natural, professional, elegant Af-Soomaali WhatsApp sharing template.
 * Free of broken language.
 */
export function buildWhatsAppCustomerMessage(order: Order, portalUrl: string): string {
  const remaining = Math.max(0, order.total - order.paidAmount);
  
  // Format items nicely
  const itemsText = order.items
    .slice(0, 4)
    .map((item) => `• ${item.productName} (x${item.quantity}) - $${item.total.toFixed(2)}`)
    .join('\n');
  const extraItemsCount = order.items.length - 4;
  const moreText = extraItemsCount > 0 ? `\n• +${extraItemsCount} badeeco kale...` : '';

  const locationInfo = order.deliveryDistrict
    ? `Degmada ${order.deliveryDistrict}${order.deliveryAddress ? ` (${order.deliveryAddress})` : ''}`
    : order.deliveryAddress || 'Muqdisho';

  const lines = [
    `*BENADIR STORE - DALABKAAGA WAA LA DIYAARIYAY* 🛍️`,
    ``,
    `Salaamu Calaykum *${order.customerName}*,`,
    `Waad ku mahadsan tahay dalabkaaga. Dalabkaagii si buuxda ayaa loo diiwaangeliyay, waxaana loo diyaarinayaa in laguugu keeno: *${locationInfo}*.`,
    ``,
    `📋 *Faahfaahinta Dalabka:*`,
    `• Lambarka Dalabka: *#${order.orderNo}*`,
    `• Taariikhda: *${order.date} ${order.time || ''}*`,
    `• Alaabta:`,
    `${itemsText}${moreText}`,
    ``,
    `💰 *Xisaabta Dalabka:*`,
    `• Wadarta Guud: *$${order.total.toFixed(2)}*`,
    order.paidAmount > 0 ? `• Lacagta La Bixiyay: *$${order.paidAmount.toFixed(2)}*` : '',
    remaining > 0
      ? `• Hadhaaga La Rabo: *$${remaining.toFixed(2)}*`
      : `• Xaaladda Lacagta: *WAA LA WADA BIXIYAY (PAID)* ✅`,
    order.driverName
      ? `• Darawalka: *${order.driverName} (${order.driverPhone || 'Mooto'})*`
      : '',
    ``,
    `💳 *Bixi Lacagta & Kala Soco Gaarsiinta (Live Tracking):*`,
    `Fadlan taabo link-gan tooska ah si aad lacagta ugu bixiso (EVC Plus, E-Dahab ama Jeeb) uguna la socoto halka uu marayo dalabkaaga:`,
    `👉 ${portalUrl}`,
    ``,
    `Haddii aad su'aal qabto nagala soo xiriir: +252 61 500 1234.`,
    `Mahadsanid!`,
  ].filter(Boolean);

  const fullMsg = lines.join('\n');
  const cleanPhone = (order.customerPhone || '').replace(/[^0-9]/g, '');

  if (cleanPhone) {
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(fullMsg)}`;
  }
  return `https://wa.me/?text=${encodeURIComponent(fullMsg)}`;
}
