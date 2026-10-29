# SGA - PRF: dados para o planejador de metas novas
SLUG = 'sga-prf'
CID = 'a845c350-baad-4711-a1e4-1ef1fc6f832c'
PREFIX = 'prf'
VADE = 'Vade Mecum PRF'
RLM = 2          # posição da disciplina de RLM
DISC = 'DI'      # trilha de discursiva (estudo semanal)

SHORT = {1: 'Português', 2: 'RLM', 3: 'Informática', 4: 'Física', 5: 'Ética', 6: 'Geopolítica', 7: 'Língua Estrangeira',
         8: 'Trânsito', 9: 'Dir. Administrativo', 10: 'Dir. Constitucional', 11: 'Dir. Penal', 12: 'Proc. Penal',
         13: 'Legislação Especial', 14: 'Direitos Humanos'}

# trilhas usadas (código -> nome da trilha na descrição do material)
TR = {'PT': 'Língua Portuguesa - Prof. Volney Ribeiro', 'DI': 'Discursiva - Prof. Volney Ribeiro',
      'RL': 'Raciocínio Lógico Matemático - Prof. Paulo Felipe', 'IN': 'Informática - Prof. Paulo Felipe',
      'FI': 'Física - Prof. Victor Fontenele', 'ET': 'Ética e Cidadania - Prof. Rodrigo Lopes',
      'GE': 'Geopolítica - Prof. Guilherme Lemos', 'LT': 'Legislação de Trânsito - Prof. Erick Lima',
      'RC': 'Resoluções do Conselho Nacional de Trânsito - Prof. Erick Lima', 'DA': 'Direito Administrativo - Prof. Suianny Lima',
      'DC': 'Direito Constitucional - Profª. Dayana Sales', 'DP': 'Direito Penal - Prof. Erick Lima',
      'PP': 'Direito Processual Penal - Prof. Max Lima', 'LE': 'Legislação Especial - Prof. Ryan Vitorino',
      'DH': 'Direitos Humanos - Prof. Rodrigo Lopes'}

