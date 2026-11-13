"""Rebuild data/itinerary.json for Day 3–4: meals with options, rain plans, drive estimates.

Drive time is an estimate: straight-line distance x 1.35 road factor at 42 km/h, plus 5 min to park.
"""
import json, math, sys

path = sys.argv[1]
d = json.load(open(path))

JEJU_CITY = (33.50, 126.53)

def drive_min(a, b):
    if not a or not b:
        return None
    R = 6371
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    km = 2 * R * math.asin(math.sqrt(h)) * 1.35
    m = km / 42 * 60 + 5
    return int(round(m / 5.0) * 5)

def S(time, name, name_ko, lat, lng, cat, dur, tips=None, **kw):
    s = {"time": time, "name": name, "name_ko": name_ko, "lat": lat, "lng": lng,
         "category": cat, "duration_min": dur, "tips": tips or []}
    s.update(kw)
    return s

def O(name, name_ko, q, hours, closed=None, note="", verified=True):
    # closed: list of weekday numbers (0=Sun ... 6=Sat)
    return {"name": name, "name_ko": name_ko, "q": q, "hours": hours, "closed": closed or [],
            "note": note, "verified": verified}

# ---------------- Day 3 (Sat 11/28) ----------------
day3 = [
    S("08:15", "從濟州市出發", "제주시", None, None, "transport", 0, ["走 5·16 道路（1131）翻過漢拏山"], from_city=True),
    S("09:20", "柑橘博物館（摘橘）", "감귤박물관", 33.2715236, 126.6076604, "experience", 75,
      ["公營果園摘橘，約 1kg（去年 5,000 韓元）", "下雨不開放摘橘，展館照開", "11 月中後橘子轉全橘色"]),
    S("11:00", "自求里公園＋李仲燮街＋每日偶來市場", "자구리공원", 33.2421829, 126.5671908, "walk", 90,
      ["海邊有湧泉，在地人散步的地方", "市場吃點小吃就好，午餐留到大坪里", "市場有頂棚，下雨也能逛"]),
    S("13:10", "午餐：大坪里", "대평리", 33.2397, 126.3609, "food", 60, [], approx=True,
      options=[
          O("용왕난드르 향토음식점（鄉土料理）", "용왕난드르 향토음식점", "용왕난드르 향토음식점 대평",
            "營業時間未公開，出發前用 Naver 確認", [], "招牌是海螺(보말)麵疙瘩、烤鯖魚，就在大坪村口", verified=False),
          O("춘미향식당（切片豬肉定食）", "춘미향식당", "춘미향식당 안덕",
            "營業時間未公開，出發前確認", [], "在地小店，돔베고기定食、老闆自己釣的魚", verified=False),
      ]),
    S("14:15", "大坪浦口／朴水崖", "대평포구 / 박수기정", 33.2365477, 126.3566699, "nature", 55,
      ["偶來 9 號起點，走「몰질」古馬道上崖頂約 30 分"]),
    S("15:20", "安德溪谷", "안덕계곡", 33.2573447, 126.3528872, "nature", 25, ["短步道"]),
    S("16:10", "Alddreu 機場遺址＋섯알오름", "알뜨르비행장 / 섯알오름", 33.2046995, 126.276827, "history", 45,
      ["日軍機庫散在田間", "4·3 遺址，請保持安靜", "停섯알오름學殺터停車場"]),
    S("17:05", "沙溪海岸看兄弟島夕陽", "사계해안 / 형제섬", 33.2099736, 126.3143349, "sunset", 35,
      ["風很大，帽子拿好"]),
    S("17:55", "晚餐：摹瑟浦港大方魚", "모슬포항", 33.2161533, 126.2505362, "food", 90,
      ["11 月起大方魚當季", "方魚節 11/19–22 已結束，港邊人少"],
      options=[
          O("항구식당", "항구식당", "항구식당 모슬포 하모항구로 64", "約 10:00–21:50（15:00–16:00 休息）", [],
            "老港口食堂，方魚生魚片附烤鯖魚和湯；時間是幾年前的資料，出發前再確認", verified=False),
          O("수눌음", "수눌음", "수눌음 모슬포 하모항구로 50", "營業時間出發前確認", [],
            "大方魚＋鯖魚生魚片套餐，在地人每年都會去", verified=False),
          O("신영수산（外帶）", "신영수산", "신영수산 모슬포", "營業時間出發前確認", [],
            "只能外帶，便宜量多；可以帶回住處吃", verified=False),
      ]),
    S("19:25", "開回濟州市住宿", "제주시", None, None, "transport", 0,
      ["走平和路（1135）約 1 小時，到住處約 20:30", "晚上中山間路段起霧要慢開"], to_city=True, drive=None),
]

