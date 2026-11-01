// Local mock of the four gateway protocols AS IMPLEMENTED in src/server/payments/providers.
// For testing the store logic only; it is NOT the real gateway. Usage: node scripts/mock-gateways.js
// Env for the store: see "Testing payments locally" in README.md. MOCK_MODE=badsig|badamount for negative tests.
const http = require('http');
const crypto = require('crypto');
const SALT = 'jcsalt1234', SP_WH = 'spwebhooksecret', PF_KEY = 'pfsecuredkey', PF_MID = '102', EP_KEY = '0123456789abcdef';
const state = { sp: {}, jc: {}, ep: {}, mode: process.env.MOCK_MODE || 'ok' };
const html = (action, fields) => `<html><body><form id=f method=POST action="${action}">${Object.entries(fields).map(([k, v]) => `<input type=hidden name="${k}" value="${String(v).replace(/"/g, '&quot;')}">`).join('')}</form><script>f.submit()</script></body></html>`;
const jcHash = (f) => { const keys = Object.keys(f).filter(k => k.toLowerCase().startsWith('pp') && k !== 'pp_SecureHash' && f[k] !== '').sort(); return crypto.createHmac('sha256', SALT).update([SALT, ...keys.map(k => f[k])].join('&')).digest('hex').toUpperCase(); };
const body = (req) => new Promise(r => { let d = ''; req.on('data', c => d += c); req.on('end', () => r(d)); });
const log = (...a) => console.log('[mock]', ...a);