V = {
'DA': "2,189,b2f;3,1869,80f;4,1864,f63;5,1048,f63;6,1351,db7;7,2409,db7;8,1861,f24;9,2205,1f9;10,2247,82d;11,2342,ab8;12,2549,c05;13,1540,9af;14,1431,879;15,1627,1bc;16,2051,1bc;17,1727,413;18,1042,3f4;19,1853,f27;20,742,f27;21,940,0af;22,1620,525;23,1477,525;24,1312,df6;25,1887,d27;26,2219,92a;27,2261,8c3;28,727,139;29,1756,cdf;30,2066,be9;31,1685,17a;32,2085,df4;33,666,f94;34,2128,1c6;35,930,4fc;36,1262,d57;37,1626,d57;38,2246,36c;39,1326,a83;40,1539,baa;41,1239,fa6;42,1127,0ca;43,985,272;44,440,272;45,705,c4d;46,1288,f00",
'DC': "2,1160,ee2;3,831,69f;4,1048,c02;5,670,93c;6,1899,26e;7,1803,cfb;8,1822,cfb;9,1021,cfb;10,1488,cfb;11,1319,cfb;12,1114,cfb;13,1371,cfb;14,1447,703;15,762,bd6;16,1500,071;17,1452,071;18,931,071;19,468,ac4;20,1678,fa6;21,777,f12;22,1926,713;23,1029,713;24,476,3cc;25,1615,dd6;26,1032,dd6;27,444,2bb;28,2005,361;29,1298,bf3;30,1644,943;31,444,5ab;32,2264,20d;33,1768,20d;34,914,2c8",
'DP': "2,2796,cc8;3,2852,2b2;4,2474,9b8;5,715,ef4;6,2841,11f;7,2824,11f;8,1855,6d0;9,1467,3a1;10,1047,9fa;11,2028,059;12,957,9e8;13,1989,a99;14,3003,401;15,3041,591;16,1943,b88;17,838,02b;18,1435,566;19,2784,566;20,947,566;21,2303,418;22,2498,f95;23,3016,c3c;24,411,c3c;25,1768,3d2;26,1823,3d2;27,2156,3d2;28,1273,3d2;29,2072,a1c;30,60,33a;31,2472,33a;32,2286,88b;33,2807,cdd;34,1000,33c;35,1802,d0b;36,2192,255;37,1345,255;38,2208,12c;39,2887,82f;40,981,82f;41,2453,577;42,1101,577;43,950,233;44,1564,37e;46,772,dd3;47,755,092;48,67,c2a",
'PP': "2,2268,b6f;3,1268,419;4,1355,a51;5,1808,f58;6,1461,f58;7,1848,f58;8,2242,e3f;9,1381,e3f;10,1889,e3f;11,1650,e49;12,970,e49;13,2235,bd4;14,2076,590;15,1230,587;16,1659,785;17,1093,132;18,1285,dc2;19,1141,dc2;20,1664,dc2;21,1906,dc2;22,2112,dc2;23,2002,b04;24,1370,3b7;25,2101,b04;26,1807,386;27,2669,790;28,2900,6bc;29,1467,eee;30,1333,780;31,1408,40d;32,1278,5eb;33,1587,52d;34,1715,1b4;35,1859,bee",
'DH': "2,162,b6f;3,1487,285;4,1570,033;5,975,a06;6,934,63d;7,943,5ad;8,1710,b7f;9,1414,b7f;10,1308,024;11,1855,50d;12,1443,50d;13,1757,50d;14,978,50d;15,984,b05",
'DI': "1,1409,d77;2,2400,2e0;3,1723,fdf;4,1830,fdf;5,2087,204;6,2093,452;7,1624,413;8,2239,eb5;9,2276,05e;10,2032,05e;11,2114,05e;12,1664,4ee",
'ET': "1,1103,bef;2,660,ef6;3,1311,e88;4,1509,b9b;5,1618,42a;6,651,ba0;7,1460,755;8,1199,5e2;9,940,636;10,909,636;11,666,636;12,1176,234;13,1550,c72;14,1321,c72;15,1240,ad9;16,1176,888;17,1687,888;18,1315,f3c",
'FI': "2,1781,31c;3,1512,31c;4,1453,31c;5,1846,3e6;6,1718,29d;7,1478,29d;8,1034,29d;9,1609,413;10,2188,06c;11,1828,f5e;12,1639,84d;13,2059,84d;14,1610,6a5;15,1695,6a5;16,1408,fc3;17,1799,590;18,1340,b3c;19,1339,2be;20,1898,502;21,1994,e26;22,1766,f4d;23,1743,45a;24,1465,79a;25,1635,abd;26,1957,cf3;27,1581,0e9",
'GE': "1,1831,e12;2,2320,c3d;3,981,2a0;4,780,2a0;5,2295,78d;6,1808,78d;7,757,78d;8,970,54c;9,543,54c;10,1916,03d;11,1315,03d;12,1810,295;13,1574,295;14,1729,4f9;15,1069,4f9;16,2173,fec;17,2187,383;18,1026,383;19,978,582;20,2104,369;21,2326,ab7;22,2654,f6a;23,2145,a20;24,1793,929;25,1713,929;26,1548,07c;27,1654,ea9;28,1624,ea9;29,1492,70a",
'IN': "2,495,b6f;3,1833,dc2;4,1802,dc2;5,1548,dc2;6,1871,e27;7,1739,3fa;8,630,7c5;9,1077,75b;10,1234,75b;11,1187,6a3;12,2076,f82;13,2284,9d0;14,2181,9d0;15,1908,9d0;16,1742,c77",
'LT': "2,2152,51c;3,1267,637;4,2140,0b7;5,1375,0b7;6,2993,e7b;7,2292,780;8,2358,1c0;9,60,795;10,2145,5a1;11,998,8f9;12,2131,aae;13,3222,f89;14,1494,8af;15,2303,ea5;16,1851,8a1;17,1226,827;18,943,796;19,2071,420;20,1383,46a;21,1293,ee3;22,64,205;23,1134,6b3;24,2126,81a;25,2427,81a;26,2421,81a;27,1576,81a;28,774,78c;29,2418,bac;30,359,106;31,1480,a04;32,700,823;33,269,059;34,1372,812;35,670,c1c;36,3543,7a1;37,502,93a;38,2494,da4;39,329,175;40,2786,b95;41,2357,b95;42,2321,548;43,3138,548",
'LE': "1,2201,71a;2,888,f9f;3,1089,310",
'PT': "2,1803,0cb;3,1536,252;4,1589,252;5,1800,fb1;6,1524,b40;7,1740,b40;8,1355,dee;9,2181,7e4;10,2502,c68;11,2200,d3a;12,2064,4f5;13,2135,274;14,2280,357;15,2291,69c;16,1946,0ae;17,1322,be2;18,2177,64a;19,1044,b09;20,1833,564;21,2047,8eb;22,1923,8eb;23,1805,8eb;24,1982,8eb;25,2223,8eb;26,2653,8eb;27,2546,e31;28,2320,cf4;29,1814,cf4;30,2083,cf4;31,1586,cf4;32,2266,3df;33,1425,0a1;34,1657,a79;35,287,08e;36,1523,845;37,1483,5c6;38,1825,d8f;39,1905,df4;40,2272,e58;41,1616,e58;42,1887,a5a;43,1445,a5a;44,1927,127;45,2139,d3f;46,1812,3e9;47,1788,d8a;48,2066,5fe;49,2024,349;50,1900,d77;51,1935,286;52,2238,a43;53,2076,890;54,1188,903;55,2539,903;56,2077,578;57,1991,b5b;58,2107,d6e;59,1681,cca;60,2179,bba;61,2053,bba;62,1747,f59;63,2184,177;64,2943,177;65,2216,8d6;66,3139,4d9;67,1827,20e;68,2895,896;69,1775,3a9;70,2352,901;71,2322,9ae;72,1772,b4b;73,2401,879;74,2370,fdf;75,1761,cd4;76,2047,cd4;77,2034,204;78,1974,35b;79,1567,854;80,2037,f05;81,2329,f05;82,2331,caa;83,1886,caa;84,1899,ed2;85,1458,7ee;86,1973,7ee;87,1661,add;88,2129,ffe;89,2275,ffe;90,1665,ffe;91,907,ffe;92,1674,ffe;93,1171,ffe;94,1093,ffe;95,2254,ffe;96,2158,56c;97,1864,56c",
'RL': "1,2091,712;2,2205,331;3,1573,c33;4,1677,503;5,1886,8c7;6,2020,acd;7,2352,206;8,965,a3f;9,1681,be9;10,1981,a75;11,1401,1c6;12,1086,843;13,2044,32c;14,3136,c21;15,1434,9af",
'RC': "1,1085,dc8;2,404,b41;3,2182,3cf;4,1249,bd8;5,1804,561;6,1475,561;7,1971,561",
}

