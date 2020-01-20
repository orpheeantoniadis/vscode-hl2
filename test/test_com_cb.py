count = [0] * 4

def arrow(coords, arrow_type='LEFT', color=ROUGE):
    if arrow_type.upper() == 'UP':
        for x in range(3):
            allumer_led(coords[0] + x, coords[1], color)
        allumer_led(coords[0] + 1, coords[1] + 1, color)
    if arrow_type.upper() == 'DOWN':
        for x in range(3):
            allumer_led(coords[0] + x, coords[1] + 1, color)
        allumer_led(coords[0] + 1, coords[1], color)
    if arrow_type.upper() == 'LEFT':
        for y in range(3):
            allumer_led(coords[0] + 1, coords[1] + y, color)
        allumer_led(coords[0], coords[1] + 1, color)
    if arrow_type.upper() == 'RIGHT':
        for y in range(3):
            allumer_led(coords[0], coords[1] + y, color)
        allumer_led(coords[0] + 1, coords[1] + 1, color)

def blink_screen(blink_count=5, color=ROUGE, interval_sec=0.1):
    for _ in range(blink_count):
        allumer_tout(color)
        delai(interval_sec)
        eteindre_tout()
        delai(interval_sec)

def touch_so_cb():
    global count
    arrow((1, 1), 'UP', VERT)
    count[0] = 1

def touch_se_cb():
    global count
    arrow((6, 1), 'UP', VERT)
    count[1] = 1

def touch_no_cb():
    global count
    arrow((1, 7), 'UP', VERT)
    count[2] = 1

def touch_ne_cb():
    global count
    arrow((6, 7), 'UP', VERT)
    count[3] = 1

def test_uart():
    global count
    arrow((1, 3), 'LEFT', ROUGE)
    arrow((8, 3), 'RIGHT', ROUGE)
    arrow((4, 7), 'UP', ROUGE)
    arrow((4, 1), 'DOWN', ROUGE)
    count = [0] * 4
    hl2.touch.attach(0, touch_so_cb)
    hl2.touch.attach(1, touch_se_cb)
    hl2.touch.attach(2, touch_no_cb)
    hl2.touch.attach(3, touch_ne_cb)

    while sum(count) < 4:
        pass

    hl2.touch.detach(0)
    hl2.touch.detach(1)
    hl2.touch.detach(2)
    hl2.touch.detach(3)
    blink_screen(color=VERT)

def test_touch():
    global count

    arrow((1, 1), 'UP', ROUGE)
    arrow((1, 7), 'UP', ROUGE)
    arrow((6, 1), 'UP', ROUGE)
    arrow((6, 7), 'UP', ROUGE)

    hl2.touch.attach(0, touch_so_cb)
    hl2.touch.attach(1, touch_se_cb)
    hl2.touch.attach(2, touch_no_cb)
    hl2.touch.attach(3, touch_ne_cb)

    while sum(count) < 4:
        pass

    hl2.touch.detach(0)
    hl2.touch.detach(1)
    hl2.touch.detach(2)
    hl2.touch.detach(3)

    blink_screen(color=VERT)

if __name__ == '__main__':
    test_touch()
    eteindre_tout()