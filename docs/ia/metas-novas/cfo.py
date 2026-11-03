# SGA - CFO PMCE: dados para o planejador de metas novas
CID = 'c09903b0-651f-43a8-9c43-5f8fe7f6cb17'
VADE = 'Vade Mecum PMCE CFO'
RLM = 2
DISC = None

SHORT = {1: 'Português', 2: 'RLM', 3: 'Hist. do Ceará', 4: 'Adm. Pública e Ética', 5: 'Dir. Constitucional',
         6: 'Direitos Humanos', 7: 'Dir. Penal Militar', 8: 'Penal e Proc. Penal', 9: 'Abuso e Maria da Penha', 10: 'Segurança Pública'}

TR = {'PT': 'Língua Portuguesa - Prof. Volney Ribeiro', 'RL': 'Raciocínio Lógico Matemático - Prof. Paulo Felipe',
      'DC': 'Direito Constitucional - Profª. Dayana Sales', 'DPM': 'Direito Penal Militar - Prof. Erick Lima',
      'HCE': 'História do Ceará - Prof. Caio Victor', 'DP': 'Direito Penal - Prof. Erick Lima',
      'AP': 'Administração Pública - Prof. Herick Paiva', 'ET': 'Ética - Prof. Rodrigo Lopes',
      'DH': 'Direitos Humanos - Prof. Rodrigo Lopes', 'EX': 'Extravagantes', 'PP': 'Processo Penal - Prof. Max Lima',
      'SP': 'Segurança Pública - Prof. Damasceno'}