# alinhamento aula -> assunto do edital: código, faixa de ordem, tópico [, caderno]
MAP = """
PT 2-4 147090be
PT 5-7 5c40fdbe
PT 8-15 f6e52158
PT 16-20 afb924d8
PT 21-27 d6b0c263
PT 28-39 afb924d8
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
PT 78 95b0e4a6 a41f9a2e
PT 79-81 ad6f5aef a41f9a2e
PT 82-84 50e032ad
PT 85-86 5c40fdbe
PT 87 147090be
PT 88-97 3dd001ac
RL 1-3 75f6d49d
RL 4-6 ca3f02f5 0b198f56
RL 7-8 b3dfad5c 167e0023
RL 9 cacea214
RL 10-11 26c1e4bb
RL 12-15 ffb00b5c
IN 2-5 e5afacfb
IN 6-8 58a9fd91
IN 9-10 02b379ba
IN 11 1ec870c1 ad3b241f
IN 12 22a77e07
IN 13-15 6beeaa81 ebcf1ab0
IN 16 c8375a29
FI 2-9 ddb5414b
FI 10-11 c2b83d6e
FI 12-15 cde9e89b
FI 16-17 d6b58f38
FI 18-19 7473b93b d6b58f38
FI 20-21 3b150077
FI 22-23 46ef0e5a 3b150077
FI 24-25 21b3e388
FI 26-27 f60c14e3
ET 1 dcfec3ea
ET 2 e2f49c70 dcfec3ea
ET 3 1113f91a dcfec3ea
ET 4 29a08948 dcfec3ea
ET 5 fc125e13 dcfec3ea
ET 6 29c5851e dcfec3ea
ET 7 85b83e69 dcfec3ea
ET 8 29a08948 dcfec3ea
ET 9-11 fd2c7135
ET 12 a853d70e
ET 13-14 a1bdf437
ET 15 31ed9724 dcfec3ea
ET 16-17 dfe653de
ET 18 3667442f
GE 1-4 0c3b90d3
GE 5-9 c94e0ec7
GE 10-11 d84651d5
GE 12-13 c94e0ec7
GE 14-15 d84651d5
GE 16 889cfa4b
GE 17-19 96c988e9
GE 20-21 c94e0ec7
GE 22-23 d84651d5
GE 24-26 889cfa4b
GE 27-28 96c988e9
GE 29 c53aa800
LT 2-10 fe4c5178 ctb1
LT 11-21 fe4c5178 ctb2
LT 22-33 fe4c5178 ctb3
LT 34-35 fe4c5178 ctb4
LT 36-39 fe4c5178 ctb5
LT 40-43 fe4c5178 ctb6
RC 1-2 a71e9c1a eb9c57ce
RC 3 4c107c1f eb9c57ce
RC 4 558dc047 eb9c57ce
RC 5-7 75d23bac eb9c57ce
DA 2-3 80854761 0e1fbdd8
DA 4-8 f35189f5 0e1fbdd8
DA 9 abb3e3da 4a90d6f4
DA 10 3b76d66c 4a90d6f4
DA 11-13 cda54af9 4a90d6f4
DA 14-24 5649b6bb aa00d61f
DA 25-27 4326c00c 2a843ca0
DA 28-29 7918ab33 2a843ca0
DA 30-34 34277d92
DA 35-39 c595f448
DA 40-41 3c9f6e4c ffd5f005
DA 42-46 596f5a18 c4e5a307
DC 2-3 c9475b37
DC 4-5 072acf73 c9475b37
DC 6 c9475b37
DC 7-13 be88e109
DC 14-15 fd06f82d
DC 16-24 9f1d9ed9
DC 25-27 8cc97544
DC 28 1a91021d
DC 29 657cc389 b9c564a2
DC 30-31 95ef216b b9c564a2
DC 32-34 2ea304fd
DP 2-5 4b3281cb
DP 6-7 636b9591 94d7c13c
DP 8-10 fcc9fa1e 94d7c13c
DP 11-15 de3698ad
DP 16-17 64a40341 de3698ad
DP 18-20 c04e87b0
DP 21-22 17e5e220 e05c57f3
DP 23-24 aedf7694
DP 25-28 c6b19d23
DP 29-40 0e587d2c
DP 41-48 62ae8d36
PP 2-3 240a67cf
PP 4 6ef0cd32
PP 5-7 195219bd 7ff0a370
PP 8-10 c07e7ec9
PP 11-17 195219bd 7ff0a370
PP 18-24 b4ab49a0 e5b27c1b
PP 25-26 d9bb06a2 1ac8f883
PP 27 9f1e03c8 1ac8f883
PP 28-34 cea2ee48 1ac8f883
PP 35 c213a910
LE 1-2 4189f2c2
LE 3 4ca4f6ed 0249230e
DH 2-7 b79ac797
DH 8-10 c6861b5a
DH 11-15 6fc15241
"""

