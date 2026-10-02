import { Order, OrderFulfillmentStatus, OrderPaymentStatus } from '../types';

export const MOGADISHU_DISTRICTS = [
  'Hodan',
  'Waberi',
  'Howlwadaag',
  'Wardhiigley (Warta Nabadda)',
  'Yaaqshiid',
  'Kaaran',
  'Shibis',
  'Shangaani',
  'Boondheere',
  'Xamar Weyne',
  'Xamar Jajab',
  'Dharkenley',
  'Wadajir (Medina)',
  'Dayniile',
  'Kaxda',
  'Huriwaa (Heliwa)',
  'Garasbaaley',
  'Gubadleey',
  'Daarasalaam',
];

export const STORE_PAYMENT_NUMBERS = {
  EVC_PLUS: '613888125',
  E_DAHAB: '622888125',
  JEEB: '613888125',
};

/**
 * Generates authoritative dynamic USSD string based on order amount
 */
export function generateUssdCode(
  method: 'EVC Plus' | 'E-Dahab' | 'Jeeb' | string,
  amount: number
): { code: string; telUrl: string; merchantNumber: string } {
  const roundedAmount = Math.ceil(Math.max(1, amount));

  if (method === 'E-Dahab') {
    const code = `*110*${STORE_PAYMENT_NUMBERS.E_DAHAB}*${roundedAmount}#`;
    return {
      code,
      telUrl: `tel:${encodeURIComponent(code)}`,
      merchantNumber: STORE_PAYMENT_NUMBERS.E_DAHAB,
    };
  }

  if (method === 'Jeeb') {
    const code = `*812*${STORE_PAYMENT_NUMBERS.JEEB}*${roundedAmount}#`;
    return {
      code,
      telUrl: `tel:${encodeURIComponent(code)}`,
      merchantNumber: STORE_PAYMENT_NUMBERS.JEEB,
    };
  }

  // Default: EVC Plus
  const code = `*712*${STORE_PAYMENT_NUMBERS.EVC_PLUS}*${roundedAmount}#`;
  return {
    code,
    telUrl: `tel:${encodeURIComponent(code)}`,
    merchantNumber: STORE_PAYMENT_NUMBERS.EVC_PLUS,
  };
}

export interface TrackingStepInfo {
  key: string;
  stepNumber: number;
  labelSomali: string;
  labelEnglish: string;
  description: string;
  isCurrent: boolean;
  isCompleted: boolean;
}

/**
 * Computes authoritative 9-stage tracking progression from real database fields
 */