V = {
'AP': "2,1919,61f;3,2140,61f;4,1975,ca7;5,1954,ca7;6,1984,ca7;7,1911,ca7;8,2000,ca7;9,1919,ca7;10,1876,ca7;11,1900,9c9;12,2238,9c9;13,1677,9c9;14,2015,9c9;15,2081,9c9;16,2106,d5c;17,1908,d5c;18,1452,d5c;19,1463,028;20,1649,3d4;21,1879,b23;22,2909,ca8",
'DC': "2,1967,8eb;3,1963,8eb;4,1314,8eb;5,1939,8eb;6,1812,8eb;7,1421,8eb;8,980,8eb;9,1491,8b5;10,1171,8b5;11,1855,eff;12,1600,eff;13,1378,eff;14,1347,eff;15,1027,955;16,2159,955;17,2542,13a;18,1170,13a;19,1530,13a;20,1128,13a;21,1039,13a;22,1478,13a;23,1808,6a4;24,1252,6a4;25,1545,6a4;26,995,303;27,1037,303;28,1742,5f2;29,1180,5f2;30,1418,5f2;31,1803,5f2;32,1302,a30;33,1073,a30;34,1147,a30;35,1337,8e6;36,1023,fd4;37,1381,fd4",
'DP': "2,2454,496;3,646,496;4,3282,496;5,1591,496;6,1916,f4e;7,1091,ae4;8,263,673;9,1622,5ea;10,1637,062;11,1549,062;12,2765,e51;13,2234,e51;14,1725,cd1;15,1401,cd1;16,1834,9d8;17,1936,162;18,1843,176;19,2253,fab;20,2105,fab;21,3159,fab;22,1194,380;23,1928,380;24,1566,395;25,1652,395;26,1909,824;27,2671,824;28,1711,824;29,2498,12b;30,1531,f82;31,1572,4a9;32,1186,f70;33,1435,13f;34,3309,fd0;35,1142,7b2;36,2043,fad;37,2223,fad;38,1383,fad;39,1482,30e;40,1415,eff;41,678,eff;42,678,b8b;43,1036,6a4;44,643,9cc;45,755,1f1;46,1404,5d4;47,1354,5d4;48,393,6fc;49,1798,d11;50,1768,b5f;51,1823,b5f;52,2156,b5f;53,1273,b5f;54,2050,0ab;55,2469,f48;56,1015,f48;57,2531,e7a;58,1453,3ae;59,2501,8de;60,2779,1b3;61,2130,5e2;62,2142,b03;63,1975,b03;64,1940,4dd;65,2108,862;66,189,774;67,2495,85d;68,1385,3d8;69,1303,dfd;70,831,4c0;71,2009,75d;72,751,aea;73,1155,fa1;74,1916,ec6;75,272,947;76,2207,acf;77,3140,acf;78,838,acf;79,1013,059;80,365,1d2",
'DPM': "2,1942,654;3,2621,c35;4,2065,c35;5,2137,d3f;6,1992,34a;7,1306,34a;8,735,972;9,2638,3a6;10,957,e4f;11,923,176;12,1737,9c6;13,1314,a02;14,2062,a02;15,2317,4ba;16,2360,7d5;17,2009,4f3;18,1496,4db;19,1540,4db;20,1181,4db;21,1791,839;22,2358,96e;23,2247,b95;24,2065,2b4;25,1032,2b4;26,1384,2b4;27,1978,d75;28,2109,cd1;29,1222,bcb;30,1660,1fd;31,2259,391;32,1905,b7f;33,2301,dee;34,1536,c91;35,1074,467;36,1955,f9d;37,921,a6d;38,1688,1e4;39,2685,1e4;40,2244,1e4;41,1683,c90;42,2188,c90;43,1283,c90;44,911,fc3;45,1682,bed;46,1650,8d0;47,1409,8d0;48,1472,8d0;49,2734,ad7;50,2755,396",
'DH': "2,1935,0a9;3,1554,ae5;4,2023,168;5,1585,815;6,1751,263;7,1805,263;8,875,263;9,1851,b16;10,909,b16;11,1153,243",
'ET': "2,1053,19f;3,782,30f;4,905,5fa;5,713,31a;6,837,65a",
'EX': "1,1729,23e;2,2598,23e;3,702,b5e;4,1288,44d;5,1317,44d;6,2183,c13;7,2047,c13;8,2046,c13;9,1888,12c;10,1842,12c;11,1705,18e;12,2247,18e;13,2551,18e;14,1784,b99;15,1070,b99;16,1893,b57;17,1753,b57;18,1372,f46;19,1246,ff9;20,1958,ff9;21,1431,ff9;22,1740,ff9;23,1999,e6a;24,2327,98a;25,2334,5cc;26,1316,8ac;27,2931,b16;28,1005,38f;29,3185,38f",
'HCE': "2,1786,270;3,1772,270;4,1622,627;5,1851,cb4;6,1720,37a;7,1553,2e7;8,1820,719;9,1746,1b5;10,1886,1b5;11,1429,be1;12,1997,ef7;13,1643,7b7;14,1529,c28;15,1970,093;16,1787,547;17,1816,bb7;18,1792,d13;19,1845,e85;20,1822,61c;21,1651,96b;22,1864,ba9;23,1671,659;24,1897,b41;25,1421,980;26,1656,135",
'PT': "2,1803,bbf;3,2610,730;4,1800,030;5,2333,48a;6,2072,4d8;7,1980,31c;8,1355,31c;9,1688,589;10,2181,b48;11,2097,0fc;12,2502,9e8;13,1954,ae0;14,2064,4da;15,2121,06b;16,2001,78c;17,1752,8a8;18,1962,c10;19,2280,739;20,1736,f72;21,1946,27b;22,1322,035;23,2177,308;24,1044,5ae;25,2351,721;26,2047,c90;27,1923,c90;28,1805,c90;29,1982,c90;30,2223,c90;31,2653,c90;32,2784,b50;33,2320,1af;34,1814,1af;35,2083,1af;36,1586,1af;37,2160,e5d;38,1425,78f;39,1657,058;40,287,bbb;41,1483,64f;42,1825,707;43,1994,814;44,2272,c0a;45,1616,c0a;46,1887,c9b;47,1445,c9b;48,1927,4fc;49,2296,f34;50,1812,c1d;51,2110,da1;52,1788,a5e;53,1752,d98;54,2024,b81;55,1900,632;56,1935,e39;57,2238,a1c;58,2295,5ff;59,1188,47c;60,2539,47c;61,2028,365;62,1991,1c1;63,2107,1c1;64,2286,f0a;65,2179,0a3;66,2053,0a3;67,2155,a64;68,2184,866;69,2943,866;70,2076,cbd;71,3139,f2a;72,1835,45d;73,2895,28a;74,2073,9b5;75,2352,9b3;76,2508,e2c;77,1772,aa7;78,2581,bdb;79,2370,3da;80,2034,d08;81,2355,0c6;82,1567,d2a;83,2127,ef8;84,2331,b24;85,1886,b24;86,2094,c74",
'PP': "2,2037,2c0;3,1529,496;4,1229,496;5,2012,496;6,1625,496;7,1323,fe8;8,1976,80d;9,2203,226;10,2188,a00;11,2055,a00;12,951,a00;13,832,a00;14,1041,a00;15,855,a00;16,689,a00;17,1290,d56;18,1819,d56;19,1500,a6d;20,1091,a6d;21,2007,a6d;22,2189,a6d;23,263,a6d;24,1204,a6d;25,1714,a6d;26,1894,a6d;27,2025,a6d;28,1138,a6d;29,1855,9bc;30,1277,9bc;31,1612,9bc;32,1125,9bc;33,1793,9bc;34,2170,9bc;35,2442,f44;36,547,728;37,1078,fe7;38,874,fe7;39,2571,d26;40,3110,6d8;41,1617,19a;42,1026,a1f;43,1171,a1f",
'RL': "2,1581,bd2;3,2524,7dd;4,2151,263;5,2011,273;6,1617,313;7,1671,c74;8,1716,d5f;9,2975,cca;10,1773,fd3;11,1303,fd3;12,1277,b8c;13,1757,db0;14,1571,907;15,2062,5e3;16,1940,8cd;17,2364,50d;18,1961,50d;19,1173,52a;20,2620,d05",
'SP': "2,476,2c0;3,1575,bdc;4,1018,bdc;5,1393,f8a;6,1352,26a;7,1221,26a;8,1340,453;9,1074,453;10,954,6bc",
}