# assunto -> caderno (quando não é o próprio assunto); subtópicos herdam do pai
CAD = {'95b0e4a6': 'a41f9a2e', 'ad6f5aef': 'a41f9a2e', '5a37559c': 'a41f9a2e', 'd6b0c263': 'd6b0c263',
       '1ec870c1': 'ad3b241f', '2c291ba1': 'ad3b241f', '816670b5': 'ad3b241f', '6beeaa81': 'ebcf1ab0', '961d1eda': 'ebcf1ab0',
       '7473b93b': 'd6b58f38', '46ef0e5a': '3b150077',
       'e2f49c70': 'dcfec3ea', '1113f91a': 'dcfec3ea', '29a08948': 'dcfec3ea', 'fc125e13': 'dcfec3ea', '29c5851e': 'dcfec3ea',
       '85b83e69': 'dcfec3ea', '31ed9724': 'dcfec3ea', '55e6842e': 'e1e797fe',
       'a71e9c1a': 'eb9c57ce', '4c107c1f': 'eb9c57ce', '558dc047': 'eb9c57ce', '75d23bac': 'eb9c57ce',
       '80854761': '0e1fbdd8', 'f35189f5': '0e1fbdd8', 'abb3e3da': '4a90d6f4', '3b76d66c': '4a90d6f4', 'cda54af9': '4a90d6f4',
       '5649b6bb': 'aa00d61f', '4326c00c': '2a843ca0', '7918ab33': '2a843ca0', '596f5a18': 'c4e5a307', '95c4c961': 'c4e5a307',
       '763c0f8d': 'c4e5a307', 'cdfd4637': '5a276f81', '7970822d': '4d552881',
       '072acf73': 'c9475b37', 'e258fcd3': 'be88e109', 'ceafe92a': 'be88e109', '218c002c': '9f1d9ed9',
       '19095e04': '1a91021d', '31574bbd': '1a91021d', 'f1d2ff90': '1a91021d', '657cc389': 'b9c564a2', '95ef216b': 'b9c564a2',
       '1201263b': 'b9c564a2', '636b9591': '94d7c13c', 'fcc9fa1e': '94d7c13c', '878f7bb2': 'de3698ad', '64a40341': 'de3698ad',
       'bafeb2bc': 'de3698ad', '17e5e220': 'e05c57f3', 'b2c123cd': 'e05c57f3',
       '195219bd': '7ff0a370', 'b4ab49a0': 'e5b27c1b', '954b9b8a': '240a67cf', 'd9bb06a2': '1ac8f883', '9f1e03c8': '1ac8f883',
       'f936ab69': '1ac8f883', 'cea2ee48': '1ac8f883', 'c6110682': '47470676', '4ca4f6ed': '0249230e', '7d3b1f49': 'b79ac797'}