export function getOrderTrackingStages(order: Order): TrackingStepInfo[] {
  const remaining = Math.max(0, order.total - order.paidAmount);
  const isPaidOrVerified = order.paymentStatus === 'verified' || order.paidAmount >= order.total;
  const isDriverAssigned = Boolean(order.driverId || order.driverName);
  const isPickedUp = order.fulfillmentStatus === 'PICKED_UP' || order.fulfillmentStatus === 'picked_up';
  const isOutForDelivery =
    order.fulfillmentStatus === 'IN_TRANSIT' ||
    order.fulfillmentStatus === 'in_transit' ||
    order.status === 'out_for_delivery';
  const isDelivered =
    order.fulfillmentStatus === 'DELIVERED' ||
    order.fulfillmentStatus === 'delivered' ||
    order.status === 'delivered';
  const isCompleted =
    order.status === 'Completed' ||
    order.status === 'completed' ||
    order.status === 'converted' ||
    Boolean(order.convertedSaleId);
  const isReady =
    order.fulfillmentStatus === 'READY' ||
    order.fulfillmentStatus === 'ready' ||
    order.status === 'ready' ||
    isDriverAssigned ||
    isPickedUp ||
    isOutForDelivery ||
    isDelivered ||
    isCompleted;
  const isPreparing =
    order.fulfillmentStatus === 'PREPARING' ||
    order.fulfillmentStatus === 'preparing' ||
    order.status === 'confirmed' ||
    isReady;

  // Determine highest reached stage index (1 to 9)
  let activeIndex = 1; // 1: Created

  if (isCompleted) {
    activeIndex = 9;
  } else if (isDelivered) {
    activeIndex = 8;
  } else if (isOutForDelivery) {
    activeIndex = 7;
  } else if (isPickedUp) {
    activeIndex = 6;
  } else if (isDriverAssigned) {
    activeIndex = 5;
  } else if (isReady) {
    activeIndex = 4;
  } else if (isPreparing) {
    activeIndex = 3;
  } else if (order.paidAmount > 0 || order.paymentStatus === 'customer_confirmed' || isPaidOrVerified) {
    activeIndex = 2; // Payment
  }

  const rawSteps = [
    {
      key: 'created',
      stepNumber: 1,
      labelSomali: 'Dalabka La Abuuray',
      labelEnglish: 'Order Created',
      description: 'Dalabkaaga si nabad ah ayaa loogu keydiyay nidaamka.',
    },
    {
      key: 'payment',
      stepNumber: 2,
      labelSomali: 'Bixinta Lacagta',
      labelEnglish: 'Payment Stage',
      description:
        remaining <= 0
          ? 'Lacagta dalabka oo dhan waa la wada bixiyay.'
          : order.paidAmount > 0
          ? `Hormaris $${order.paidAmount.toFixed(2)} ayaa la helay.`
          : 'Fadlan bixi hormarinta ama wadarta guud si degdeg loogu diyaariyo.',
    },
    {
      key: 'preparing',
      stepNumber: 3,
      labelSomali: 'Diyaarinta Alaabta',
      labelEnglish: 'Preparing',
      description: 'Badeecadahaaga waxaa si taxadar leh looga soo xulayaa bakhaarka.',
    },
    {
      key: 'ready',
      stepNumber: 4,
      labelSomali: 'Waa Diyaar',
      labelEnglish: 'Packed & Ready',
      description: 'Alaabtu waa xirmaysan tahay, waxayna diyaar u tahay raridda.',
    },
    {
      key: 'driver_assigned',
      stepNumber: 5,
      labelSomali: 'Darawal Loo Qoondeeyay',
      labelEnglish: 'Driver Assigned',
      description: order.driverName
        ? `Darawalka: ${order.driverName} (${order.driverPhone || 'Lama helin'}) ayaa loo xilsaaray.`
        : 'Darawal kuugu dhow ayaa loo diyaarinayaa.',
    },
    {
      key: 'picked_up',
      stepNumber: 6,
      labelSomali: 'Waa La Qaaday',
      labelEnglish: 'Picked Up',
      description: 'Darawalku wuxuu ka soo qaaday alaabta bakhaarka Banadir Store.',
    },
    {
      key: 'in_transit',
      stepNumber: 7,
      labelSomali: 'Jidka Kujira',
      labelEnglish: 'On The Way',
      description: 'Dalabkaagu wuxuu hadda ku soo socdaa goobtaada.',
    },
    {
      key: 'delivered',
      stepNumber: 8,
      labelSomali: 'La Gaarsiiyay',
      labelEnglish: 'Delivered',
      description: 'Dalabkaaga waxaa si guul leh laguugu wareejiyay goobtaadii.',
    },
    {
      key: 'completed',
      stepNumber: 9,
      labelSomali: 'Waa La Dhamaystiray',
      labelEnglish: 'Completed',
      description: 'Dalabka iyo lacag bixinta si buuxda ayaa loo dhamaystiray. Mahadsanid!',
    },
  ];

  return rawSteps.map((s) => ({
    ...s,
    isCompleted: s.stepNumber < activeIndex || (s.stepNumber === 9 && activeIndex === 9),
    isCurrent: s.stepNumber === activeIndex,
  }));
}

export function buildWhatsAppShareUrl(order: Order, portalUrl: string): string {
  const remaining = Math.max(0, order.total - order.paidAmount);
  const itemsSummary = order.items
    .slice(0, 3)
    .map((i) => `• ${i.productName} (x${i.quantity})`)
    .join('\n');
  const extra = order.items.length > 3 ? `\n• +${order.items.length - 3} badeecooyin kale...` : '';

  const msg = [
    `*BANADIR STORE - DALABKAAGA* 🛒`,
    `Tixraaca: *${order.orderNo}*`,
    `Macmiilka: *${order.customerName}*`,
    order.deliveryDistrict ? `Degmada: *${order.deliveryDistrict}*` : '',
    ``,
    `*Alaabta Dalabka:*`,
    itemsSummary + extra,
    ``,
    `Wadarta Guud: *$${order.total.toFixed(2)}*`,
    order.paidAmount > 0 ? `Bixiyay: *$${order.paidAmount.toFixed(2)}*` : '',
    remaining > 0 ? `Hadhaa: *$${remaining.toFixed(2)}*` : `Xaaladda: *WAA LA WADA BIXIYAY* ✅`,
    ``,
    `🔗 *Kala soco dalabkaaga oo bixi toos halkan:*`,
    portalUrl,
  ]
    .filter(Boolean)
    .join('\n');

  const phoneDigits = (order.customerPhone || '').replace(/[^0-9]/g, '');
  return `https://wa.me/${phoneDigits}?text=${encodeURIComponent(msg)}`;
}
