set -e
U=/mnt/user-data/uploads
python3 cols.py "$U/PMPE/02_PROVA TIPO 1 - SOLDADO DA POLICIA MILITAR.pdf" c_pmpe.txt & python3 cols.py "$U/GMF/Guarda Municipal - Tipo A.pdf" c_gmf.txt & python3 cols.py "$U/PMCE/prova pmce.pdf" c_pmce.txt & python3 cols.py "$U/CFO - PMCE/2º TENENTE QOPM DA POLÍCIA MILITAR - TIPO B.pdf" c_cfo.txt & python3 cols.py "$U/PPCE/PROVA - POLICIAL PENAL - TIPO B.pdf" c_ppce.txt & wait
python3 parse.py pmpe gmf ppce cfo pmce | grep -v seções
python3 parse_prf.py $U/PRF/578_PRF_001_01.PDF q_prf.json 9; python3 parse_prf.py $U/PRF/578_PRF_ING_01.PDF q_prfi.json 1; python3 parse_prf.py $U/PRF/578_PRF_ESP_02.PDF q_prfe.json 1
python3 assemble.py pmpe gmf ppce cfo pmce prf prfi prfe
python3 overrides.py