MAP = """
PT 2-3 d628809b compr
PT 4-5 9dd779d6 signif
PT 6-15 e3dc3644 ortog
PT 16-18 4c264358 estrut
PT 19-20 47367dfe acent
PT 21-25 55ee0159 classes
PT 26-32 66e326e9 verbo
PT 33-37 58f59932 pron
PT 38-43 55ee0159 classes
PT 44-51 47ef4fc4 sint
PT 52-53 b7a022a3 sint
PT 54-58 7f8e3896 sint
PT 59-61 c7c89dd8 pont
PT 62-64 f47414f7 reg
PT 65-67 f47414f7 crase
PT 68-72 cccfbc68 conc
PT 73-74 16374750 pron
PT 75-78 55ee0159 queSe
PT 79-81 cbab84e0 coesao
PT 82-83 e2594bc2 reesc
PT 84-86 d628809b interp2
RL 2-5 21aaa1c7 logprop
RL 6-8 ce039d43 relarb
RL 9 37975180 seq
RL 10-13 516ed7fa conj
RL 14 3d73ef3d probl
RL 15-19 895ec8e8 geom
RL 20 5ace1a00 probl
HCE 2-4 b3e519c3 hcecol
HCE 5-7 de0ef034 hcecol
HCE 8-11 84dd0c6f hcecol
HCE 12-14 2dc3edc3 hcecol
HCE 15 7b0a5af4 hcecol
HCE 16-26 f0337dda hcecol
AP 2-3 6341065a procorg
AP 4-10 69ffd35c planest
AP 11-15 d651577d orgform
AP 16-21 7a7b2354 relhum
AP 22 eabcd753 gproc
ET 2-6 15ebbc9d etica
DC 2-10 6530b3d1 dirind
DC 11-14 d0c62ff7 dirsoc
DC 15-16 5602e8bf dirpol
DC 17-22 7af536e9 orgest
DC 23-25 3dc638d1 legis
DC 26-27 446b17f0 exec
DC 28-31 85dbb472 judic
DC 32-34 e371bedc fesj
DC 35 c69384cb segpub
DC 36-37 829f540c segpub
DH 2 b2d32ca7 dhconc
DH 3 1c6ecaa4 dhcf
DH 4-5 0d6a6576 pndh
DH 6-8 557063e1 racis
DH 9-11 600ac340 tort
EX 1-5 557063e1 racis
EX 6-8 b9684648 pcd
EX 9-10 626b0786 abuso
EX 14-15 bf1b1b30 amb
EX 16-18 fc9db397 desarm
EX 19-22 e808e7be drogas
EX 23-26 3525239c penha
EX 27 600ac340 tort
EX 28-29 58ee8050 hed
DPM 2-5 f10217e9 dpmapl
DPM 6-7 4b49e67f dpmpaz
DPM 8 5e078ad0 dpmguer
DPM 9-10 f10217e9 dpmapl
DPM 11-23 f46fb6b3 dpmcrime
DPM 24-27 c6323456 dpmconc
DPM 28-36 5e6fb040 dpmpena
DPM 37 7bd2f5a6 dpmext
DPM 38-40 feced1f7 dpmext
DPM 41-45 25cc91da dpmesp
DPM 46-48 9b642d8a dpmesp
DPM 49 23dd8344 dpmesp
DPM 50 5e3e0955 dpmesp
DP 2-17 e56acebb penapl
DP 18-33 87916e02 dpcrime
DP 34-35 658aa2bc dpconc
DP 36-39 1b9eeef2 dpconc
DP 40-49 6942d59f dppena
DP 50-53 737084f2 dpext
DP 54-63 6b9e666d dppes
DP 64-72 5a7db8ed dppat
DP 73-75 0ea91ab1 dpfe
DP 76-80 79fa977d dpadm
PP 2-8 1411c8eb ppapl
PP 9-16 5f9810b5 inq
PP 17-28 b40fad41 acao
PP 29-36 a4632e0f prisao
PP 37-38 6f0db465 prisao
PP 39-40 a4632e0f prisao
PP 41 6b87a59f resp
PP 42-43 20291ed9 hc
SP 2-4 5f1e406e segp
SP 5 8e22b55e segp
SP 6-7 c36b0558 segp
SP 8-9 304e0682 segp
SP 10 e3ad28c4 segp
"""

