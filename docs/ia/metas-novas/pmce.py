# SGA - PMCE (soldado): dados para o planejador de metas novas
CID = '6305aafa-3263-46c9-b1b7-1001c01b5994'
VADE = 'Vade Mecum PMCE'
RLM = 2
DISC = None

SHORT = {1: 'Português', 2: 'RLM', 3: 'Atualidades e Hist. do Ceará', 4: 'Adm. Pública e Ética', 5: 'Dir. Constitucional',
         6: 'Direitos Humanos', 7: 'Dir. Penal Militar', 8: 'Proc. Penal', 9: 'Criminologia', 10: 'Segurança Pública'}

TR = {'PT': 'Língua Portuguesa - Prof. Volney Ribeiro', 'RL': 'Raciocínio Lógico Matemático - Prof. Paulo Felipe',
      'DC': 'Direito Constitucional - Profª. Dayana Sales', 'DPM': 'Direito Penal Militar - Prof. Erick Lima',
      'HCE': 'História do Ceará - Prof. Caio Victor', 'AP': 'Administração Pública - Prof. Herick Paiva',
      'AT': 'Atualidades - Prof. Guilherme Lemos', 'CR': 'Criminologia - Prof. Erick Lima',
      'DH': 'Direitos Humanos - Prof. Rodrigo Lopes', 'ET': 'Ética - Prof. Rodrigo Lopes',
      'LX': 'Legislação Extravagante', 'PP': 'Processo Penal - Prof. Max Lima', 'SP': 'Segurança Pública - Prof. Damasceno'}

