# ErgoDox EZ Keymap

Layout: https://configure.zsa.io/ergodox-ez/layouts/mXEoP/latest/0

## Updating

1. Make changes in [Oryx](https://configure.zsa.io/ergodox-ez/layouts/mXEoP/latest/0)
2. Click **Download Source** → copy the share URL (e.g. `https://oryx.zsa.io/source/DzYGoJ`)
3. Run:

```sh
curl -sL <source-url> -o /tmp/ergodox.zip
unzip -o /tmp/ergodox.zip "*/config.h" "*/keymap.c" "*/rules.mk" "*/keymap.json" -d /tmp/ergodox_src
cp /tmp/ergodox_src/*/config.h /tmp/ergodox_src/*/keymap.c /tmp/ergodox_src/*/rules.mk /tmp/ergodox_src/*/keymap.json ~/dotfiles/ergodox/
```