CAD = {'a73ce83b': 'coesao', 'c03ce6e3': 'verbo', 'af6b6ca3': 'classes', 'c4261069': 'verbo', 'afe3dc20': 'pron', '14dd744b': 'pron',
       '5377d34d': 'conc', 'dad51fec': 'conc', 'a6c092bb': 'reg', '36c24a29': 'reg',
       'a8c0b364': 'orgadm', '6139b636': 'princadm', 'd7941066': 'delega', '03977a50': 'contr', 'b27c56fd': 'improb',
       '5c489c39': 'dirind', '2cfed077': 'dhgr', 'eb9e5717': 'penha', 'e0a42fc1': 'penha', '901e696c': 'dhgr', '91f0a171': 'dhgr',
       'cae659ff': 'dpmpena', '67174bbd': 'dpmcrime', '662b201d': 'dppena', '4b400557': 'dpext', 'cbc25c4a': 'dpext',
       'dfb73ccc': 'dpcrime', '16fd8e74': 'dpcrime', '3f27593f': 'dpcrime', 'af6e8672': 'dpcrime', 'eb90c11c': 'dpcrime', '2d5a539b': 'dpcrime',
       '2297c00b': 'dpsex', 'e0d71949': 'dppaz', 'e9b319e8': 'segp', '8b1120f6': 'segp', 'b099f712': 'segp'}