rain3 = [
    S("08:15", "從濟州市出發", "제주시", None, None, "transport", 0, [], from_city=True),
    S("09:20", "柑橘博物館（只看展館）", "감귤박물관", 33.2715236, 126.6076604, "experience", 60,
      ["下雨不開摘橘，展館和溫室照開", "出口有時會送一袋在地橘子"]),
    S("10:40", "왈종美術館", "왈종미술관", 33.2470, 126.5717, "history", 60,
      ["李왈종畫家的美術館，白瓷杯造型建築", "10:00–18:00，週一休", "成人 10,000 韓元"], approx=True),
    S("11:50", "午餐：每日偶來市場（有頂棚）", "서귀포매일올레시장", 33.2494, 126.5636, "food", 60,
      ["옛날순대 週六開到 14:30"], approx=True),
    S("13:40", "本態博物館（安藤忠雄）", "본태박물관", 33.3036, 126.3906, "history", 90,
      ["清水模建築，傳統工藝＋現代藝術", "全年無休，時間出發前確認"], approx=True),
    S("15:40", "濟州秋史館（承孝相）", "제주추사관", 33.2426, 126.2756, "history", 50,
      ["09:00–18:00（17:30 停止入場），免費", "週一休"], approx=True),
    S("16:50", "摹瑟浦港看海、喝咖啡等晚餐", "모슬포항", 33.2161533, 126.2505362, "walk", 60, [], drive=10),
    S("17:55", "晚餐：摹瑟浦港大方魚", "모슬포항", 33.2161533, 126.2505362, "food", 90, ["同晴天行程的餐廳"],
      same_as="晚餐：摹瑟浦港大方魚"),
    S("19:25", "開回濟州市住宿", "제주시", None, None, "transport", 0, ["約 1 小時"], to_city=True, drive=None),
]

# ---------------- Day 4 (Sun 11/29) ----------------
day4 = [
    S("08:00", "退房，從濟州市出發", "제주시", None, None, "transport", 0, ["行李放車上", "走平和路到高山"], from_city=True),
    S("09:10", "水月峰＋엉알 地質步道", "수월봉", 33.2944141, 126.1628076, "nature", 75, ["火山灰層斷崖", "看遮歸島"], drive=60),
    S("10:40", "新昌風車海岸路", "신창풍차해안도로", 33.3433637, 126.173963, "drive", 30, ["風很大，帽子拿好"]),
    S("11:30", "楮旨岳", "저지오름", 33.3333342, 126.2506728, "nature", 60, ["環繞步道平緩", "火口階梯很陡，可略過"]),
    S("12:50", "午餐：翰林", "한림", 33.3985, 126.2490, "food", 60, [], approx=True,
      options=[
          O("한림칼국수（海螺刀削麵）", "한림칼국수", "한림칼국수 제주본점",
            "週日 08:00–15:30（15:00 最後點餐），週三休", [3], "常要排隊，到了先抽號碼牌"),
          O("재암식당（海鮮砂鍋）", "재암식당", "재암식당 한림로 346", "營業時間出發前確認", [],
            "挾才的社區食堂，砂鍋、烤方頭魚", verified=False),
          O("대금식당（燉白帶魚）", "대금식당", "대금식당 옹포", "營業時間出發前確認", [],
            "燉白帶魚很有名，但排隊 1–2 小時，趕時間就別去", verified=False),
      ]),
    S("14:00", "金陵海水浴場", "금능해수욕장", 33.3898565, 126.235364, "beach", 40, ["比挾才安靜", "看飛揚島"]),
    S("15:05", "涯月海岸路兜風", "애월해안도로", 33.4636, 126.3093, "drive", 30, ["沿 1132 往東開，邊開邊停"], approx=True),
    S("15:55", "早晚餐：下貴", "하귀", 33.4830, 126.4020, "food", 50, ["很多店 15–17 點休息，出發前確認"], approx=True,
      options=[
          O("제주 할망밥상 애월점（烤魚套餐）", "제주 할망밥상 애월점", "제주 할망밥상 하귀9길 8",
            "營業時間出發前確認", [], "8 種烤魚＋炒豬肉的套餐", verified=False),
          O("동경밥상 제주점（鰻魚飯）", "동경밥상 제주점", "동경밥상 제주점 하귀", "營業時間出發前確認", [],
            "海景鰻魚飯，排隊久", verified=False),
          O("改在機場吃", "제주국제공항", "제주국제공항", "—", [], "如果店家下午休息，就直接去機場 3 樓吃"),
      ]),
    S("16:50", "加油（還車前要加滿）", "주유소", 33.4800, 126.3900, "transport", 10,
      ["沒加滿會被收補油費", "先在下貴這裡加，之後不用再繞"], approx=True, search_q="하귀 주유소"),
    S("17:10", "舊嚴里石鹽田 看夕陽", "구엄리 돌염전", 33.4835042, 126.3764434, "sunset", 30, []),
    S("18:05", "還車 → 接駁車到機場", "제주공항 렌터카", 33.4980, 126.4880, "transport", 30,
      ["依租車公司營業所，接駁約 10–15 分", "日落後就出發，別拖"], approx=True, search_q="제주공항 렌터카하우스", drive=20),
    S("18:35", "濟州機場（國際線）", "제주국제공항", 33.5070772, 126.4934311, "transport", 0,
      ["IT633 20:20 起飛，國際線通常起飛前 1 小時關櫃", "比建議的 2 小時前晚一點：想保險就把舊嚴里夕陽拿掉"], drive=0, warn="tight"),
]

