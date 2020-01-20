from machine import Timer

period = 100
led = 0

def blink_led():
    global led
    if led == 1:
        allumer_led(0, 0, VERT)
        led = 0
    else:
        eteindre_led(0, 0)
        led = 1

timer = Timer(mode = Timer.PERIODIC, period = period, callback = blink_led)
