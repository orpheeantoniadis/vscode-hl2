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

def com_nord_cb():
    global count
    arrow((4, 7), 'UP', VERT)
    count[0] = 1

def com_sud_cb():
    global count
    arrow((4, 1), 'DOWN', VERT)
    count[1] = 1

def com_est_cb():
    global count
    arrow((8, 3), 'RIGHT', VERT)
    count[2] = 1

def com_ouest_cb():
    global count
    arrow((1, 3), 'LEFT', VERT)
    count[3] = 1

def test_com():
    global count
    arrow((1, 3), 'LEFT', ROUGE)
    arrow((8, 3), 'RIGHT', ROUGE)
    arrow((4, 7), 'UP', ROUGE)
    arrow((4, 1), 'DOWN', ROUGE)
    count = [0] * 4
    hl2.com.attach(NORD, com_nord_cb)
    hl2.com.attach(SUD, com_sud_cb)
    hl2.com.attach(EST, com_est_cb)
    hl2.com.attach(OUEST, com_ouest_cb)

    while sum(count) < 4:
        envoyer_msg(NORD, 'P')
        envoyer_msg(SUD, 'P')
        envoyer_msg(EST, 'P')
        envoyer_msg(OUEST, 'P')

    hl2.com.detach(NORD)
    hl2.com.detach(SUD)
    hl2.com.detach(EST)
    hl2.com.detach(OUEST)
    blink_screen(color=VERT)

if __name__ == '__main__':
    test_com()
    eteindre_tout()
