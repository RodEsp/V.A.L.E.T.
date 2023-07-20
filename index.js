const Cap = require('cap').Cap;
const decoders = require('cap').decoders;
const PROTOCOL = decoders.PROTOCOL;

console.dir(JSON.stringify(Cap.deviceList(), null, 2));

const cap = new Cap();
const device = Cap.findDevice('10.100.0.1');

const pcap_filter = '';
const bufSize = 10 * 1024 * 1024;
const buffer = Buffer.alloc(65535);

const linkType = cap.open(device, pcap_filter, bufSize, buffer);

cap.setMinBytes && cap.setMinBytes(0);

cap.on('packet', (nbytes, trunc) => {
  const destinationMacAddress = buffer.toString('hex', 0, 6).match(/.{2}/g).join(':');
  const sourceMacAddress = buffer.toString('hex', 6, 12).match(/.{2}/g).join(':');

  const printPacketInfo = () => {
    console.log(`  packet: length ${nbytes} bytes, truncated? ${trunc}`);
    console.log(`  ${linkType}`);
    console.log(`  Destination MAC Address: ${destinationMacAddress}
Source MAC Address: ${sourceMacAddress}`);
  };

  switch (sourceMacAddress) {
    case '8c:85:90:9a:01:7d':
      printPacketInfo();
      break;
    case 'b8:27:eb:a0:fb:bb':
      console.log('WLAN0 Device');
      printPacketInfo();
      break;
    case 'c8:2a:dd:b0:7d:9d':
      console.log('MY PHONE!!!');
      printPacketInfo();
      break;
    default:
      break;
  }
});