V = {
'AP': "2,1919,61f;3,2140,61f;4,1975,ca7;5,1954,ca7;6,1984,ca7;7,1911,ca7;8,2000,ca7;9,1919,ca7;10,1876,ca7;11,1900,9c9;12,2238,9c9;13,1677,9c9;14,2015,9c9;15,2081,9c9;16,2106,d5c;17,1908,d5c;18,1452,d5c;19,1463,028;20,1649,3d4;21,1879,b23;22,2909,ca8",
'AT': "4,1324,f39;5,1119,f39;6,1960,53f;7,2403,53f;8,1826,034;9,1760,f8b;10,2302,37e;11,2070,6f5;12,1343,686;13,1388,a42;14,2517,484;15,2046,adf;16,1684,307;17,1493,27e;18,1893,939;19,1013,e8e;20,1897,254;21,940,e1c;22,1843,70d;23,1041,e13;24,964,9f3;25,2015,89e;26,1621,89e;27,1801,a90;28,1557,a90;29,1813,a90;30,2146,a07;31,1644,a84;32,1434,dd7;33,1454,54b",
'CR': "3,2265,b0d;4,1257,f8b;5,1302,c70;6,2088,9d7;7,1530,9d7;8,1735,9d7;9,1445,653;10,861,85e;11,3332,daf;12,2644,430;13,1374,daf;14,2485,051;15,771,051;16,1605,c0e;17,1804,c8b;18,1237,c8b;19,2057,634;20,1711,634;21,977,634;22,1409,634;23,611,852",
'DC': "2,1967,8eb;3,1963,8eb;4,1314,8eb;5,1939,8eb;6,1812,8eb;7,1421,8eb;8,980,8eb;9,1491,8b5;10,1171,8b5;11,1855,eff;12,1600,eff;13,1378,eff;14,1347,eff;15,1027,955;16,2159,955;17,2542,13a;18,1170,13a;19,1530,13a;20,1128,13a;21,1039,13a;22,1478,13a;23,1808,6a4;24,1252,6a4;25,1545,6a4;26,995,303;27,1037,303;28,1742,5f2;29,1180,5f2;30,1418,5f2;31,1803,5f2;32,1302,a30;33,1073,a30;34,1147,a30;35,1337,8e6;36,1023,fd4;37,1381,fd4",
'DPM': "4,1942,654;5,2621,c35;6,2065,c35;7,2137,d3f;8,1992,34a;9,1306,34a;10,735,972;11,2638,3a6;12,957,984;13,923,176;14,1737,9c6;15,1314,a02;16,2062,636;17,2317,4ba;18,2360,7d5;19,2009,4f3;20,1496,4db;21,1540,4db;22,1181,4db;23,1791,839;24,2358,96e;25,2247,b95;26,2065,2b4;27,1032,2b4;28,1384,2b4;29,1978,d75;30,2109,cd1;31,1222,bcb;32,1660,1fd;33,2259,391;34,1905,b7f;35,2301,dee;36,1536,c91;37,1074,467;38,1955,f9d;39,921,a6d;40,1688,1e4;41,2685,1e4;42,2244,1e4;43,1683,c90;44,2188,c90;45,1283,c90;46,911,fc3;47,1682,bed;48,2799,9b0;49,1650,8d0;50,2466,8d0;51,1409,8d0;52,1472,8d0;53,2734,ad7;54,2755,396",
'DH': "2,1685,405;3,1935,0a9;4,1554,edc;5,2023,168;6,1585,815;7,1751,ff7;8,1805,23e;9,875,384;10,1433,3cc;11,936,aad;12,1660,a1a;13,2045,90c;14,823,cb5;15,457,3f0",
'ET': "2,1944,19f;3,919,19f",
'HCE': "3,508,913;4,1786,270;5,1772,270;6,1622,627;7,1851,cb4;8,1720,37a;9,1553,2e7;10,1820,719;11,1746,1b5;12,1886,1b5;13,1429,be1;14,1997,ef7;15,1643,7b7;16,1529,c28;17,1970,1d7;18,1787,82b;19,1816,bb7;20,1792,d13;21,1845,e85;22,1822,61c;23,1651,96b",
'LX': "2,1729,23e;3,2598,23e;4,702,b5e;5,2183,c13;6,2047,c13;7,2046,c13;8,1893,b57;9,1753,b57;10,1372,b57;11,1999,e6a;12,2327,98a;13,2334,5cc;14,1316,8ac;15,2931,b16",
'PT': "2,1803,bbf;3,2610,730;4,1800,030;5,2333,48a;6,2072,4d8;7,1980,31c;8,1355,31c;9,1688,589;10,2181,b48;11,2097,0fc;12,2502,9e8;13,1954,ae0;14,2064,4da;15,2121,06b;16,2001,78c;17,1752,8a8;18,1962,c10;19,2280,739;20,1736,f72;21,1946,27b;22,1322,035;23,2177,308;24,1044,5ae;25,2047,c90;26,2351,721;27,1923,c90;28,1805,c90;29,1982,c90;30,2223,c90;31,2653,c90;32,2784,b50;33,2320,1af;34,1814,1af;35,2083,1af;36,1586,1af;37,2160,e5d;38,1425,78f;39,1657,058;40,287,bbb;41,1483,64f;42,1825,707;43,1994,814;44,2272,c0a;45,1616,c0a;46,1887,c9b;47,1445,c9b;48,1927,4fc;49,2296,f34;50,1812,c1d;51,2110,da1;52,1788,a5e;53,1752,d98;54,2024,b81;55,1900,632;56,1935,e39;57,2238,a1c;58,2295,5ff;59,1188,47c;60,2539,47c;61,2028,365;62,1991,1c1;63,2107,1c1;64,2286,f0a;65,2179,0a3;66,2053,0a3;67,2155,a64;68,2184,866;69,2943,866;70,2076,cbd;71,3139,f2a;72,1835,45d;73,2895,28a;74,2073,9b5;75,2352,9b3;76,2508,e2c;77,1772,aa7;78,2581,bdb;79,2370,3da;80,2034,d08;81,2355,0c6;82,1567,d2a;83,2127,ef8;84,638,13a;85,1868,85c;86,744,819;87,1974,c84;88,2057,295;89,2331,b24;90,1886,b24;91,2094,c74;92,1458,ffe;93,1973,ffe;94,2318,bf1;95,1661,bfd;96,2259,c56",
'PP': "2,1366,568;3,1476,568;4,1018,568;5,1643,568;6,2037,2c0;7,1529,496;8,1229,496;9,2012,496;10,1625,496;11,1323,fe8;12,1976,80d;13,2203,226;14,2188,a00;15,2055,a00;16,951,a00;17,832,a00;18,1041,a00;19,855,a00;20,689,a00;21,1290,d56;22,1819,d56;23,1500,a6d;24,1091,a6d;25,2007,a6d;26,2189,a6d;27,263,a6d;28,1204,a6d;29,1714,a6d;30,1894,a6d;31,2025,a6d;32,1138,a6d;33,1855,9bc;34,1277,9bc;35,1612,9bc;36,1125,9bc;37,1793,9bc;38,2170,9bc;39,2442,f44;40,547,728;41,1078,fe7;42,874,fe7;43,2571,d26;44,3110,6d8;45,1617,19a;46,1026,a1f;47,1171,a1f",
'RL': "2,1581,bd2;3,2524,7dd;4,2151,263;5,2011,273;6,1617,313;7,1671,c74;8,1716,d5f;9,2975,cca;10,1773,fd3;11,1303,fd3;12,1277,b8c;13,1757,db0;14,1571,907;15,2062,5e3;16,1940,8cd;17,2364,50d;18,1961,50d;19,1173,52a;20,2620,d05",
'SP': "2,476,2c0;3,1575,bdc;4,1018,bdc;5,1393,f8a;6,1352,26a;7,1221,26a;8,1340,453;9,1074,453;10,954,6bc",
}

