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

def test_matrix():
    colors = [ROUGE, VERT, BLEU]
    for color in colors:
        allumer_tout(color)
        delai(1)

def test_touch():
    arrow((1, 1), 'UP', ROUGE)
    arrow((1, 7), 'UP', ROUGE)
    arrow((6, 1), 'UP', ROUGE)
    arrow((6, 7), 'UP', ROUGE)
    count = [0] * 4
    while sum(count) < 4:
        if touche_sud_ouest():
            arrow((1, 1), 'UP', VERT)
            count[0] = 1
        if touche_sud_est():
            arrow((6, 1), 'UP', VERT)
            count[1] = 1
        if touche_nord_ouest():
            arrow((1, 7), 'UP', VERT)
            count[2] = 1
        if touche_nord_est():
            arrow((6, 7), 'UP', VERT)
            count[3] = 1
    blink_screen(color=VERT)

def test_uart():
    eteindre_tout()
    arrow((1, 3), 'LEFT', ROUGE)
    arrow((8, 3), 'RIGHT', ROUGE)
    arrow((4, 7), 'UP', ROUGE)
    arrow((4, 1), 'DOWN', ROUGE)
    count = [0] * 4
    while sum(count) < 4:
        envoyer_msg(NORD, 'P')
        envoyer_msg(SUD, 'P')
        envoyer_msg(EST, 'P')
        envoyer_msg(OUEST, 'P')

        if recevoir_msg(NORD) == 'P':
            arrow((4, 7), 'UP', VERT)
            count[0] = 1
        if recevoir_msg(SUD) == 'P':
            arrow((4, 1), 'DOWN', VERT)
            count[1] = 1
        if recevoir_msg(EST) == 'P':
            arrow((8, 3), 'RIGHT', VERT)
            count[2] = 1
        if recevoir_msg(OUEST) == 'P':
            arrow((1, 3), 'LEFT', VERT)
            count[3] = 1
            
        delai(0.5)
    blink_screen(color=VERT)

if __name__ == '__main__':
    test_matrix()
    eteindre_tout()
