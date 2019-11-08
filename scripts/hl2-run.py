#!/usr/bin/env python
# -*- coding: utf-8 -*-

import sys
from hl2.run import *
            
if __name__ == "__main__":
    if len(sys.argv) > 1:
        path = sys.argv[1]
        uploader = HepiaLight2Uploader(path)
        if uploader.usb != None:
            uploader.send_file()
            uploader.deinit()
            print("Script send to hepialight2")
