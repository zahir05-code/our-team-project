# -*- coding: utf-8 -*-
import sys, os, urllib.request, json
sys.path.insert(0, os.path.dirname(__file__))

data = json.dumps({
    "age": 58,
    "region": "서울특별시",
    "district": "노원구",
    "life_situations": ["갑작스러운 위기 상황이에요"],
    "family_status": "혼자 살고 있어요",
    "income_range": None, "gender": None, "work_status": None
}).encode("utf-8")

req = urllib.request.Request(
    "http://localhost:8000/welfare/search",
    data=data,
    headers={"Content-Type": "application/json"}
)
with urllib.request.urlopen(req) as resp:
    d = json.load(resp)
    ont = d.get("ontology")
    if ont is None:
        print("ontology: NULL (없음)")
    else:
        s = ont["summary"]
        print(f"[OK] ontology 정상! definite={s['definite_count']}, possible={s['possible_count']}, future={s['future_count']}")
        if ont["definite"]:
            name = ont["definite"][0]["name"]
            print(f"     첫번째 definite: {name.encode('ascii','replace').decode()}")
