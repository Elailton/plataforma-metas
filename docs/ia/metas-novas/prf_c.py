import sys
sys.path.insert(0, '/home/claude/plataforma-metas/docs/ia/metas-novas')
import prf as P
CID = P.CID; TR = P.TR; VADE = P.VADE; DISC = 'DI'; SHORT = P.SHORT
CAD = dict(P.CAD); LAW = dict(P.LAW); NOSSO = dict(P.NOSSO)
QOSUB = ['eb9c57ce', '222ae27a']
SKIP = ['d98d3745']
LM = """
PT 40-46 9570980a
PT 47-48 defdb937
PT 49-53 9570980a
PT 54-56 6c361bbf
PT 57-59 ecb689bd
PT 60-62 de642ddb
PT 63-67 1481a704
PT 68-69 e40ab319
PT 70-73 afb924d8
PT 74-77 1cb2bbca
PT 78 95b0e4a6|a41f9a2e
PT 79-81 ad6f5aef|a41f9a2e
PT 82-84 50e032ad
PT 85-87 147090be
PT 88-97 3dd001ac
RL 12-15 ffb00b5c
IN 9-10 02b379ba
IN 11 1ec870c1
IN 12 22a77e07
IN 13-15 ebcf1ab0
IN 16 c8375a29
FI 14-15 cde9e89b
FI 16-17 d6b58f38
FI 18-19 7473b93b
FI 20-21 3b150077
FI 22-23 46ef0e5a
FI 24-25 21b3e388
FI 26-27 f60c14e3
ET 9-11 fd2c7135
ET 12 a853d70e
ET 13-14 a1bdf437
ET 15 31ed9724
ET 16-17 dfe653de
ET 18 3667442f
GE 14-15 d84651d5
GE 16 889cfa4b
GE 17-19 96c988e9
GE 20-21 c94e0ec7
GE 22-23 d84651d5
GE 24-26 889cfa4b
GE 27-28 96c988e9
GE 29 c53aa800
LT 20-21 fe4c5178|ctb2|Código de Trânsito Brasileiro, arts. 68 a 73
LT 22-23 fe4c5178|ctb3|Código de Trânsito Brasileiro, arts. 80 a 95
LT 24-28 fe4c5178|ctb3|Código de Trânsito Brasileiro, arts. 96 a 117
LT 29-31 fe4c5178|ctb3|Código de Trânsito Brasileiro, arts. 120 a 135
LT 32-33 fe4c5178|ctb4|Código de Trânsito Brasileiro, arts. 136 a 139
LT 34-35 fe4c5178|ctb4|Código de Trânsito Brasileiro, arts. 140 a 160
LT 36-37 fe4c5178|ctb5|Código de Trânsito Brasileiro, arts. 256 a 268
LT 38-39 fe4c5178|ctb5|Código de Trânsito Brasileiro, arts. 269 a 279
LT 40-41 fe4c5178|ctb6|Código de Trânsito Brasileiro, arts. 291 a 301
LT 42-43 fe4c5178|ctb6|Código de Trânsito Brasileiro, arts. 302 a 312-B
RC 5-7 75d23bac
DA 19-24 5649b6bb
DA 25-26 2a843ca0
DA 27 4326c00c
DA 28 7918ab33
DA 29 2a843ca0
DA 30-34 34277d92
DA 35-39 c595f448
DA 40-41 3c9f6e4c
DA 42-46 596f5a18
DC 25-27 8cc97544
DC 28 f1d2ff90
DC 29 657cc389
DC 30-31 95ef216b
DC 32-34 2ea304fd
DP 21-22 17e5e220
DP 23-24 aedf7694
DP 25-28 c6b19d23
DP 29-40 0e587d2c
DP 41-48 62ae8d36
PP 16-17 195219bd
PP 18-24 b4ab49a0
PP 25-26 d9bb06a2
PP 27 9f1e03c8
PP 28-34 cea2ee48
PP 35 c213a910
LE 1-2 4189f2c2
LE 3 4ca4f6ed
DH 11-15 6fc15241
"""

QOLAW = {'eb9c57ce': ('Resolução', 'Resolução CONTRAN')}