MAP = """
PT 2-3 014a1e3c compr
PT 4-5 f6caff14 signif
PT 6-15 7c106169 ortog
PT 16-18 b5b1111f estrut
PT 19-20 3522d116 acent
PT 21-24 fb998d42 classes
PT 25 17a60650 verbo
PT 26 fb998d42 classes
PT 27-32 17a60650 verbo
PT 33-37 72108187 pron
PT 38-43 fb998d42 classes
PT 44-51 e9a6cfe4 sint
PT 52-53 fca4140f sint
PT 54-58 1cde2405 sint
PT 59-61 e8e899d8 pont
PT 62-64 f44c3fc6 reg
PT 65-67 f44c3fc6 crase
PT 68-72 0f1e9d02 conc
PT 73-74 71b0e767 pron
PT 75-78 fb998d42 queSe
PT 79-81 7b01dc68 coesao
PT 82-83 1272afb1 reesc
PT 84-96 014a1e3c interp2
RL 2-5 765d7f63 logprop
RL 6-8 e2d0fe0b relarb
RL 9 c519ff5d seq
RL 10-13 9ca8c2e0 conj
RL 14 bdb82149 probl
RL 15-19 dc916af3 geom
RL 20 da9beb87 probl
AT 4-24 1cc3f185 atual
AT 25-26 bebd5e18 atamb
AT 27-33 1cc3f185 atual
HCE 3-6 6709d7f6 hcecol
HCE 7-9 0466662a hcecol
HCE 10-13 758e0bec hcecol
HCE 14-16 a66ceccd hcecol
HCE 17 dbadb9ee hcecol
HCE 18-23 7131ab3b hcecol
AP 2-3 cd11236b procorg
AP 4-10 ae031b66 planest
AP 11-15 31abc295 orgform
AP 16-21 91d25537 relhum
AP 22 947efa70 gproc
ET 2-3 8a40f429 etica
DC 2-10 b93cf47a dirind
DC 11-14 b6861a20 dirsoc
DC 15-16 7fbad935 dirpol
DC 17-22 00ab3c09 orgest
DC 23-25 18a1a112 legis
DC 26-27 43f73de2 exec
DC 28-31 a5f9e5aa judic
DC 32-34 b2e272b6 fesj
DC 35 ab90e23a segpub
DC 36-37 453e47dd segpub
DH 2-3 caaa4c7f dhconc
DH 4 427f3e29 dhcf
DH 5-6 282409b3 pndh
DH 7 246ac1d6 racis
DH 8-9 05992bbb racis
DH 10-11 678a3663 dhgr
DH 12-13 3cf7230d dhgr
DH 14-15 0523f463 dhgr
LX 2-4 05992bbb racis
LX 5-7 3b89ec1a pcd
LX 8-10 ff4ec295 desarm
LX 11-14 01fa8b8c penha
LX 15 8993480e tort
DPM 4-7 7c493d3d dpmapl
DPM 8-9 4b057e21 dpmpaz
DPM 10 0c5541f8 dpmguer
DPM 11-12 7c493d3d dpmapl
DPM 13-25 51843df0 dpmcrime
DPM 26-29 822f49c1 dpmconc
DPM 30-38 ed79402f dpmpena
DPM 39 32db5b4b dpmext
DPM 40-42 64b12351 dpmext
DPM 43-48 12b6d8cb dpmesp
DPM 49-52 c97280e8 dpmesp
DPM 53 e937e3f8 dpmesp
DPM 54 24b4ffbe dpmesp
PP 2-10 ff77361e ppint
PP 11-12 3844605f ppapl
PP 13-20 79fa86f5 inq
PP 21-32 28eb824a acao
PP 33-40 0cd03ac4 prisao
PP 41-42 a9e6562b prisao
PP 43-44 0cd03ac4 prisao
PP 45 b666cd5a resp
PP 46-47 a5122ec7 hc
CR 3-15 98b1bd0e crim
CR 16 d5a69bbe crim
CR 17-18 3c2bff16 crim
CR 19-22 d1bb6408 crim
CR 23 5cb72107 crim
SP 2-4 857c202b segp
SP 5 15c68e6c segp
SP 6-7 e002dc49 segp
SP 8-9 c30724b7 segp
SP 10 40684c8a segp
"""