LAW = {
 '6530b3d1': 'Constituição Federal, art. 5º', 'd0c62ff7': 'Constituição Federal, arts. 6º a 11', '5602e8bf': 'Constituição Federal, arts. 14 a 16',
 '7af536e9': 'Constituição Federal, arts. 18 a 33', '3dc638d1': 'Constituição Federal, arts. 44 a 58', '446b17f0': 'Constituição Federal, arts. 76 a 88',
 '85dbb472': 'Constituição Federal, arts. 92 a 103-B', 'e371bedc': 'Constituição Federal, arts. 127 a 135', 'c69384cb': 'Constituição Federal, arts. 142 e 143',
 '829f540c': 'Constituição Federal, art. 144', '6139b636': 'Constituição Federal, art. 37', 'b27c56fd': 'Lei nº 8.429/1992 (Improbidade Administrativa)',
 'f10217e9': 'Código Penal Militar, arts. 1º a 28', '4b49e67f': 'Código Penal Militar, art. 9º', '5e078ad0': 'Código Penal Militar, art. 10',
 'f46fb6b3': 'Código Penal Militar, arts. 29 a 47', '67174bbd': 'Código Penal Militar, arts. 48 a 52', 'c6323456': 'Código Penal Militar, arts. 53 e 54',
 '5e6fb040': 'Código Penal Militar, arts. 55 a 120', '7bd2f5a6': 'Código Penal Militar, arts. 121 e 122', 'feced1f7': 'Código Penal Militar, arts. 123 a 135',
 '25cc91da': 'Código Penal Militar, arts. 149 a 204', '9b642d8a': 'Código Penal Militar, arts. 205 a 239', '23dd8344': 'Código Penal Militar, arts. 240 a 267',
 '5e3e0955': 'Código Penal Militar, arts. 298 a 339',
 'e56acebb': 'Código Penal, arts. 1º a 12', '87916e02': 'Código Penal, arts. 13 a 28', '658aa2bc': 'Código Penal, arts. 69 a 72',
 '1b9eeef2': 'Código Penal, arts. 29 a 31', '6942d59f': 'Código Penal, arts. 32 a 95', '737084f2': 'Código Penal, arts. 107 a 120',
 '6b9e666d': 'Código Penal, arts. 121 a 154-B', '5a7db8ed': 'Código Penal, arts. 155 a 183', '0ea91ab1': 'Código Penal, arts. 289 a 311-A',
 '79fa977d': 'Código Penal, arts. 312 a 337-A', '2297c00b': 'Código Penal, arts. 213 a 234-C', 'e0d71949': 'Código Penal, arts. 286 a 288-A',
 '1411c8eb': 'Código de Processo Penal, arts. 1º a 3º', '5f9810b5': 'Código de Processo Penal, arts. 4º a 23', 'b40fad41': 'Código de Processo Penal, arts. 24 a 62',
 'a4632e0f': 'Código de Processo Penal, arts. 282 a 350', '6f0db465': 'Lei nº 7.960/1989', '6b87a59f': 'Código de Processo Penal, arts. 513 a 518',
 '20291ed9': 'Código de Processo Penal, arts. 647 a 667',
 'fc9db397': 'Lei nº 10.826/2003 (Estatuto do Desarmamento)', 'bf1b1b30': 'Lei nº 9.605/1998 (Crimes Ambientais)', 'e808e7be': 'Lei nº 11.343/2006 (Lei de Drogas)',
 '58ee8050': 'Lei nº 8.072/1990 (Crimes Hediondos)', '626b0786': 'Lei nº 13.869/2019 (Abuso de Autoridade)', '3525239c': 'Lei nº 11.340/2006 (Maria da Penha)',
 '557063e1': 'Lei nº 12.288/2010 (Estatuto da Igualdade Racial)', 'b9684648': 'Lei nº 13.146/2015 (Estatuto da Pessoa com Deficiência)',
 '600ac340': 'Lei nº 9.455/1997 (Lei de Tortura)'}

APOST = {1: 'PT', 2: 'RL', 3: 'HCE', 5: 'DC', 6: 'DH', 7: 'DPM', 8: 'DP', 10: 'SP'}
APOST_T = {'15ebbc9d': 'ET', '1411c8eb': 'PP', '5f9810b5': 'PP', 'b40fad41': 'PP', 'a4632e0f': 'PP', '6f0db465': 'PP', '6b87a59f': 'PP', '20291ed9': 'PP'}
NOSSO = {}
# sem Atualidades enquanto o edital não abrir (decisão de 03/11/2026)
SKIP = {'c13ec3ca', '206def51', 'ef99c5d9', '16345f1e', '3abac873', 'a5ade8ba', 'c8c8b506', 'b45af1a7'}

NBK = """compr signif ortog estrut acent logprop relarb seq conj dirind dirsoc dirpol dpmapl dpmpaz dpmguer hcecol penapl
classes verbo pron sint pont reg crase conc queSe coesao reesc interp2 probl geom procorg planest orgform relhum gproc etica orgadm princadm
delega contr improb orgest legis exec judic fesj segpub dhconc dhcf pndh racis dhgr pcd abuso amb desarm drogas penha tort hed
dpmcrime dpmconc dpmpena dpmext dpmesp dpcrime dpconc dppena dpext dppes dppat dpfe dpadm dpsex dppaz ppapl inq acao prisao resp hc segp""".split()
