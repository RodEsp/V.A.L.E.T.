const Cap = require('cap').Cap;
const decoders = require('cap').decoders;
const PROTOCOL = decoders.PROTOCOL;

console.log(JSON.stringify(Cap.deviceList(), null, 2));

const cap = new Cap();
// The device needs to be changes to the appropriate network device for the machine this is being run on, you can also use the IP address assigned to the machine with Cap.findDevice();
const device = "wlan0"; // Cap.findDevice('10.100.2.85');

console.log(`Device = ${device}`);

const pcap_filter = 'arp'; // We are only interested in ARP packets - https://en.wikipedia.org/wiki/Address_Resolution_Protocol
const bufSize = 10 * 1024 * 1024;
const buffer = Buffer.alloc(65535);

const linkType = cap.open(device, pcap_filter, bufSize, buffer);

cap.setMinBytes && cap.setMinBytes(0);

const hexToIP = (hexString) => {
  let bytes = hexString.match(/.{2}/g);

  return bytes.reduce((acc, hexByte) => `${acc}.${parseInt(hexByte, 16)}`, '').substring(1);
};

cap.on('packet', (nbytes, trunc) => {
  // The first 6 bytes of a packet are the destination MAC Address
  // The second 6 bytes of a packet are the source MAC Address
  // See: https://en.wikipedia.org/wiki/Ethernet_frame for more information on a packet's makeup
  const sourceMacAddress = buffer.toString('hex', 6, 12).match(/.{2}/g).join(':');

  if (linkType === 'ETHERNET') {
    let packet = decoders.Ethernet(buffer);

    console.log(`New packet:
  ${nbytes} bytes, truncated? ${trunc}`);

    packet = decoders.ARP(buffer, packet.offset);
    console.log(`  Sender MAC Address: ${packet.info.sendermac}${packet.info.sendermac === 'c8:2a:dd:b0:7d:9d' ? ' - MY PHONE!!!' : ''}`);
    console.log(`  Sender IP Address: ${packet.info.senderip}
  Target IP Address: ${packet.info.targetip}
  IPv4 Protocol: ${PROTOCOL.ETHERNET[packet.info.protocol]}`);
  }
});
