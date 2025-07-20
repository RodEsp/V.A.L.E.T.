{pkgs ? import <nixpkgs> {}}:
pkgs.mkShell {
  # Add libpcap as build input
  packages = with pkgs; [
    nodejs_20
    libpcap
    gcc
  ];

  # Set the environmetn variables requires for compliation
  shellHook = ''
    export CPATH="{$pkgs.libpcap}/include"
    export LIBRARY_PATH="${pkgs.libpcap}/lib"
    export LB_LIBRARY_PATH="${pkgs.libpcap}/lib"
  '';
}
