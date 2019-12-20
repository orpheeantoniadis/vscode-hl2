# Visual Studio Code extension for hepiaLight2

Welcome to the Visual Studio Code extension for hepiaLight2 ! The hepiaLight2 extension
makes it easy to run, deploy and debug your application in Visual Studio Code. This
extension allows you also to update your hepialight's firmware to the latest version
so you can use the newest functions to program your board.

## Features

 * Run opened python file on hepialight's interpreter
 * Upload opened file to hepialight's main file
 * Update hepialight to the latest firmware version

## Keybindings
- **hepiaLight2: Run** <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>R</kbd> *or* <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>R</kbd>
- **hepiaLight2: Upload** <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd> *or* <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd>

## Credits

This application relies heavily on [pymakr](https://marketplace.visualstudio.com/items?itemName=pycom.Pymakr) (by pycom) to handle the compilation of serialport to any platform.

# Known issues

## Error: Device or resource busy, cannot open /dev/ttyACM0

In Linux, (ModemManager will try to comunicate)[https://bugs.launchpad.net/modemmanager/+bug/700261] with the HepiaLight board
when connected. Please wait 10-15s after pluging the card to compensate for this.

Optionally, you can prevent ModemManager from communicating with the board.
To do this, copy the the udev rules file `udevrules/99-hepialight.rules` into `/etc/udev/rules.d`.

Apply these changes by running:

```{.bash}
udevadm control --reload-rules && udevadm trigger
```

## Permission issues

Be sure to add your user to the device group.

To check the device group execute `ls -al /dev/tty*`

Example under Ubuntu:

```{.bash}
ls -al /dev/ttyACM0
crw-rw---- 1 root dialout 166, 0 Nov  2 16:17 /dev/ttyACM0
```

In the example above the group is _dialout_.

To add your user to the group, execute:

```{.bash}
sudo usermod -a -G dialout $USER
```