rain4 = [
    S("08:00", "退房，從濟州市出發", "제주시", None, None, "transport", 0, [], from_city=True),
    S("09:10", "濟州現代美術館（楮旨文化藝術村）", "제주현대미술관", 33.3326, 126.2659, "history", 75,
      ["週一休", "藝術村裡散步也很舒服"], approx=True, drive=45),
    S("10:35", "金昌烈美術館（水滴畫家）", "김창열미술관", 33.3376, 126.2667, "history", 60,
      ["週二–週日 09:00–18:00，週一休", "成人 2,000 韓元"], approx=True),
    S("12:00", "午餐：翰林", "한림", 33.3985, 126.2490, "food", 60, ["同晴天行程的餐廳"], approx=True,
      same_as="午餐：翰林"),
    S("13:15", "翰林每日市場", "한림매일시장", 33.4100, 126.2680, "walk", 45,
      ["在地人買菜的市場，不是觀光市場", "08:00–20:00（依店家）"], approx=True),
    S("14:30", "涯月海景咖啡廳躲雨", "애월 카페", 33.4636, 126.3093, "food", 75, ["挑看得到海的窗邊位子"], approx=True),
    S("16:15", "東門市場：買伴手禮＋吃晚餐", "동문재래시장", 33.5117, 126.5272, "food", 85,
      ["有頂棚，下雨不怕", "橘子、餅乾伴手禮，市場小吃當晚餐", "離機場 10 分鐘"], approx=True, drive=30),
    S("17:50", "加油（機場附近）", "주유소", 33.4950, 126.4950, "transport", 10, ["還車前要加滿"], approx=True,
      search_q="제주공항 근처 주유소"),
    S("18:05", "還車 → 接駁車到機場", "제주공항 렌터카", 33.4980, 126.4880, "transport", 30, [], approx=True,
      search_q="제주공항 렌터카하우스", drive=5),
    S("18:35", "濟州機場（國際線）", "제주국제공항", 33.5070772, 126.4934311, "transport", 0, [], drive=0),
]

def resolve_same(rain, sunny):
    by = {s["name"]: s for s in sunny}
    for s in rain:
        ref = s.pop("same_as", None)
        if ref and ref in by and "options" in by[ref]:
            s["options"] = by[ref]["options"]
    return rain

def add_drive(stops):
    prev = None
    for s in stops:
        here = JEJU_CITY if s.get("from_city") or s.get("to_city") else (s["lat"], s["lng"]) if s["lat"] is not None else None
        if s.get("inline_meal"):
            s["drive_min"] = None
            continue
        if "drive" in s:
            s["drive_min"] = s.pop("drive")
        elif s.get("to_city"):
            s["drive_min"] = None
        elif prev is not None and here is not None and not s.get("from_city"):
            s["drive_min"] = drive_min(prev, here)
        else:
            s["drive_min"] = None
        if here is not None:
            prev = here
    return stops

rain3 = resolve_same(rain3, day3)
rain4 = resolve_same(rain4, day4)
for lst in (day3, rain3, day4, rain4):
    add_drive(lst)

d["days"][2]["stops"] = day3
d["days"][2]["rain_plan"] = {"note": "南部全在戶外：下雨改走美術館路線，晚餐照樣吃大方魚", "stops": rain3}
d["days"][3]["stops"] = day4
d["days"][3]["rain_plan"] = {"note": "西部改看楮旨藝術村的美術館，最後在東門市場買伴手禮", "stops": rain4}
d["trip"]["drive_note"] = "車程是用直線距離估算（×1.35、時速 42 公里、加 5 分鐘停車），實際以 Kakao 導航為準"
json.dump(d, open(path, "w"), ensure_ascii=False, indent=2)

for name, lst in (("Day3", day3), ("Rain3", rain3), ("Day4", day4), ("Rain4", rain4)):
    print(name)
    for s in lst:
        print(f"  {s['time']}  +{s.get('drive_min')}  {s['duration_min']}  {s['name']}")
