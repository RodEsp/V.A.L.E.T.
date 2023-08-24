#!/bin/bash

# This script should be run by systemd at startup on the machine that V.A.L.E.T. runs on.
#   Use `systemctl status valet` to check its status

# If you are adding V.A.L.E.T. to a new machine you must create a service file for it under /etc/systemd/system/valet.service
#  with the following contents:
#   [Unit]
#   Description=V.A.L.E.T.
#   
#   [Service]
#   ExecStart/home/pirc/V.A.L.E.T.
#   
#   [Install]
#   WantedBy=multi-user.target
# Then register it to run on startup with systemd by running 
#   `systemctl enable valet`

# The following line assumes node was installed on the machine this is running on using fnm version manager.
/home/pirc/.local/share/fnm/aliases/default/bin/node /home/pirc/V.A.L.E.T./src/server.js