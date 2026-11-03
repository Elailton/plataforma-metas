"""Disciplina (por faixa de questões) e tópico do edital (classificação manual) de cada questão."""
import json

def ranges(spec):
    out = {}
    for a, b, s in spec:
        for n in range(a, b + 1): out[n] = s
    return out

def topics(text):
    out = {}
    for part in text.split():
        n, t = part.split(':'); out[int(n)] = None if t == '-' else t
    return out

C = {
 'pmpe': dict(slug='sistema-guiado-da-aprovacao', subj=ranges([(1, 10, 0), (11, 20, 1), (21, 30, 2), (31, 40, 3), (41, 50, 4), (51, 60, 5)]),
   top=topics('1:bd85729a 2:4ec9ab2c 3:69a5cb4e 4:ab1e8145 5:f37e2816 6:fb0a3d21 7:4868131b 8:4868131b 9:c38824fb 10:- '
              '11:9a26d075 12:8882fa26 13:8882fa26 14:ebc582d2 15:20cefd31 16:95bf4b74 17:5cbaf9ae 18:8882fa26 19:8882fa26 20:8882fa26 '
              '21:b41389ca 22:3f8282f5 23:3f8282f5 24:b41389ca 25:0dbcb74b 26:8ff4799e 27:3f8282f5 28:8ff4799e 29:8ff4799e 30:3f8282f5 '
              '31:3effc660 32:0e0e5ea4 33:9649cf1f 34:c3a97adb 35:7b2a2570 36:4c17f989 37:30a6f45e 38:30a6f45e 39:30a6f45e 40:30a6f45e '
              '41:9fc30c28 42:9ccee260 43:9fc30c28 44:3a2ce693 45:9ccee260 46:9fc30c28 47:ed5a5073 48:6a3738df 49:6a3738df 50:6a3738df '
              '51:fbf742b9 52:bedf0d8b 53:0b96d420 54:e681dda9 55:2431e58e 56:3f33547e 57:fbf742b9 58:2d9b1d00 59:10bdafd1 60:699ee319')),
 'gmf': dict(slug='sga-gmf', subj=ranges([(1, 10, 1), (11, 19, 2), (20, 26, 3), (27, 33, 4), (34, 40, 5), (41, 50, 6), (51, 60, 7), (61, 70, 8), (71, 80, 9)]),
   top=topics('1:63c8e5a7 2:c7068a0a 3:d020de03 4:8808128f 5:0892e141 6:67bebe60 7:0892e141 8:a3ebb061 9:8e67c347 10:7b5a4268 '
              '11:4f0b80a2 12:f23944d8 13:4f0b80a2 14:f23944d8 15:f23944d8 16:e700f6bf 17:1f109f5d 18:1f109f5d 19:e700f6bf '
              '20:6840de40 21:aa21d41b 22:5df6dfc3 23:f75afa4d 24:6244cd35 25:2a17d61a 26:c044fe44 '
              '27:5231d50e 28:5231d50e 30:5231d50e 31:5231d50e 32:5231d50e 33:5231d50e '
              '34:74fc94ad 35:74fc94ad 36:e97b1a98 37:05a96d99 38:12629c0f 39:99c7f6b7 40:f14307a4 '
              '41:d5ddebae 42:d5ddebae 43:171343f7 44:171343f7 45:171343f7 47:83c57a89 48:83c57a89 49:83c57a89 50:83c57a89 '
              '51:2bbc99b5 52:2bbc99b5 53:9bba169b 54:c02dfaf3 55:c02dfaf3 56:de0637fd 57:8437ceb8 58:b1f8e861 59:e354dc5d 60:74f6b977 '
              '61:638b5018 62:638b5018 63:638b5018 64:638b5018 65:638b5018 66:b4ffb7bb 67:b4ffb7bb 68:b4ffb7bb 69:2ef366a9 70:52608bff '
              '71:6f61ed7e 72:6f61ed7e 73:b3177378 74:6f61ed7e 75:bcd8a70b 77:b3177378 78:4e68b093 79:cda7d23b 80:cda7d23b')),
 'pmce': dict(slug='sga-pmce', subj=ranges([(1, 12, 1), (13, 22, 2), (23, 32, 3), (33, 40, 4), (41, 52, 5), (53, 62, 6), (63, 74, 7), (75, 86, 8), (87, 94, 9), (95, 100, 10)]),
   top=topics('1:014a1e3c 2:014a1e3c 3:7b01dc68 4:f6caff14 5:b5b1111f 6:f44c3fc6 7:3522d116 8:e8e899d8 10:e9a6cfe4 11:f6caff14 12:17a60650 '
              '13:cb7f7701 14:765d7f63 15:765d7f63 16:cb7f7701 17:cb7f7701 18:9ca8c2e0 19:e2d0fe0b 20:cb7f7701 21:cb7f7701 22:cb7f7701 '
              '23:bebd5e18 24:1cc3f185 25:51cc63ab 26:1cc3f185 27:6709d7f6 28:1cc3f185 29:758e0bec 30:dbadb9ee 31:a66ceccd 32:0466662a '
              '33:cd11236b 34:cd11236b 35:7ed0a80e 36:7ed0a80e 38:ae031b66 39:3433b6bb 40:b0b75d89 '
              '41:04c811d8 42:04c811d8 43:04c811d8 44:00ab3c09 45:00ab3c09 46:18a1a112 47:a5f9e5aa 48:43f73de2 49:b2e272b6 50:a5f9e5aa 51:ab90e23a 52:ab90e23a '
              '53:359b32a8 54:8993480e 55:01fa8b8c 56:282409b3 58:01fa8b8c 59:246ac1d6 60:05992bbb 61:3b89ec1a 62:3cf7230d '
              '63:51843df0 64:f7e9f075 65:0c5541f8 66:822f49c1 67:ed79402f 68:ed79402f 69:f4363f5c 70:7c493d3d 71:4b057e21 72:12b6d8cb 73:24b4ffbe 74:e937e3f8 '
              '75:- 76:ff77361e 77:79fa86f5 78:a5122ec7 79:70a20125 80:79fa86f5 81:28eb824a 82:28eb824a 83:0cd03ac4 84:a9e6562b 85:0cd03ac4 86:3844605f '
              '87:592bd79a 88:d5a69bbe 89:d5a69bbe 91:3c2bff16 92:3c2bff16 93:0fda0365 94:5cb72107 '
              '95:ff4ec295 96:ff4ec295 97:15c68e6c 98:c30724b7 99:76abbd47 100:857c202b')),
 'cfo': dict(slug='sga-cfo-pmce', subj=ranges([(1, 10, 1), (11, 20, 2), (21, 30, 3), (31, 40, 4), (41, 50, 5), (51, 60, 6), (61, 70, 7), (71, 80, 8), (81, 90, 9), (91, 100, 10)]),
   top=topics('1:c7c89dd8 2:d628809b 3:d628809b 4:55ee0159 5:4c264358 6:55ee0159 7:d628809b 8:e2594bc2 9:e2594bc2 10:d628809b '
              '11:99a343a3 12:99a343a3 13:99a343a3 14:ce039d43 15:99a343a3 16:99a343a3 18:99a343a3 20:99a343a3 '
              '21:206def51 22:16345f1e 23:ef99c5d9 24:206def51 25:16345f1e 26:de0ef034 27:2dc3edc3 28:b3e519c3 29:7b0a5af4 30:84dd0c6f '
              '31:a8c0b364 32:6139b636 33:6139b636 34:a8c0b364 35:d7941066 36:b27c56fd 37:03977a50 38:a8c0b364 39:b27c56fd 40:b27c56fd '
              '41:7af536e9 42:c69384cb 43:c69384cb 44:829f540c 45:829f540c 46:5c489c39 47:7af536e9 48:5c489c39 49:85dbb472 50:446b17f0 '
              '51:e0a42fc1 52:b2d32ca7 53:b2d32ca7 54:1c6ecaa4 55:91f0a171 56:600ac340 57:e0a42fc1 58:557063e1 59:b9684648 60:2cfed077 '
              '61:c6323456 62:f10217e9 63:5e6fb040 64:feced1f7 65:5e6fb040 66:cae659ff 67:5e6fb040 68:23dd8344 69:9b642d8a 70:25cc91da '
              '71:af6e8672 72:e56acebb 73:e56acebb 74:e56acebb 75:dfb73ccc 76:20291ed9 77:1b9eeef2 78:a4632e0f 79:79fa977d 80:737084f2 '
              '81:626b0786 82:3525239c 83:3525239c 84:626b0786 85:626b0786 86:3525239c 87:626b0786 88:3525239c 89:626b0786 90:3525239c '
              '91:b099f712 92:5f1e406e 93:e9b319e8 94:e9b319e8 95:8e22b55e 96:8b1120f6 97:304e0682 98:c36b0558 99:8e22b55e 100:e3ad28c4')),
 'ppce': dict(slug='sga-ppce', subj=ranges([(1, 12, 1), (13, 18, 2), (19, 24, 3), (25, 32, 4), (33, 40, 5), (41, 50, 6), (51, 60, 7), (61, 70, 8), (71, 80, 9), (81, 90, 10)]),
   top=topics('1:36d091c7 2:36d091c7 3:9a6d954c 4:36d091c7 5:a2dee978 6:9a6d954c 7:9a6d954c 8:9a6d954c 9:53c10122 10:9a6d954c 11:9a6d954c 12:9a6d954c '
              '14:24161a1f 15:18e70a3b 16:571e8a03 17:32f92df3 18:32f92df3 '
              '19:069c946b 20:ee52474a 21:fac3e837 22:fac3e837 23:069c946b 24:fac3e837 '
              '25:12189336 26:751e87b7 27:aec1b93d 28:5128c0da 29:520f8182 30:ced13761 31:98a5f6e6 32:ced13761 '
              '33:f5b6d715 34:3d8ffe0f 35:3d8ffe0f 36:3d8ffe0f 37:3d8ffe0f 38:3d8ffe0f 39:3d8ffe0f 40:29f129a9 '
              '41:05bc9121 43:156de355 44:ab5485d7 45:6201f030 46:6201f030 47:6201f030 48:ab5485d7 49:156de355 50:6201f030 '
              '51:303bfc8f 52:2c7e2341 53:303bfc8f 54:07d2aff9 55:2c7e2341 56:07d2aff9 57:07d2aff9 58:7315a71f 59:dd3d9e5e 60:dd3d9e5e '
              '61:8ef08fb6 62:7b1dc97f 63:7b1dc97f 64:b2acb2f7 65:f58d25a3 66:8ef08fb6 67:0ecd9075 68:8ef08fb6 69:8ef08fb6 70:8ef08fb6 '
              '71:b33a7a5f 72:d6cd0393 73:9e607042 74:b33a7a5f 75:9e607042 76:bb9a26e1 77:9e607042 78:bb9a26e1 79:7bff84f1 80:a8b4a6e8 '
              '81:af855179 84:4c22141d 85:d112bd72 86:fbafa9fa 87:f2929cc4 88:05ef9c2f 89:f2929cc4 90:fbafa9fa')),
 'prf': dict(slug='sga-prf', subj=ranges([(9, 26, 1), (27, 32, 2), (33, 39, 3), (40, 44, 4), (45, 50, 5), (51, 55, 6), (56, 85, 8), (86, 92, 9), (93, 99, 10), (100, 104, 11), (105, 109, 12), (110, 115, 13), (116, 120, 14)]),
   top=topics('9:147090be 10:a41f9a2e 11:147090be 12:147090be 13:147090be 14:147090be 15:194b948f 16:147090be 17:147090be 18:99b1ae61 19:a41f9a2e 20:a41f9a2e 21:99b1ae61 '
              '22:3dd001ac 23:3dd001ac 24:3dd001ac 25:3dd001ac 26:3dd001ac 27:167e0023 28:167e0023 29:167e0023 30:167e0023 31:0b198f56 32:0b198f56 '
              '33:f6238f51 34:f6238f51 35:f6238f51 36:ad3b241f 37:ebcf1ab0 38:22a77e07 40:ddb5414b 41:ddb5414b 42:ddb5414b 43:f60c14e3 44:f60c14e3 '
              '46:29a08948 47:29a08948 48:29a08948 49:31ed9724 50:1113f91a 51:bc2e5f24 52:bc2e5f24 53:bc2e5f24 54:0c3b90d3 55:0c3b90d3 '
              '56:fe4c5178 57:fe4c5178 58:fe4c5178 59:fe4c5178 60:fe4c5178 61:eb9c57ce 62:eb9c57ce 63:eb9c57ce 64:eb9c57ce 65:eb9c57ce 66:eb9c57ce 68:eb9c57ce 70:eb9c57ce '
              '71:eb9c57ce 72:eb9c57ce 73:eb9c57ce 74:eb9c57ce 75:eb9c57ce 77:fe4c5178 78:fe4c5178 79:eb9c57ce 80:eb9c57ce 81:eb9c57ce 82:eb9c57ce 84:eb9c57ce 85:eb9c57ce '
              '86:c595f448 87:4a90d6f4 88:ffd5f005 90:0e1fbdd8 91:c4e5a307 92:c4e5a307 93:8eeacbd9 94:8eeacbd9 95:8eeacbd9 96:8eeacbd9 97:8eeacbd9 '
              '100:ff705966 101:ff705966 102:ff705966 103:ff705966 104:ff705966 105:1ac8f883 106:7ff0a370 107:6ef0cd32 108:1ac8f883 109:7ff0a370 '
              '110:9c4004a9 111:98836223 112:4189f2c2 113:fe529c3e 114:c9a62324 115:00801d21 116:b79ac797 117:b79ac797 118:b79ac797 119:c6861b5a 120:b79ac797')),
 'prfi': dict(slug='sga-prf', subj=ranges([(1, 8, 7)]), top={n: '222ae27a' for n in range(1, 9)}),
 'prfe': dict(slug='sga-prf', subj=ranges([(1, 8, 7)]), top={n: 'd98d3745' for n in range(1, 9)}),
}

if __name__ == '__main__':
    tot = 0
    for ex, c in C.items():
        qs = [q for q in json.load(open(f'final_{ex}.json')) if not q['annulled']]
        miss = [q['n'] for q in qs if q['n'] not in c['top']]
        extra = [n for n in c['top'] if n not in {q['n'] for q in qs}]
        nosubj = [q['n'] for q in qs if q['n'] not in c['subj']]
        tot += len(qs)
        print(ex, len(qs), 'sem tópico', miss, 'tópico de anulada/inexistente', extra, 'sem disciplina', nosubj)
    print('total', tot)