# lei seca (a partir da Meta 08) por assunto
LAW = {
 'fc125e13': 'Constituição Federal, art. 37', '29c5851e': 'Lei nº 8.112/1990, art. 116', '85b83e69': 'Decreto nº 9.203/2017',
 'fd2c7135': 'Decreto nº 1.171/1994 (Código de Ética)', 'a853d70e': 'Decreto nº 6.029/2007', 'a1bdf437': 'Código de Conduta da Alta Administração Federal',
 'dfe653de': 'Lei nº 12.527/2011 e Decreto nº 7.724/2012', '3667442f': 'Lei nº 12.813/2013 e Decreto nº 7.203/2010',
 'fe4c5178': 'Código de Trânsito Brasileiro (Lei nº 9.503/1997), artigos do capítulo estudado', '5db4deaf': 'Lei nº 5.970/1973',
 'eb9c57ce': 'Resoluções do CONTRAN do edital', 'a71e9c1a': 'Resolução CONTRAN nº 525/2015', '4c107c1f': 'Resolução CONTRAN nº 798/2020',
 '558dc047': 'Resolução CONTRAN nº 508/2014', '75d23bac': 'Resolução CONTRAN nº 810/2020',
 'c4e5a307': 'Lei nº 8.112/1990', '95c4c961': 'Lei nº 8.112/1990', '763c0f8d': 'Constituição Federal, arts. 37 a 41', '4d552881': 'Lei nº 9.654/1998',
 'cdfd4637': 'Lei nº 12.855/2013', '5a276f81': 'Lei nº 13.712/2018', '7970822d': 'Decreto nº 8.282/2014', 'f35189f5': 'Constituição Federal, art. 37',
 'ffd5f005': 'Lei nº 14.133/2021', '3c9f6e4c': 'Lei nº 14.133/2021, arts. 5º a 11', '34277d92': 'Constituição Federal, art. 37, § 6º',
 'c9475b37': 'Constituição Federal, art. 60, e ADCT, art. 3º', '072acf73': 'Constituição Federal, art. 60', 'be88e109': 'Constituição Federal, art. 5º',
 'fd06f82d': 'Constituição Federal, art. 5º, incisos LXVIII a LXXIII', '9f1d9ed9': 'Constituição Federal, arts. 6º a 16',
 '8cc97544': 'Constituição Federal, arts. 20 a 24', '1a91021d': 'Constituição Federal, arts. 76 a 91', '657cc389': 'Constituição Federal, art. 142',
 '95ef216b': 'Constituição Federal, art. 144', '0249230e': 'Constituição Federal, art. 144, § 2º, e Decreto nº 1.655/1995',
 '2ea304fd': 'Constituição Federal, arts. 193 a 232',
 '4b3281cb': 'Código Penal, arts. 1º a 3º', '636b9591': 'Código Penal, arts. 2º a 4º', 'fcc9fa1e': 'Código Penal, arts. 5º a 7º',
 'de3698ad': 'Código Penal, arts. 13 a 19', '64a40341': 'Código Penal, arts. 14 a 17', 'c04e87b0': 'Código Penal, arts. 20 e 21',
 '17e5e220': 'Código Penal, arts. 23 a 25', 'aedf7694': 'Código Penal, arts. 26 a 28', 'c6b19d23': 'Código Penal, arts. 107 a 120',
 '0e587d2c': 'Código Penal, arts. 121 a 154-B', '62ae8d36': 'Código Penal, arts. 155 a 183', '5b898f3f': 'Código Penal, arts. 213 a 234-C',
 '4e651fb5': 'Código Penal, arts. 250 a 285', '4dbf1393': 'Código Penal, arts. 289 a 311-A', '8b3a6a5f': 'Código Penal, arts. 312 a 359',
 'b4ab49a0': 'Código de Processo Penal, arts. 24 a 62', '240a67cf': 'Lei nº 9.099/1995, arts. 60 a 92', '6ef0cd32': 'Lei nº 12.037/2009',
 'c6110682': 'Código de Processo Penal, arts. 6º e 13', '195219bd': 'Código de Processo Penal, arts. 282 a 300 e 311 a 318, e Lei nº 7.960/1989',
 'c07e7ec9': 'Código de Processo Penal, arts. 301 a 310', 'd9bb06a2': 'Código de Processo Penal, arts. 155 a 157', '9f1e03c8': 'Código de Processo Penal, arts. 156 e 157',
 'cea2ee48': 'Código de Processo Penal, arts. 158 a 239', 'c213a910': 'Código de Processo Penal, arts. 240 a 250', '47470676': 'Código de Processo Penal, arts. 6º e 158-A a 158-F',
 '4189f2c2': 'Lei nº 5.553/1968 e Lei nº 12.037/2009', 'e2259751': 'Estatuto da Criança e do Adolescente (Lei nº 8.069/1990)', '9c4004a9': 'Lei nº 8.072/1990',
 '4ca4f6ed': 'Decreto nº 1.655/1995', '4eff6081': 'Lei nº 9.099/1995', '00801d21': 'Lei nº 9.455/1997', 'e6ce7011': 'Lei nº 9.605/1998, Capítulos III e V',
 'c9a62324': 'Lei nº 10.826/2003, Capítulo IV', 'fe529c3e': 'Lei nº 11.343/2006', '58d5e7b2': 'Lei nº 12.850/2013', 'f846156b': 'Lei nº 13.675/2018',
 '98836223': 'Lei nº 13.869/2019',
 'b79ac797': 'Constituição Federal, art. 4º e art. 5º, §§ 2º e 3º', 'c6861b5a': 'Declaração Universal dos Direitos Humanos',
 '6fc15241': 'Convenção Americana sobre Direitos Humanos (Decreto nº 678/1992)'}

