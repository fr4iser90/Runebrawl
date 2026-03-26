# `nix-shell` / `nix develop` — toolchain for asset pipeline + Node (same as local dev).
# Usage:
#   nix-shell
#   npm run assets:optimize
#
# Or one-shot:
#   nix-shell -p libwebp --run 'cwebp -q 85 in.png -o out.webp'
let
  pkgs = import <nixpkgs> { };
in
pkgs.mkShell {
  packages = with pkgs; [
    libwebp # cwebp, dwebp
    nodejs_22
  ];

  shellHook = ''
    echo "Runebrawl dev shell: node $(node -v), cwebp ($(command -v cwebp))"
  '';
}
