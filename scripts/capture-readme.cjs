const fs = require('fs');
const path = require('path');

(async () => {
  const outputDir = path.resolve(__dirname, '..', 'docs', 'images');
  fs.mkdirSync(outputDir, { recursive: true });
  const targets = await (await fetch('http://127.0.0.1:9334/json')).json();
  const target = targets.find(item => item.type === 'page');
  if (!target) throw new Error('Không tìm thấy tab Chrome CDP tại cổng 9334.');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }));
  let seq = 0;
  const pending = new Map();
  ws.onmessage = event => {
    const message = JSON.parse(event.data);
    if (!message.id) return;
    pending.get(message.id)?.(message);
    pending.delete(message.id);
  };
  const send = (method, params = {}) => new Promise(resolve => {
    const id = ++seq;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = expression => send('Runtime.evaluate', { expression, awaitPromise: true });
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const capture = async name => {
    const response = await send('Page.captureScreenshot', { format: 'jpeg', quality: 88, fromSurface: true });
    fs.writeFileSync(path.join(outputDir, name), Buffer.from(response.result.data, 'base64'));
  };

  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'file:///D:/DENSO_SMARTMAINTAI/index.html' });
  await wait(1200);
  await capture('login.jpg');
  await evaluate("SM.login('u-minh')");
  await wait(500);
  await capture('maintenance-dashboard.jpg');
  await evaluate("SM.actions['guide-open']()");
  await wait(350);
  await capture('demo-roadmap.jpg');
  ws.close();
  console.log(`Đã tạo ảnh README tại ${outputDir}`);
})().catch(error => {
  console.error(error);
  process.exit(1);
});