# leitura (apostila em PDF) por disciplina -> trilha da apostila; e por assunto -> "Nosso PDF" (ordem)
APOST = {1: 'PT', 3: 'IN', 4: 'FI', 8: 'LT', 9: 'DA', 10: 'DC', 11: 'DP', 12: 'PP', 14: 'DH'}
NOSSO = {'9c4004a9': 1, '00801d21': 2, 'fe529c3e': 3, '98836223': 4, 'e6ce7011': 5, 'c9a62324': 6, '58d5e7b2': 7, 'e2259751': 8,
         '6ef0cd32': 9, '4189f2c2': 12, '4eff6081': 10, '240a67cf': 10, '4ca4f6ed': 11, '0249230e': 11, 'f846156b': 13, 'fe4c5178': 14,
         '558dc047': 16, '4c107c1f': 19, '75d23bac': 21, 'eb9c57ce': 29}
# assuntos sem aula que não entram (cobertos de outra forma)
SKIP = {'d98d3745'}
LANG = '222ae27a'

# cadernos criados (chaves)
NBK = """de642ddb 147090be 50e032ad f6e52158 1cb2bbca d6b0c263 afb924d8 defdb937 9570980a 6c361bbf 1481a704 ecb689bd e40ab319 5c40fdbe a41f9a2e 3dd001ac
26c1e4bb 00ee6e7d 167e0023 cacea214 0b198f56 ffb00b5c 87350e23 75f6d49d f059c50e c8e823d5 e5afacfb 02b379ba c8375a29 ebcf1ab0 22a77e07 58a9fd91 ad3b241f
ddb5414b c2b83d6e cde9e89b d6b58f38 3b150077 21b3e388 f60c14e3 dcfec3ea fd2c7135 a853d70e a1bdf437 dfe653de 3667442f e1e797fe c53aa800 0c3b90d3 c94e0ec7
96c988e9 d84651d5 889cfa4b 464b3300 bc2e5f24 222ae27a d98d3745 ctb1 ctb2 ctb3 ctb4 ctb5 ctb6 5db4deaf eb9c57ce 4a90d6f4 aa00d61f c4e5a307 4d552881 2a843ca0
ffd5f005 c595f448 34277d92 0e1fbdd8 c9475b37 be88e109 9f1d9ed9 fd06f82d 1a91021d 8cc97544 b9c564a2 0249230e 2ea304fd 4b3281cb 94d7c13c de3698ad c04e87b0
c6b19d23 e05c57f3 aedf7694 0e587d2c 62ae8d36 5b898f3f 4e651fb5 4dbf1393 8b3a6a5f e5b27c1b 240a67cf 1ac8f883 c213a910 47470676 7ff0a370 c07e7ec9 6ef0cd32
e2259751 9c4004a9 4eff6081 00801d21 e6ce7011 c9a62324 fe529c3e 58d5e7b2 f846156b 98836223 4189f2c2 b79ac797 c6861b5a 6fc15241""".split()
CAD.update({'5a276f81': '4d552881', 'cdfd4637': '4d552881', '6d1c75a1': '222ae27a', '580638f0': '222ae27a'})
