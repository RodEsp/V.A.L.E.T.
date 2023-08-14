# V.A.L.E.T.
*VisitAPI Automation & Location Estimation Terminal*

V.A.L.E.T. serves to automate checking into the RC Hub when you walk in. It does this by reading WiFi packets 
that every device sends out when it connects to the Recurse Center WiFi network. If it sees any packets that were sent
by a device whose [MAC Address](https://en.wikipedia.org/wiki/MAC_address) has been registered with it, it uses
the [Hub Visits API](https://github.com/recursecenter/wiki/wiki/Recurse-Center-API#hub-visits) to create a new visit
for the corresponding RCer.