# assunto -> caderno (assuntos sem aula e subtópicos)
CAD = {'7ab1c4f9': 'coesao', '4086d38e': 'coesao', 'dfbf7e2c': 'coesao', '54d07400': 'coesao', 'cdad4977': 'verbo', '2bcb9f60': 'classes',
       'da90c296': 'verbo', '50eae102': 'pron', '7edae5d2': 'pron', 'c5974ce7': 'conc', '60cdb35a': 'conc', '0a2c3882': 'reg', '96611b93': 'reg',
       '51cc63ab': 'atcien', '7ed0a80e': 'orgadm', '3433b6bb': 'princadm', '43edaa88': 'delega', 'b0b75d89': 'contr', 'ba88f946': 'improb',
       '04c811d8': 'dirind', '98f3f8a2': 'penha', '359b32a8': 'dhgr', '362cae70': 'dhgr', '820b9c5a': 'dhgr', '780bdad7': 'dhgr', 'fdb9555d': 'dhgr',
       '54b2316b': 'dhgr', 'f4363f5c': 'dpmpena', '70a20125': 'ppint', '592bd79a': 'crim', '0fda0365': 'crim', 'e7fc45e7': 'segp', '76abbd47': 'segp'}

LAW = {
 'b93cf47a': 'Constituição Federal, art. 5º', 'b6861a20': 'Constituição Federal, arts. 6º a 11', '7fbad935': 'Constituição Federal, arts. 14 a 16',
 '00ab3c09': 'Constituição Federal, arts. 18 a 33', '18a1a112': 'Constituição Federal, arts. 44 a 58', '43f73de2': 'Constituição Federal, arts. 76 a 88',
 'a5f9e5aa': 'Constituição Federal, arts. 92 a 103-B', 'b2e272b6': 'Constituição Federal, arts. 127 a 135', 'ab90e23a': 'Constituição Federal, arts. 142 e 143',
 '453e47dd': 'Constituição Federal, art. 144', '3433b6bb': 'Constituição Federal, art. 37', 'ba88f946': 'Lei nº 8.429/1992 (Improbidade Administrativa)',
 '7c493d3d': 'Código Penal Militar, arts. 1º a 28', '4b057e21': 'Código Penal Militar, art. 9º', '0c5541f8': 'Código Penal Militar, art. 10',
 '51843df0': 'Código Penal Militar, arts. 29 a 47', 'f7e9f075': 'Código Penal Militar, arts. 48 a 52', '822f49c1': 'Código Penal Militar, arts. 53 e 54',
 'ed79402f': 'Código Penal Militar, arts. 55 a 120', '32db5b4b': 'Código Penal Militar, arts. 121 e 122', '64b12351': 'Código Penal Militar, arts. 123 a 135',
 '12b6d8cb': 'Código Penal Militar, arts. 149 a 204', 'c97280e8': 'Código Penal Militar, arts. 205 a 239', 'e937e3f8': 'Código Penal Militar, arts. 240 a 267',
 '24b4ffbe': 'Código Penal Militar, arts. 298 a 339',
 '3844605f': 'Código de Processo Penal, arts. 1º a 3º', '79fa86f5': 'Código de Processo Penal, arts. 4º a 23', '28eb824a': 'Código de Processo Penal, arts. 24 a 62',
 '0cd03ac4': 'Código de Processo Penal, arts. 282 a 350', 'a9e6562b': 'Lei nº 7.960/1989', 'b666cd5a': 'Código de Processo Penal, arts. 513 a 518',
 'a5122ec7': 'Código de Processo Penal, arts. 647 a 667',
 '01fa8b8c': 'Lei nº 11.340/2006 (Maria da Penha)', '05992bbb': 'Lei nº 12.288/2010 (Estatuto da Igualdade Racial)',
 '3b89ec1a': 'Lei nº 13.146/2015 (Estatuto da Pessoa com Deficiência)', '8993480e': 'Lei nº 9.455/1997 (Lei de Tortura)',
 'ff4ec295': 'Lei nº 10.826/2003 (Estatuto do Desarmamento)'}

APOST = {1: 'PT', 2: 'RL', 3: 'HCE', 5: 'DC', 6: 'DH', 7: 'DPM', 8: 'PP', 9: 'CR', 10: 'SP'}
NOSSO = {}
SKIP = set()

NBK = """compr signif ortog estrut acent logprop relarb seq conj dirind dirsoc dirpol dpmapl dpmpaz dpmguer hcecol procorg planest
classes verbo pron sint pont reg crase conc queSe coesao reesc interp2 probl geom atual atamb atcien orgform relhum gproc etica orgadm princadm
delega contr improb orgest legis exec judic fesj segpub dhconc dhcf pndh racis dhgr pcd desarm penha tort dpmcrime dpmconc dpmpena dpmext dpmesp
ppint ppapl inq acao prisao resp hc crim segp""".split()
APOST_T = {'8a40f429': 'ET'}