http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost:4010');
  const raw = await body(req);
  const form = Object.fromEntries(new URLSearchParams(raw));
  const send = (code, obj, type = 'application/json') => { res.writeHead(code, { 'Content-Type': type }); res.end(typeof obj === 'string' ? obj : JSON.stringify(obj)); };
  // --- Safepay ---
  if (u.pathname === '/order/payments/v3/') {
    if (req.headers['x-sfpy-merchant-secret'] !== 'spsecret') return send(401, { error: 'auth' });
    const j = JSON.parse(raw); const t = 'track_' + crypto.randomBytes(4).toString('hex'); state.sp[t] = { amount: j.amount, state: 'TRACKER_STARTED' };
    log('safepay setup', j.amount, t); return send(200, { data: { tracker: { token: t } } });
  }
  if (u.pathname === '/client/passport/v1/token') return send(200, { data: 'tbt_' + crypto.randomBytes(4).toString('hex') });
  if (u.pathname.startsWith('/reporter/api/v2/payments/')) { const t = u.pathname.split('/').pop(); const s = state.sp[t]; return send(200, { data: { state: s?.state || 'UNKNOWN', amount: s?.amount } }); }
  if (u.pathname === '/embedded') {
    const t = u.searchParams.get('tracker'); state.sp[t].state = 'PAID';
    const payload = JSON.stringify({ token: 'evt_' + t, type: 'payment.succeeded', data: { tracker: t, amount: state.mode === 'badamount' ? 1 : state.sp[t].amount } });
    const sig = crypto.createHmac('sha512', state.mode === 'badsig' ? 'wrong' : SP_WH).update(payload).digest('hex');
    if (state.mode === 'badamount') state.sp[t].amount = 1;
    const r = await fetch('http://localhost:3000/api/payments/safepay/callback', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-SFPY-SIGNATURE': sig }, body: payload });
    log('safepay webhook ->', r.status, await r.text());
    const r2 = await fetch('http://localhost:3000/api/payments/safepay/callback', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-SFPY-SIGNATURE': sig }, body: payload });
    log('safepay webhook replay ->', r2.status, await r2.text());
    res.writeHead(302, { Location: u.searchParams.get('redirect_url') }); return res.end();
  }
  // --- JazzCash ---
  if (u.pathname === '/jc/form') {
    const ok = jcHash(form) === form.pp_SecureHash; log('jazzcash form hash valid:', ok, 'amount', form.pp_Amount);
    state.jc[form.pp_TxnRefNo] = { amount: form.pp_Amount, paid: ok };
    const resp = { pp_ResponseCode: ok ? '000' : '110', pp_ResponseMessage: ok ? 'Thank you' : 'bad hash', pp_TxnRefNo: form.pp_TxnRefNo, pp_Amount: form.pp_Amount, pp_MerchantID: form.pp_MerchantID, pp_BillReference: form.pp_BillReference };
    resp.pp_SecureHash = jcHash(resp);
    return send(200, html(form.pp_ReturnURL, resp), 'text/html');
  }
  if (u.pathname === '/jc/inquiry') {
    const j = JSON.parse(raw); const okHash = jcHash(j) === j.pp_SecureHash; const t = state.jc[j.pp_TxnRefNo];
    const resp = okHash && t ? { pp_ResponseCode: '000', pp_ResponseMessage: 'ok', pp_PaymentResponseCode: t.paid ? '121' : '199', pp_Status: t.paid ? 'Completed' : 'Failed', pp_TxnRefNo: j.pp_TxnRefNo, pp_Amount: t.amount } : { pp_ResponseCode: '110', pp_ResponseMessage: 'invalid' };
    resp.pp_SecureHash = jcHash(resp); log('jazzcash inquiry', j.pp_TxnRefNo, resp.pp_PaymentResponseCode); return send(200, resp);
  }
  // --- Easypaisa ---
  if (u.pathname === '/ep/index') {
    const { merchantHashedReq, ...rest } = form; const text = Object.keys(rest).filter(k => rest[k] !== '').sort().map(k => `${k}=${rest[k]}`).join('&');
    const c = crypto.createCipheriv('aes-128-ecb', Buffer.from(EP_KEY), null); const exp = Buffer.concat([c.update(text), c.final()]).toString('base64');
    log('easypaisa hash valid:', exp === merchantHashedReq, 'amount', form.amount);
    state.ep[form.orderRefNum] = { amount: form.amount, status: 'INITIATED' };
    const sep = form.postBackURL.includes('?') ? '&' : '?'; res.writeHead(302, { Location: `${form.postBackURL}${sep}auth_token=tok123` }); return res.end();
  }
  if (u.pathname === '/ep/confirm') {
    const ref = new URL(form.postBackURL).searchParams.get('ref'); state.ep[ref].status = 'PAID'; log('easypaisa confirm', form.auth_token, ref);
    res.writeHead(302, { Location: `${form.postBackURL}&status=0000&desc=success&orderRefNumber=${ref}` }); return res.end();
  }
  if (u.pathname === '/ep/inquiry') {
    const j = JSON.parse(raw); const okAuth = req.headers['credentials'] === Buffer.from('epuser:eppass').toString('base64'); const t = state.ep[j.orderId];
    log('easypaisa inquiry', j.orderId, okAuth, t?.status);
    return send(200, okAuth && t ? { responseCode: '0000', transactionStatus: t.status, transactionAmount: t.amount, transactionId: 'EP' + j.orderId } : { responseCode: '0001' });
  }
  // --- PayFast ---
  if (u.pathname === '/pf/token') { log('payfast token', form.BASKET_ID, form.TXNAMT, form.SECURED_KEY === PF_KEY); return send(200, { ACCESS_TOKEN: 'pftok' }); }
  if (u.pathname === '/pf/post') {
    const err = '000'; const vh = crypto.createHash('sha256').update(`${form.BASKET_ID}|${PF_KEY}|${PF_MID}|${err}`).digest('hex');
    const ipn = new URLSearchParams({ err_code: err, err_msg: 'Success', basket_id: form.BASKET_ID, transaction_id: 'PF' + Date.now(), validation_hash: vh, transaction_amount: form.TXNAMT });
    const r = await fetch(form.CHECKOUT_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: ipn });
    log('payfast IPN ->', r.status, await r.text());
    res.writeHead(302, { Location: form.SUCCESS_URL + '&err_code=000' }); return res.end();
  }
  send(404, { error: 'not mocked ' + u.pathname });
}).listen(4010, () => log('listening 4010 mode=' + state.mode));
