#!/usr/bin/env python
# -*- coding: utf-8 -*-

import sys
from hl2.program import *

if __name__ == "__main__":
    if len(sys.argv) > 1:
        firmware_path = sys.argv[1]
        programmer = HepiaLight2Programmer(firmware_path)
        if programmer.usb != None:
            programmer.start()
            print('hepiaLight2 successfully updated')
